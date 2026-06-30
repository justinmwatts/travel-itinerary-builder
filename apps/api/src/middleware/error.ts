import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error";

// Central error handler. Schema failures become 422, typed HttpErrors map to
// their status, everything else is a 500 with the detail logged but not leaked.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "Validation failed",
      code: "validation",
      issues: err.flatten(),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", code: "internal" });
};
