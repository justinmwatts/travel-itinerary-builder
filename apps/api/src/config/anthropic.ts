import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

// Model configuration per design.md section 8. One Sonnet model, thinking off,
// low effort, to keep cost down. Defined as global constants so every chat call
// reads the same values.
export const CLAUDE_MODEL = "claude-sonnet-4-6";
export const CLAUDE_EFFORT = "low" as const; // output_config.effort, the floor for Sonnet 4.6
export const CLAUDE_THINKING_ENABLED = false; // false omits the thinking block, so no extended thinking
export const CLAUDE_MAX_TOKENS = 1500; // per-turn output cap, tuned to itinerary size

// Single client for the API process. The key is read from the environment and
// never reaches the browser (design.md section 11).
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Server-owned system prompt. The client cannot tamper with it. It defines the
// assistant's role, the tool, the destination fields, and the rule that creator
// notes are user-authored and must never be invented by the model.
export const SYSTEM_PROMPT = `You are a thoughtful travel planner who helps a single user build one multi-destination itinerary through conversation.

How to behave:
- Hold a natural, concise conversation. Ask a clarifying question when the request is genuinely ambiguous, otherwise propose a concrete plan.
- Whenever the set of destinations or the title changes, call the set_itinerary tool with the COMPLETE itinerary in visit order, not just the changed stops. The tool is the only way the structured itinerary updates.
- When a turn is purely conversational and nothing about the itinerary changes, reply in prose and do not call the tool.
- Keep each destination's description to one or two vivid, practical sentences.
- Order destinations as a sensible travel route, numbered from zero.

Hard rules:
- Never write or invent a creator note. Notes are the user's own words, owned by the user, and are not part of the tool input.
- Never include images, prices, or booking details in the structured itinerary.
- Only include real, plausible places. If the user names a place that does not exist, treat it as creative input and still produce a coherent stop.`;

// The set_itinerary tool. Input is a title plus an AI-owned destinations array
// (name, country, description, order). It carries no note or image fields, since
// those belong to the creator and the image service (design.md section 8).
export const SET_ITINERARY_TOOL: Anthropic.Tool = {
  name: "set_itinerary",
  description:
    "Set or replace the full travel itinerary. Call this whenever the destinations or the title change. Always pass the complete list of destinations in visit order, not a partial update.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "A short, evocative title for the trip, for example 'Iberia in 10 Days'.",
      },
      destinations: {
        type: "array",
        description: "Every destination in the trip, in visit order.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "City or place name." },
            country: { type: "string", description: "Country the place is in." },
            description: {
              type: "string",
              description: "One or two sentences on what makes the stop worth it.",
            },
            order: { type: "integer", description: "Zero-based position in the trip." },
          },
          required: ["name", "country", "description", "order"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "destinations"],
    additionalProperties: false,
  },
};
