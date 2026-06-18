import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./lib/env.js";
import atsRoutes from "./routes/ats.routes.js";
import authRoutes from "./routes/auth.routes.js";
import pdfRoutes from "./routes/pdf.routes.js";
import resumeRoutes from "./routes/resume.routes.js";

export const app = express();

app.use(helmet());
const allowedOrigins = new Set([env.CLIENT_URL]);
const isLocalFrontend = (origin: string) => /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isLocalFrontend(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/ats", atsRoutes);
app.use("/api/pdf", pdfRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});
