import "dotenv/config";
import { z } from "zod";

export const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(24),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url().default("http://127.0.0.1:5173"),
  PDF_ENGINE: z.enum(["local", "docker"]).default("docker"),
  LATEX_DOCKER_IMAGE: z.string().default("texlive/texlive:latest")
}).parse(process.env);
