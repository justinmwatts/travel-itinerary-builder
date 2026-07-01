// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { Router } from "express";
import { imageQuerySchema, imageResultSchema } from "@travel/shared";
import { asyncHandler } from "../lib/async-handler";
import { notFound } from "../lib/http-error";
import { requireAuth } from "../middleware/auth";
import { imageRateLimit } from "../middleware/rateLimit";
import { resolvePexelsImage } from "../services/pexels";

export const imagesRouter = Router();

// GET /api/images?q=location -> proxies Pexels, cached by normalized query,
// returns { url, alt, credit, creditUrl }. The key stays server-side.
imagesRouter.get(
  "/",
  requireAuth,
  imageRateLimit,
  asyncHandler(async (req, res) => {
    const { q } = imageQuerySchema.parse(req.query);
    const image = await resolvePexelsImage(q);
    if (!image) {
      throw notFound("No image found for that query", "no_image");
    }
    res.json(imageResultSchema.parse(image));
  }),
);
