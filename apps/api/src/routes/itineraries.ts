// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_LAYOUT_CONFIG,
  LIMITS,
  createItineraryRequestSchema,
  createReactionRequestSchema,
  reactionTypeSchema,
  updateDestinationNoteRequestSchema,
  updateItineraryRequestSchema,
  type ReactionSummary,
  type ReactionType,
} from "@travel/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { forbidden, notFound, unauthorized, unprocessable } from "../lib/http-error";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { toDestinationDTO, toItineraryDTO, toMyItinerarySummaryDTO } from "../services/serializers";

export const itinerariesRouter = Router();

// The caller's reaction types for one itinerary (empty when anonymous).
async function loadMyReactions(itineraryId: string, userId?: string): Promise<ReactionType[]> {
  if (!userId) return [];
  const rows = await prisma.reaction.findMany({
    where: { itineraryId, userId },
    select: { type: true },
  });
  return rows.map((r) => r.type as ReactionType);
}

// Current counts plus the caller's reaction state, returned after a toggle.
async function loadReactionSummary(itineraryId: string, userId: string): Promise<ReactionSummary> {
  const it = await prisma.itinerary.findUniqueOrThrow({
    where: { id: itineraryId },
    select: { heartCount: true, likeCount: true },
  });
  return {
    heartCount: it.heartCount,
    likeCount: it.likeCount,
    myReactions: await loadMyReactions(itineraryId, userId),
  };
}

// GET /api/itineraries?mine=true -> the caller's drafts and published, grouped.
itinerariesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();

    const items = await prisma.itinerary.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { destinations: true } } },
      orderBy: { updatedAt: "desc" },
    });
    const summaries = items.map(toMyItinerarySummaryDTO);

    res.json({
      drafts: summaries.filter((s) => s.status === "draft"),
      published: summaries.filter((s) => s.status === "published"),
    });
  }),
);

// POST /api/itineraries -> creates an empty draft and returns it.
itinerariesRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();

    const body = createItineraryRequestSchema.parse(req.body ?? {});

    const count = await prisma.itinerary.count({ where: { ownerId: userId } });
    if (count >= LIMITS.maxItinerariesPerUser) {
      throw unprocessable(
        "You have reached the maximum number of itineraries.",
        "too_many_itineraries",
      );
    }

    const itinerary = await prisma.itinerary.create({
      data: {
        ownerId: userId,
        title: body.title ?? "",
        status: "draft",
        layoutConfig: JSON.stringify(DEFAULT_LAYOUT_CONFIG),
        chatMessages: "[]",
      },
    });

    res.status(201).json({
      id: itinerary.id,
      title: itinerary.title,
      status: itinerary.status,
    });
  }),
);

// GET /api/itineraries/:id -> full itinerary. Public if published; a draft is
// readable only by its owner (a non-owner gets 404, never leaked content). The
// owner read includes chatMessages so the builder can resume.
itinerariesRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!id) throw notFound("Itinerary not found");
    const userId = req.userId;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      include: { owner: true, destinations: { orderBy: { order: "asc" } } },
    });
    if (!itinerary) throw notFound("Itinerary not found");

    const isOwner = Boolean(userId) && itinerary.ownerId === userId;
    if (itinerary.status !== "published" && !isOwner) {
      throw notFound("Itinerary not found");
    }

    const myReactions = await loadMyReactions(id, userId);
    res.json(toItineraryDTO(itinerary, { includeChat: isOwner, myReactions }));
  }),
);

// PATCH /api/itineraries/:id -> owner edits title and/or layoutConfig only.
// Touches updatedAt (Prisma @updatedAt), never publishedAt.
itinerariesRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();
    const id = req.params.id;
    if (!id) throw notFound("Itinerary not found");

    const body = updateItineraryRequestSchema.parse(req.body);

    const existing = await prisma.itinerary.findUnique({ where: { id } });
    if (!existing) throw notFound("Itinerary not found");
    if (existing.ownerId !== userId) throw forbidden();

    const data: Prisma.ItineraryUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.layoutConfig !== undefined) data.layoutConfig = JSON.stringify(body.layoutConfig);

    const updated = await prisma.itinerary.update({
      where: { id },
      data,
      include: { owner: true, destinations: { orderBy: { order: "asc" } } },
    });

    const myReactions = await loadMyReactions(id, userId);
    res.json(toItineraryDTO(updated, { includeChat: true, myReactions }));
  }),
);

// PATCH /api/itineraries/:id/destinations/:destId -> sets the creator note on one
// destination. The only client write path to a destination, so it cannot clobber
// the AI-owned fields (name, country, description, order) or the image fields.
itinerariesRouter.patch(
  "/:id/destinations/:destId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();
    const id = req.params.id;
    const destId = req.params.destId;
    if (!id || !destId) throw notFound("Destination not found");

    const body = updateDestinationNoteRequestSchema.parse(req.body);

    const itinerary = await prisma.itinerary.findUnique({ where: { id } });
    if (!itinerary) throw notFound("Itinerary not found");
    if (itinerary.ownerId !== userId) throw forbidden();

    const destination = await prisma.destination.findUnique({ where: { id: destId } });
    if (!destination || destination.itineraryId !== id) {
      throw notFound("Destination not found");
    }

    const updated = await prisma.destination.update({
      where: { id: destId },
      data: { note: body.note },
    });
    res.json(toDestinationDTO(updated));
  }),
);

// POST /api/itineraries/:id/publish -> owner only. Validates the preconditions
// (non-empty title, at least one destination), flips status to published and
// stamps publishedAt. 422 if a precondition fails. Re-publishing keeps the
// original publishedAt so editing a live post does not reorder the feed.
itinerariesRouter.post(
  "/:id/publish",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();
    const id = req.params.id;
    if (!id) throw notFound("Itinerary not found");

    const existing = await prisma.itinerary.findUnique({
      where: { id },
      include: { _count: { select: { destinations: true } } },
    });
    if (!existing) throw notFound("Itinerary not found");
    if (existing.ownerId !== userId) throw forbidden();

    if (existing.title.trim() === "") {
      throw unprocessable("Add a title before publishing.", "missing_title");
    }
    if (existing._count.destinations === 0) {
      throw unprocessable("Add at least one destination before publishing.", "no_destinations");
    }

    const data: Prisma.ItineraryUpdateInput = { status: "published" };
    if (!existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await prisma.itinerary.update({
      where: { id },
      data,
      include: { owner: true, destinations: { orderBy: { order: "asc" } } },
    });
    const myReactions = await loadMyReactions(id, userId);
    res.json(toItineraryDTO(updated, { includeChat: true, myReactions }));
  }),
);

// POST /api/itineraries/:id/reactions -> idempotent toggle on. Target must be
// published, else 404. The unique (itineraryId, userId, type) constraint keeps
// rapid taps correct: a duplicate create fails P2002 and the transaction rolls
// back, so the denormalized count is incremented exactly once.
itinerariesRouter.post(
  "/:id/reactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();
    const id = req.params.id;
    if (!id) throw notFound("Itinerary not found");
    const { type } = createReactionRequestSchema.parse(req.body);

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!itinerary || itinerary.status !== "published") {
      throw notFound("Itinerary not found");
    }

    const increment: Prisma.ItineraryUpdateInput =
      type === "heart" ? { heartCount: { increment: 1 } } : { likeCount: { increment: 1 } };

    try {
      await prisma.$transaction(async (tx) => {
        await tx.reaction.create({ data: { itineraryId: id, userId, type } });
        await tx.itinerary.update({ where: { id }, data: increment });
      });
    } catch (err) {
      // Already reacted: idempotent no-op. Any other error propagates.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
        throw err;
      }
    }

    res.json(await loadReactionSummary(id, userId));
  }),
);

// DELETE /api/itineraries/:id/reactions/:type -> toggle off. Decrements the count
// only when a row was actually removed, so a double toggle-off cannot underflow.
itinerariesRouter.delete(
  "/:id/reactions/:type",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();
    const id = req.params.id;
    if (!id) throw notFound("Itinerary not found");
    const type = reactionTypeSchema.parse(req.params.type);

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!itinerary || itinerary.status !== "published") {
      throw notFound("Itinerary not found");
    }

    await prisma.$transaction(async (tx) => {
      const removed = await tx.reaction.deleteMany({ where: { itineraryId: id, userId, type } });
      if (removed.count > 0) {
        const decrement: Prisma.ItineraryUpdateInput =
          type === "heart" ? { heartCount: { decrement: 1 } } : { likeCount: { decrement: 1 } };
        await tx.itinerary.update({ where: { id }, data: decrement });
      }
    });

    res.json(await loadReactionSummary(id, userId));
  }),
);

// DELETE /api/itineraries/:id -> owner only. Cascades destinations and reactions.
itinerariesRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) throw unauthorized();
    const id = req.params.id;
    if (!id) throw notFound("Itinerary not found");

    const existing = await prisma.itinerary.findUnique({ where: { id } });
    if (!existing) throw notFound("Itinerary not found");
    if (existing.ownerId !== userId) throw forbidden();

    await prisma.itinerary.delete({ where: { id } });
    res.status(204).end();
  }),
);
