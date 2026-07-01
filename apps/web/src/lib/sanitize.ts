// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import DOMPurify from "dompurify";

// Model output and creator notes are untrusted (design.md section 11, CLAUDE.md).
// We render them as React text nodes, which already escapes HTML, but per the
// security mandate we also strip any tags with DOMPurify before rendering as a
// defense-in-depth layer. KEEP_CONTENT preserves the inner text.
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
