import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  DEFAULT_LAYOUT_CONFIG,
  LIMITS,
  createItineraryRequestSchema,
  updateItineraryRequestSchema,
  type ReactionType,
} from "@travel/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { forbidden, notFound, unauthorized, unprocessable } from "../lib/http-error";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { toItineraryDTO, toMyItinerarySummaryDTO } from "../services/serializers";

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
