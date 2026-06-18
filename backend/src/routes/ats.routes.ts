import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { analyzeResume } from "../services/ats.service.js";
import { resumeDataSchema } from "../services/resume.schema.js";
import type { ResumeData } from "../types/resume.js";

const router = Router();

const analyzeSchema = z.object({
  resumeId: z.string().optional(),
  resumeData: resumeDataSchema.optional(),
  jobDescription: z.string().default("")
});

router.use(requireAuth);

router.post("/analyze", validate(analyzeSchema), async (req: AuthedRequest, res) => {
  let data = req.body.resumeData as ResumeData | undefined;
  let resumeId = req.body.resumeId as string | undefined;

  if (resumeId) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: req.user!.userId } });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    data = resume.resumeData as ResumeData;
  }

  if (!data) return res.status(400).json({ message: "resumeId or resumeData is required" });

  const report = analyzeResume(data, req.body.jobDescription);
  if (resumeId) {
    await prisma.aTSReport.create({ data: { resumeId, ...report } });
  }

  res.json(report);
});

export default router;
