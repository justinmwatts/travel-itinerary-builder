// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { Router } from "express";
import bcrypt from "bcryptjs";
import { loginRequestSchema, signupRequestSchema } from "@travel/shared";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { conflict, unauthorized } from "../lib/http-error";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";
import { clearAuthCookie, setAuthCookie, signToken, toUserDTO } from "../services/auth";

const BCRYPT_ROUNDS = 10;

export const authRouter = Router();

// POST /api/auth/signup -> creates a user, sets the session cookie. 409 on a
// duplicate email, 422 on schema failure (e.g. password too short).
authRouter.post(
  "/signup",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const body = signupRequestSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw conflict("That email is already registered", "email_taken");
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, displayName: body.displayName, passwordHash },
    });

    setAuthCookie(res, signToken(user.id));
    res.status(201).json({ user: toUserDTO(user) });
  }),
);

// POST /api/auth/login -> verifies credentials, sets the session cookie. 401 on
// bad credentials, with one generic message to avoid user enumeration.
authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const body = loginRequestSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user ? await bcrypt.compare(body.password, user.passwordHash) : false;
    if (!user || !ok) {
      throw unauthorized("Email or password is incorrect", "invalid_credentials");
    }

    setAuthCookie(res, signToken(user.id));
    res.json({ user: toUserDTO(user) });
  }),
);

// POST /api/auth/logout -> clears the cookie.
authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

// GET /api/auth/me -> the current user, or 401.
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
      throw unauthorized();
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw unauthorized();
    }
    res.json({ user: toUserDTO(user) });
  }),
);
