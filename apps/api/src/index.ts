import { env } from "./config/env";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { chatRouter } from "./routes/chat";
import { imagesRouter } from "./routes/images";
import { itinerariesRouter } from "./routes/itineraries";
import { errorHandler } from "./middleware/error";

const app = express();

// CORS locked to the web origin with credentials enabled for the session
// cookie. JSON bodies and cookies are parsed before any route runs.
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/itineraries", itinerariesRouter);
app.use("/api/chat", chatRouter);
app.use("/api/images", imagesRouter);

// Error handler is registered last so thrown errors and rejected async handlers
// land here.
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});
