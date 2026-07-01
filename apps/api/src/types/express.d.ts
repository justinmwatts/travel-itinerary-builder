// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
// Augment Express Request with the authenticated user id, set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
