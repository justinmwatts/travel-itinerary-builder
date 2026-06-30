import { z } from "zod";

// The single source of truth for types across the API and the web app. The
// backend validates requests and responses against these schemas at runtime;
// the frontend imports the inferred types. Types are never defined twice.
//
// Wire dates are ISO 8601 strings: Express serializes Prisma `DateTime` to JSON
// strings, so response DTOs model dates as `z.string().datetime()`.

// --- Caps (design.md sections 6 and 8) -------------------------------------
// Bound cost and storage. Enforced here so both apps agree on the limits.
export const LIMITS = {
  passwordMin: 8,
  passwordMax: 200,
  displayNameMax: 50,
  titleMax: 120,
  noteMax: 1000,
  userMessageMax: 2000,
  maxDestinationsPerItinerary: 20,
  maxItinerariesPerUser: 50,
  imageQueryMax: 120,
  searchQueryMax: 120,
  feedLimitMax: 50,
  feedLimitDefault: 20,
} as const;

// --- Enums (constrained at the app layer; SQLite has no native enums) -------
export const itineraryStatusSchema = z.enum(["draft", "published"]);
export const reactionTypeSchema = z.enum(["like", "heart"]);
export const chatRoleSchema = z.enum(["user", "assistant"]);

export const textDensitySchema = z.enum(["compact", "comfortable", "spacious"]);
export const cardSizeSchema = z.enum(["sm", "md", "lg"]);
export const imageCropSchema = z.enum(["fill", "fit"]);
export const imageFocusSchema = z.enum(["top", "center", "bottom"]);

export type ItineraryStatus = z.infer<typeof itineraryStatusSchema>;
export type ReactionType = z.infer<typeof reactionTypeSchema>;
export type ChatRole = z.infer<typeof chatRoleSchema>;
export type TextDensity = z.infer<typeof textDensitySchema>;
export type CardSize = z.infer<typeof cardSizeSchema>;
export type ImageCrop = z.infer<typeof imageCropSchema>;
export type ImageFocus = z.infer<typeof imageFocusSchema>;

// --- Layout config ----------------------------------------------------------
export const layoutConfigSchema = z.object({
  textDensity: textDensitySchema,
  cardSize: cardSizeSchema,
  imageCrop: imageCropSchema,
  imageFocus: imageFocusSchema,
});
export type LayoutConfig = z.infer<typeof layoutConfigSchema>;

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  textDensity: "comfortable",
  cardSize: "md",
  imageCrop: "fill",
  imageFocus: "center",
};

// --- Chat message (stored as JSON on the itinerary) -------------------------
export const chatMessageSchema = z.object({
  id: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime(),
  // Set when a stream dropped mid-reply, so the UI can offer a retry.
  incomplete: z.boolean().optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// --- Core entities (API response shapes; no secrets) ------------------------
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

// Public attribution on feed cards and the detail view.
export const authorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});
export type Author = z.infer<typeof authorSchema>;

export const destinationSchema = z.object({
  id: z.string(),
  itineraryId: z.string(),
  order: z.number().int().nonnegative(),
  name: z.string(),
  country: z.string(),
  description: z.string(),
  note: z.string().nullable(),
  // Image fields are null until the Pexels proxy resolves a cover (Phase 6).
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageCredit: z.string().nullable(),
  imageCreditUrl: z.string().nullable(),
});
export type Destination = z.infer<typeof destinationSchema>;

export const reactionSchema = z.object({
  id: z.string(),
  itineraryId: z.string(),
  userId: z.string(),
  type: reactionTypeSchema,
  createdAt: z.string().datetime(),
});
export type Reaction = z.infer<typeof reactionSchema>;

// Derived counts plus the caller's own reaction state, returned with reactable
// resources. `myReactions` is empty for anonymous callers.
export const reactionSummarySchema = z.object({
  heartCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  myReactions: z.array(reactionTypeSchema),
});
export type ReactionSummary = z.infer<typeof reactionSummarySchema>;

// Full itinerary for GET /api/itineraries/:id. `chatMessages` is present only
// for the owner (used to resume the builder); it is omitted on public reads.
export const itinerarySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  author: authorSchema,
  title: z.string(),
  status: itineraryStatusSchema,
  layoutConfig: layoutConfigSchema,
  destinations: z.array(destinationSchema),
  heartCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  myReactions: z.array(reactionTypeSchema),
  chatMessages: z.array(chatMessageSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});
export type Itinerary = z.infer<typeof itinerarySchema>;

// --- Auth requests and responses --------------------------------------------
export const signupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax),
  displayName: z.string().min(1).max(LIMITS.displayNameMax),
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(LIMITS.passwordMax),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseSchema = z.object({ user: userSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

// --- Itinerary requests -----------------------------------------------------
// Empty draft on create; an optional starting title is allowed.
export const createItineraryRequestSchema = z.object({
  title: z.string().max(LIMITS.titleMax).optional(),
});
export type CreateItineraryRequest = z.infer<typeof createItineraryRequestSchema>;

// Owner-editable fields only. Title may be cleared to "" while drafting; the
// publish precondition enforces a non-empty title.
export const updateItineraryRequestSchema = z
  .object({
    title: z.string().max(LIMITS.titleMax).optional(),
    layoutConfig: layoutConfigSchema.optional(),
  })
  .refine((d) => d.title !== undefined || d.layoutConfig !== undefined, {
    message: "Provide at least one field to update",
  });
export type UpdateItineraryRequest = z.infer<typeof updateItineraryRequestSchema>;

// The only client write path to a destination, so it cannot clobber AI fields.
export const updateDestinationNoteRequestSchema = z.object({
  note: z.string().max(LIMITS.noteMax).nullable(),
});
export type UpdateDestinationNoteRequest = z.infer<typeof updateDestinationNoteRequestSchema>;

// --- Reactions --------------------------------------------------------------
export const createReactionRequestSchema = z.object({ type: reactionTypeSchema });
export type CreateReactionRequest = z.infer<typeof createReactionRequestSchema>;

// --- Chat -------------------------------------------------------------------
// The client sends only the new turn; the server loads prior history.
export const chatRequestSchema = z.object({
  itineraryId: z.string(),
  userMessage: z.string().min(1).max(LIMITS.userMessageMax),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

// --- Images -----------------------------------------------------------------
export const imageQuerySchema = z.object({
  q: z.string().min(1).max(LIMITS.imageQueryMax),
});
export type ImageQuery = z.infer<typeof imageQuerySchema>;

export const imageResultSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  credit: z.string(),
  creditUrl: z.string().url(),
});
export type ImageResult = z.infer<typeof imageResultSchema>;

// --- Feed -------------------------------------------------------------------
export const feedQuerySchema = z.object({
  q: z.string().max(LIMITS.searchQueryMax).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.feedLimitMax).default(LIMITS.feedLimitDefault),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;

// Cover image plus the destination name that keys the deterministic fallback.
export const feedCoverSchema = z.object({
  name: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageCredit: z.string().nullable(),
  imageCreditUrl: z.string().nullable(),
});
export type FeedCover = z.infer<typeof feedCoverSchema>;

export const feedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: authorSchema,
  stopCount: z.number().int().nonnegative(),
  cover: feedCoverSchema.nullable(),
  layoutConfig: layoutConfigSchema,
  heartCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  // Destinations matched by the search query, for highlight on open.
  matchedDestinationIds: z.array(z.string()),
  myReactions: z.array(reactionTypeSchema),
  publishedAt: z.string().datetime(),
});
export type FeedItem = z.infer<typeof feedItemSchema>;

export const feedResponseSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
});
export type FeedResponse = z.infer<typeof feedResponseSchema>;

// --- My itineraries (GET /api/itineraries?mine=true) ------------------------
export const myItinerarySummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: itineraryStatusSchema,
  stopCount: z.number().int().nonnegative(),
  heartCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});
export type MyItinerarySummary = z.infer<typeof myItinerarySummarySchema>;

export const myItinerariesResponseSchema = z.object({
  drafts: z.array(myItinerarySummarySchema),
  published: z.array(myItinerarySummarySchema),
});
export type MyItinerariesResponse = z.infer<typeof myItinerariesResponseSchema>;

// --- SSE event payloads (design.md section 7) -------------------------------
export const sseErrorCodeSchema = z.enum([
  "rate_limited", // upstream 429
  "overloaded", // upstream 529
  "timeout",
  "validation",
  "unauthenticated",
  "internal",
]);
export type SseErrorCode = z.infer<typeof sseErrorCodeSchema>;

export const sseTokenSchema = z.object({ delta: z.string() });
export type SseToken = z.infer<typeof sseTokenSchema>;

// The structured update after reconciliation. Carries the title (the model sets
// it via set_itinerary and the live panel displays it) plus the merged
// destinations; imageUrl may still be null at this point.
export const sseItinerarySchema = z.object({
  title: z.string(),
  destinations: z.array(destinationSchema),
});
export type SseItinerary = z.infer<typeof sseItinerarySchema>;

export const sseImageUpdateSchema = z.object({
  destId: z.string(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageCredit: z.string().nullable(),
  imageCreditUrl: z.string().nullable(),
});
export type SseImageUpdate = z.infer<typeof sseImageUpdateSchema>;

export const sseImagesSchema = z.object({ updates: z.array(sseImageUpdateSchema) });
export type SseImages = z.infer<typeof sseImagesSchema>;

export const sseDoneSchema = z.object({ messageId: z.string() });
export type SseDone = z.infer<typeof sseDoneSchema>;

export const sseErrorSchema = z.object({ message: z.string(), code: sseErrorCodeSchema });
export type SseError = z.infer<typeof sseErrorSchema>;

// --- AI structured output (the set_itinerary tool input) --------------------
// AI-owned fields only. Notes and images belong to the creator and the image
// service and are never written by the model (design.md section 8).
export const aiDestinationSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  description: z.string(),
  order: z.number().int().nonnegative(),
});
export type AiDestination = z.infer<typeof aiDestinationSchema>;

export const setItineraryToolInputSchema = z.object({
  title: z.string().min(1).max(LIMITS.titleMax),
  destinations: z.array(aiDestinationSchema).max(LIMITS.maxDestinationsPerItinerary),
});
export type SetItineraryToolInput = z.infer<typeof setItineraryToolInputSchema>;
