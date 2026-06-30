import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { feedQuerySchema, foldAccents, type ReactionType } from "@travel/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { optionalAuth } from "../middleware/auth";
import { toFeedItemDTO } from "../services/serializers";

export const feedRouter = Router();

interface Cursor {
  publishedAt: string;
  id: string;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.publishedAt}|${c.id}`, "utf8").toString("base64url");
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const [publishedAt, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
    if (!publishedAt || !id) return null;
    return { publishedAt, id };
  } catch {
    return null;
  }
}

// GET /api/feed?q=&cursor=&limit= -> published itineraries, newest first with id
// as tiebreak, keyset paginated. q matches a destination name or country and
// returns the parent itineraries once, with the matched stops flagged. Public,
// but personalizes myReactions when authed.
feedRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q, cursor, limit } = feedQuerySchema.parse(req.query);
    const userId = req.userId;
    const nq = q ? foldAccents(q.trim().toLowerCase()) : undefined;

    const and: Prisma.ItineraryWhereInput[] = [{ status: "published", publishedAt: { not: null } }];
    if (nq) {
      and.push({ destinations: { some: { searchText: { contains: nq } } } });
    }
    const decoded = cursor ? decodeCursor(cursor) : null;
    if (decoded) {
      const at = new Date(decoded.publishedAt);
      and.push({
        OR: [
          { publishedAt: { lt: at } },
          { AND: [{ publishedAt: at }, { id: { lt: decoded.id } }] },
        ],
      });
    }

    const rows = await prisma.itinerary.findMany({
      where: { AND: and },
      include: { owner: true, destinations: { orderBy: { order: "asc" } } },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    // Resolve the caller's reactions for the page in one query (avoids N+1).
    const reactionsByItinerary = new Map<string, ReactionType[]>();
    if (userId && page.length > 0) {
      const reactions = await prisma.reaction.findMany({
        where: { itineraryId: { in: page.map((r) => r.id) }, userId },
        select: { itineraryId: true, type: true },
      });
      for (const r of reactions) {
        const arr = reactionsByItinerary.get(r.itineraryId) ?? [];
        arr.push(r.type as ReactionType);
        reactionsByItinerary.set(r.itineraryId, arr);
      }
    }

    const items = page.map((row) =>
      toFeedItemDTO(row, {
        matchedDestinationIds: nq
          ? row.destinations.filter((d) => d.searchText.includes(nq)).map((d) => d.id)
          : [],
        myReactions: reactionsByItinerary.get(row.id) ?? [],
      }),
    );

    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last?.publishedAt
        ? encodeCursor({ publishedAt: last.publishedAt.toISOString(), id: last.id })
        : null;

    res.json({ items, nextCursor });
  }),
);
