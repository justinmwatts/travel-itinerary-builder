import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { userSchema, type User } from "@travel/shared";
import { env } from "../config/env";

// Sessions are a signed JWT delivered in an httpOnly, SameSite=Lax cookie. The
// token never touches JS on the client, which removes the XSS token-theft path
// (design.md section 11).
export const AUTH_COOKIE = "tib_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid token payload");
  }
  return payload.sub;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: TOKEN_TTL_SECONDS * 1000 });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

// The wire-safe user shape: never includes passwordHash. Validated against the
// shared schema so the response provably matches the contract.
export function toUserDTO(user: {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}): User {
  return userSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  });
}
