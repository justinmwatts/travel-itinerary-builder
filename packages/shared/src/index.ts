// The shared package is the single source of truth for types across the API and
// the web app. Schemas (with their co-located inferred types) and the
// normalization helpers are re-exported here as the package's public surface.
export * from "./schemas";
export * from "./normalize";
