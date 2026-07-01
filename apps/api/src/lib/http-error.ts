// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
// Typed HTTP errors thrown by routes and services, mapped to responses by the
// central error handler. `code` is a stable machine-readable string for the
// client; `message` is human-readable.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (message = "Not authenticated", code = "unauthenticated") =>
  new HttpError(401, message, code);

export const forbidden = (message = "Forbidden", code = "forbidden") =>
  new HttpError(403, message, code);

export const notFound = (message = "Not found", code = "not_found") =>
  new HttpError(404, message, code);

export const conflict = (message: string, code: string) => new HttpError(409, message, code);

export const unprocessable = (message: string, code: string) => new HttpError(422, message, code);
