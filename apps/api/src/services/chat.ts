// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { randomUUID } from "node:crypto";
import type { Destination as PrismaDestination } from "@prisma/client";
import {
  buildSearchText,
  normalizeName,
  type AiDestination,
  type ChatMessage,
  type SseImageUpdate,
} from "@travel/shared";
import { prisma } from "../lib/prisma";
import { SYSTEM_PROMPT } from "../config/anthropic";
import { resolvePexelsImage } from "./pexels";

// Cap the transcript sent upstream. Older turns would be summarized for full
// cost control (design.md section 8); that summarization is deferred to a later
// polish pass, so for now we send the most recent turns plus a state summary.
const MAX_HISTORY_MESSAGES = 30;

export interface AnthropicTextMessage {
  role: "user" | "assistant";
  content: string;
}

// A compact current-state summary appended to the system prompt so the model can
// refine an existing itinerary it cannot otherwise see (the itinerary lives in
// the DB, not the prose transcript). Notes are included so the model knows they
// exist and never tries to invent or restate them.
export function buildSystemPrompt(
  title: string,
  destinations: Pick<PrismaDestination, "name" | "country" | "note">[],
): string {
  if (destinations.length === 0) {
    return `${SYSTEM_PROMPT}\n\nThe itinerary is currently empty.`;
  }
  const lines = destinations.map((d, i) => {
    const note = d.note ? ` [user note present, do not repeat or invent]` : "";
    return `${i + 1}. ${d.name}, ${d.country}${note}`;
  });
  return `${SYSTEM_PROMPT}\n\nCurrent title: ${title || "(untitled)"}\nCurrent destinations:\n${lines.join("\n")}`;
}

// Build the Anthropic messages array from stored history plus the new turn. The
// transcript must start with a user message and is capped to recent turns.
export function buildAnthropicMessages(
  history: ChatMessage[],
  userMessage: string,
): AnthropicTextMessage[] {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  while (recent.length > 0 && recent[0]?.role !== "user") {
    recent.shift();
  }
  const messages: AnthropicTextMessage[] = recent.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage });
  return messages;
}

// Parse the stored chatMessages JSON column. Tolerant of an empty or malformed
// column: a bad transcript should not break a turn.
export function parseChatMessages(raw: string): ChatMessage[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function makeChatMessage(
  role: "user" | "assistant",
  content: string,
  incomplete?: boolean,
): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(incomplete ? { incomplete } : {}),
  };
}

// Reconciliation (design.md section 8). The tool returns the full AI-owned
// destination set every turn, so we MERGE into existing rows rather than
// replacing them. A blind replace would wipe every creator note and resolved
// cover on each refinement.
//   - Match each incoming destination to an existing row by normalized name.
//   - On a match, update the AI fields and carry over note + image fields.
//   - With no match, insert a new row with an empty note.
//   - For an existing row no longer present, delete it along with its note.
// Returns the merged rows in order, plus the ids of new or changed rows that
// need cover resolution (consumed in Phase 6).
export interface ReconcileResult {
  destinations: PrismaDestination[];
  resolveImageIds: string[];
}

export async function reconcileDestinations(
  itineraryId: string,
  aiDestinations: AiDestination[],
): Promise<ReconcileResult> {
  // Sort by the model's order, then de-duplicate by normalized name (keep the
  // first), and reindex to a clean 0..n-1 sequence.
  const seen = new Set<string>();
  const incoming = [...aiDestinations]
    .sort((a, b) => a.order - b.order)
    .filter((d) => {
      const key = normalizeName(d.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const existing = await prisma.destination.findMany({ where: { itineraryId } });
  const existingByName = new Map(existing.map((d) => [normalizeName(d.name), d]));

  const matchedIds = new Set<string>();
  const resolveImageIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < incoming.length; i++) {
      const inc = incoming[i];
      if (!inc) continue;
      const match = existingByName.get(normalizeName(inc.name));
      const searchText = buildSearchText(inc.name, inc.country);

      if (match) {
        matchedIds.add(match.id);
        // Country change means the cover query changes, so re-resolve it.
        if (match.country !== inc.country) {
          resolveImageIds.push(match.id);
        }
        // note and image fields are intentionally not in `data`, so they carry
        // over untouched.
        await tx.destination.update({
          where: { id: match.id },
          data: {
            name: inc.name,
            country: inc.country,
            description: inc.description,
            order: i,
            searchText,
          },
        });
      } else {
        const created = await tx.destination.create({
          data: {
            itineraryId,
            name: inc.name,
            country: inc.country,
            description: inc.description,
            order: i,
            searchText,
            note: null,
          },
        });
        resolveImageIds.push(created.id);
      }
    }

    const toDelete = existing.filter((d) => !matchedIds.has(d.id)).map((d) => d.id);
    if (toDelete.length > 0) {
      await tx.destination.deleteMany({ where: { id: { in: toDelete } } });
    }
  });

  const destinations = await prisma.destination.findMany({
    where: { itineraryId },
    orderBy: { order: "asc" },
  });
  return { destinations, resolveImageIds };
}

// Resolve covers for the given destination ids only (new or country-changed
// stops), persist the image fields, and return the SSE updates. Runs after the
// itinerary event so the itinerary renders immediately with placeholders; a miss
// leaves the stop on its deterministic fallback and emits no update.
export async function resolveCovers(
  destinations: PrismaDestination[],
  ids: string[],
): Promise<SseImageUpdate[]> {
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const updates: SseImageUpdate[] = [];

  for (const id of ids) {
    const dest = byId.get(id);
    if (!dest) continue;
    const image = await resolvePexelsImage(`${dest.name} ${dest.country}`);
    if (!image) continue;

    await prisma.destination.update({
      where: { id },
      data: {
        imageUrl: image.url,
        imageAlt: image.alt,
        imageCredit: image.credit,
        imageCreditUrl: image.creditUrl,
      },
    });
    updates.push({
      destId: id,
      imageUrl: image.url,
      imageAlt: image.alt,
      imageCredit: image.credit,
      imageCreditUrl: image.creditUrl,
    });
  }

  return updates;
}

// Persist the completed turn: append the user and assistant messages to the
// transcript, and update the title if the model set a new one.
export async function persistTurn(
  itineraryId: string,
  history: ChatMessage[],
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  newTitle?: string,
): Promise<void> {
  const updated = [...history, userMessage, assistantMessage];
  await prisma.itinerary.update({
    where: { id: itineraryId },
    data: {
      chatMessages: JSON.stringify(updated),
      ...(newTitle !== undefined ? { title: newTitle } : {}),
    },
  });
}
