// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/http-error";

// Simple in-memory fixed-window rate limiter to bound cost and abuse (design.md
// section 11). v1 runs as one process, so an in-process map is enough; the
// design swaps this for Redis counters at scale.
interface Window {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string | undefined;
  code: string;
  message: string;
}

export function rateLimit({
  windowMs,
  max,
  keyFn,
  code,
  message,
}: RateLimitOptions): RequestHandler {
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const key = keyFn(req);
    if (!key) {
      next();
      return;
    }

    const now = Date.now();
    let window = windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(key, window);
    }
    window.count += 1;

    // Opportunistic prune so the map does not grow without bound.
    if (windows.size > 5000) {
      for (const [k, w] of windows) {
        if (w.resetAt <= now) windows.delete(k);
      }
    }

    if (window.count > max) {
      res.setHeader("Retry-After", Math.ceil((window.resetAt - now) / 1000));
      next(new HttpError(429, message, code));
      return;
    }
    next();
  };
}

// Per-user limiters run after requireAuth, so the user id is available.
const byUser = (req: Request) => req.userId;
const byIp = (req: Request) => req.ip ?? "unknown";

export const chatRateLimit = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyFn: byUser,
  code: "rate_limited",
  message: "You are sending messages too quickly. Slow down a moment.",
});

export const imageRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyFn: byUser,
  code: "rate_limited",
  message: "Too many image lookups. Try again shortly.",
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 12,
  keyFn: byIp,
  code: "rate_limited",
  message: "Too many attempts. Try again in a minute.",
});
