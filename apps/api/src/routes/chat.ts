import { Router, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { chatRequestSchema, setItineraryToolInputSchema, type SseErrorCode } from "@travel/shared";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import {
  CLAUDE_EFFORT,
  CLAUDE_MAX_TOKENS,
  CLAUDE_MODEL,
  CLAUDE_THINKING_ENABLED,
  SET_ITINERARY_TOOL,
  anthropic,
} from "../config/anthropic";
import { asyncHandler } from "../lib/async-handler";
import { forbidden, notFound, unauthorized } from "../lib/http-error";
import { requireAuth } from "../middleware/auth";
import { toDestinationDTO } from "../services/serializers";
import {
  buildAnthropicMessages,
  buildSystemPrompt,
  makeChatMessage,
  parseChatMessages,
  persistTurn,
  reconcileDestinations,
  resolveCovers,
} from "../services/chat";

export const chatRouter = Router();

function sendEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Map an upstream failure to an SSE error code the client understands.
function mapStreamError(err: unknown): { message: string; code: SseErrorCode } {
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "The assistant is busy. Try again in a moment.", code: "rate_limited" };
  }
  if (err instanceof Anthropic.APIError && err.status === 529) {
    return { message: "The assistant is overloaded. Try again shortly.", code: "overloaded" };
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { message: "The assistant timed out. Try again.", code: "timeout" };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { message: "The AI service is misconfigured.", code: "internal" };
  }
  return { message: "Something went wrong reaching the assistant.", code: "internal" };
}

// POST /api/chat (SSE). Body: itineraryId + the new user turn only. The server
// loads prior history from the itinerary, so a client cannot forge the
// transcript. Auth, ownership and validation run before the stream starts, so
// those failures surface as normal JSON; once streaming, errors are SSE events.
chatRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();

    const { itineraryId, userMessage } = chatRequestSchema.parse(req.body);

    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: { destinations: { orderBy: { order: "asc" } } },
    });
    if (!itinerary) throw notFound("Itinerary not found");
    if (itinerary.ownerId !== userId) throw forbidden();

    // Switch to SSE. From here on, surface failures as SSE error events.
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    try {
      if (!env.ANTHROPIC_API_KEY) {
        sendEvent(res, "error", {
          message: "The AI service is not configured.",
          code: "internal" satisfies SseErrorCode,
        });
        return;
      }

      const history = parseChatMessages(itinerary.chatMessages);
      const system = buildSystemPrompt(itinerary.title, itinerary.destinations);
      const messages = buildAnthropicMessages(history, userMessage);

      // The model, tools and messages stay fully type-checked here.
      const baseParams: Anthropic.MessageStreamParams = {
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system,
        tools: [SET_ITINERARY_TOOL],
        messages,
      };
      // effort (output_config) and adaptive thinking are GA on the standard
      // endpoint, but @anthropic-ai/sdk 0.71 only types them under the beta
      // namespace. Merge them as GA extras so we keep the standard endpoint (no
      // beta header). Thinking off = omit the block entirely.
      const gaExtras: Record<string, unknown> = { output_config: { effort: CLAUDE_EFFORT } };
      if (CLAUDE_THINKING_ENABLED) {
        gaExtras.thinking = { type: "adaptive" };
      }
      const stream = anthropic.messages.stream({
        ...baseParams,
        ...gaExtras,
      } as Anthropic.MessageStreamParams);
      stream.on("text", (delta) => sendEvent(res, "token", { delta }));

      const final = await stream.finalMessage();

      const assistantText = final.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const toolBlock = final.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === "tool_use" && b.name === SET_ITINERARY_TOOL.name,
      );

      let newTitle: string | undefined;

      if (toolBlock) {
        const parsed = setItineraryToolInputSchema.safeParse(toolBlock.input);
        if (parsed.success) {
          // Reconcile preserves notes and covers, then emit the merged set. The
          // itinerary renders immediately with existing covers; new or changed
          // stops resolve afterward and arrive via the images event.
          const { destinations, resolveImageIds } = await reconcileDestinations(
            itineraryId,
            parsed.data.destinations,
          );
          newTitle = parsed.data.title;
          sendEvent(res, "itinerary", {
            title: newTitle,
            destinations: destinations.map(toDestinationDTO),
          });

          if (resolveImageIds.length > 0) {
            const updates = await resolveCovers(destinations, resolveImageIds);
            if (updates.length > 0) {
              sendEvent(res, "images", { updates });
            }
          }
        }
        // On validation failure we keep the prose and drop the structured update
        // rather than corrupting the saved draft.
      }

      const userMsg = makeChatMessage("user", userMessage);
      const assistantMsg = makeChatMessage("assistant", assistantText);
      await persistTurn(itineraryId, history, userMsg, assistantMsg, newTitle);

      sendEvent(res, "done", { messageId: assistantMsg.id });
    } catch (err) {
      sendEvent(res, "error", mapStreamError(err));
    } finally {
      res.end();
    }
  }),
);
