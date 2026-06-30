import type {
  Destination as PrismaDestination,
  Itinerary as PrismaItinerary,
  User as PrismaUser,
} from "@prisma/client";
import {
  destinationSchema,
  itinerarySchema,
  layoutConfigSchema,
  myItinerarySummarySchema,
  type ChatMessage,
  type Destination,
  type Itinerary,
  type MyItinerarySummary,
  type ReactionType,
} from "@travel/shared";

// Wire-safe destination shape. Drops the internal searchText column and validates
// against the shared schema so responses provably match the contract.
export function toDestinationDTO(row: PrismaDestination): Destination {
  return destinationSchema.parse({
    id: row.id,
    itineraryId: row.itineraryId,
    order: row.order,
    name: row.name,
    country: row.country,
    description: row.description,
    note: row.note,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    imageCredit: row.imageCredit,
    imageCreditUrl: row.imageCreditUrl,
  });
}

// Tolerant parse of the chatMessages JSON column; a bad column should not break
// a read.
function safeChatMessages(raw: string): ChatMessage[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

type ItineraryWithRelations = PrismaItinerary & {
  owner: PrismaUser;
  destinations: PrismaDestination[];
};

// Full itinerary DTO. chatMessages is included only for the owner (used to
// resume the builder); it is omitted on public reads.
export function toItineraryDTO(
  it: ItineraryWithRelations,
  opts: { includeChat: boolean; myReactions: ReactionType[] },
): Itinerary {
  return itinerarySchema.parse({
    id: it.id,
    ownerId: it.ownerId,
    author: { id: it.owner.id, displayName: it.owner.displayName },
    title: it.title,
    status: it.status,
    layoutConfig: layoutConfigSchema.parse(JSON.parse(it.layoutConfig)),
    destinations: it.destinations.map(toDestinationDTO),
    heartCount: it.heartCount,
    likeCount: it.likeCount,
    myReactions: opts.myReactions,
    ...(opts.includeChat ? { chatMessages: safeChatMessages(it.chatMessages) } : {}),
    createdAt: it.createdAt.toISOString(),
    updatedAt: it.updatedAt.toISOString(),
    publishedAt: it.publishedAt ? it.publishedAt.toISOString() : null,
  });
}

// Compact summary for the /me management screen.
export function toMyItinerarySummaryDTO(
  it: PrismaItinerary & { _count: { destinations: number } },
): MyItinerarySummary {
  return myItinerarySummarySchema.parse({
    id: it.id,
    title: it.title,
    status: it.status,
    stopCount: it._count.destinations,
    heartCount: it.heartCount,
    likeCount: it.likeCount,
    updatedAt: it.updatedAt.toISOString(),
    publishedAt: it.publishedAt ? it.publishedAt.toISOString() : null,
  });
}
