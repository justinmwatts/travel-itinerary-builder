import express from "express";
import { SHARED_OK } from "@travel/shared";

// Phase 0 boot: a minimal Express server with a health route that reads a value
// from the shared package, proving the workspace import resolves at runtime.
// Routes, middleware, Prisma, auth, chat and the image proxy arrive in later
// phases per design.md section 17.

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", shared: SHARED_OK });
});

app.listen(PORT, () => {
  console.log(`api listening on http://localhost:${PORT}`);
});
