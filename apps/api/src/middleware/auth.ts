// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import type { RequestHandler } from "express";
import { unauthorized } from "../lib/http-error";
import { AUTH_COOKIE, verifyToken } from "../services/auth";

// Require a valid session. Reads the JWT from the httpOnly cookie, verifies it,
// and attaches the user id to the request. 401 on a missing or invalid token.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
  if (!token) {
    next(unauthorized());
    return;
  }
  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    next(unauthorized("Invalid session", "unauthenticated"));
  }
};

// Attach the user id when a valid session is present, but never reject. For
// endpoints that are public yet personalize when authed (feed, itinerary read).
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
  if (token) {
    try {
      req.userId = verifyToken(token);
    } catch {
      // Ignore an invalid token for optional auth; treat as anonymous.
    }
  }
  next();
};
