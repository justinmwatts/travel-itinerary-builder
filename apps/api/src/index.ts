import express from "express";
import { LIMITS } from "@travel/shared";

// Minimal Express server with a health route that reads a value from the shared
// contract, proving the workspace import resolves at runtime. Routes,
// middleware, auth, chat and the image proxy arrive in later phases per
// design.md section 17.

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", maxDestinations: LIMITS.maxDestinationsPerItinerary });
});

app.listen(PORT, () => {
  console.log(`api listening on http://localhost:${PORT}`);
});
