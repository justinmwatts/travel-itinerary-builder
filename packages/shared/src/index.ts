// The shared package is the single source of truth for types across the API and
// the web app. Phase 1 replaces these placeholders with the real zod schemas
// (User, Itinerary, Destination, Reaction, LayoutConfig, ChatMessage) and their
// inferred TypeScript types. For Phase 0 this only proves the workspace import
// resolves in both apps.

export const SHARED_OK = "ok" as const;
export const SHARED_PACKAGE_VERSION = "0.0.0" as const;
