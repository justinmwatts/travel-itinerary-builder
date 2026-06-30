import { Router } from "express";
import { DEFAULT_LAYOUT_CONFIG, LIMITS, createItineraryRequestSchema } from "@travel/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { unauthorized, unprocessable } from "../lib/http-error";
import { requireAuth } from "../middleware/auth";

export const itinerariesRouter = Router();

// POST /api/itineraries -> creates an empty draft and returns it. This is the
// itinerary the chat builder attaches to. Full CRUD (get, patch, delete,
// list-mine) lands in Phase 4.
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
