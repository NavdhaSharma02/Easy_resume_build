import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { extractResumeText, parseResumeText } from "../services/import.service.js";
import { createResumeSchema, updateResumeSchema } from "../services/resume.schema.js";
import { compileLatexToPdf } from "../services/pdf.service.js";
import { generateLatex } from "../templates/latex.js";
import type { ResumeData, TemplateId } from "../types/resume.js";
import { sanitizeLatex } from "../utils/latex.js";

const router = Router();
const idSchema = z.object({ id: z.string().min(1) });
const routeId = (req: AuthedRequest) => z.string().parse(req.params.id);
const toPrismaTemplate = (template: TemplateId) => template.toUpperCase() as "CLASSIC" | "MODERN" | "COMPACT";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res) => {
  const search = String(req.query.search ?? "");
  const resumes = await prisma.resume.findMany({
    where: {
      userId: req.user!.userId,
      title: search ? { contains: search, mode: "insensitive" } : undefined
    },
    include: { atsReports: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" }
  });
  res.json(resumes);
});

router.post("/", validate(createResumeSchema), async (req: AuthedRequest, res) => {
  const latexContent = generateLatex(req.body.resumeData, req.body.template);
  const resume = await prisma.resume.create({
    data: {
      userId: req.user!.userId,
      title: req.body.title,
      template: toPrismaTemplate(req.body.template),
      resumeData: req.body.resumeData,
      latexContent
    }
  });
  res.status(201).json(resume);
});

router.post("/import", upload.single("resume"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ message: "Resume file is required" });

  try {
    const text = await extractResumeText(req.file);
    const resumeData = parseResumeText(text);
    const title = resumeData.personal.fullName ? `${resumeData.personal.fullName} Resume` : "Imported Resume";
    const latexContent = generateLatex(resumeData, "classic");
    const resume = await prisma.resume.create({
      data: {
        userId: req.user!.userId,
        title,
        template: "CLASSIC",
        resumeData,
        latexContent
      }
    });

    res.status(201).json(resume);
  } catch (error) {
    res.status(422).json({ message: error instanceof Error ? error.message : "Could not import resume" });
  }
});

router.get("/:id", validate(idSchema, "params"), async (req: AuthedRequest, res) => {
  const id = routeId(req);
  const resume = await prisma.resume.findFirst({
    where: { id, userId: req.user!.userId },
    include: { atsReports: { orderBy: { createdAt: "desc" } } }
  });
  if (!resume) return res.status(404).json({ message: "Resume not found" });
  res.json(resume);
});

router.put("/:id", validate(idSchema, "params"), validate(updateResumeSchema), async (req: AuthedRequest, res) => {
  const id = routeId(req);
  const existing = await prisma.resume.findFirst({ where: { id, userId: req.user!.userId } });
  if (!existing) return res.status(404).json({ message: "Resume not found" });
  const template = req.body.template ?? existing.template.toLowerCase();
  const latexContent = req.body.latexContent
    ? sanitizeLatex(req.body.latexContent)
    : req.body.resumeData
      ? generateLatex(req.body.resumeData, template as TemplateId)
      : undefined;

  const resume = await prisma.resume.update({
    where: { id },
    data: {
      title: req.body.title,
      template: req.body.template ? toPrismaTemplate(req.body.template) : undefined,
      resumeData: req.body.resumeData,
      latexContent
    }
  });
  res.json(resume);
});

router.delete("/:id", validate(idSchema, "params"), async (req: AuthedRequest, res) => {
  const id = routeId(req);
  const existing = await prisma.resume.findFirst({ where: { id, userId: req.user!.userId } });
  if (!existing) return res.status(404).json({ message: "Resume not found" });
  await prisma.resume.delete({ where: { id } });
  res.status(204).send();
});

router.post("/:id/duplicate", validate(idSchema, "params"), async (req: AuthedRequest, res) => {
  const id = routeId(req);
  const existing = await prisma.resume.findFirst({ where: { id, userId: req.user!.userId } });
  if (!existing) return res.status(404).json({ message: "Resume not found" });

  const copy = await prisma.resume.create({
    data: {
      userId: req.user!.userId,
      title: `${existing.title} Copy`,
      template: existing.template,
      resumeData: existing.resumeData!,
      latexContent: existing.latexContent
    }
  });
  res.status(201).json(copy);
});

router.post("/:id/generate-latex", validate(idSchema, "params"), async (req: AuthedRequest, res) => {
  const id = routeId(req);
  const resume = await prisma.resume.findFirst({ where: { id, userId: req.user!.userId } });
  if (!resume) return res.status(404).json({ message: "Resume not found" });

  const template = resume.template.toLowerCase() as TemplateId;
  const latexContent = generateLatex(resume.resumeData as ResumeData, template);
  await prisma.resume.update({ where: { id: resume.id }, data: { latexContent } });
  res.json({ latexContent });
});

router.post("/:id/generate-pdf", validate(idSchema, "params"), async (req: AuthedRequest, res) => {
  const id = routeId(req);
  const resume = await prisma.resume.findFirst({ where: { id, userId: req.user!.userId } });
  if (!resume) return res.status(404).json({ message: "Resume not found" });

  const template = resume.template.toLowerCase() as TemplateId;
  const latexContent = resume.latexContent ?? generateLatex(resume.resumeData as ResumeData, template);

  try {
    const pdf = await compileLatexToPdf(latexContent);
    res
      .status(200)
      .setHeader("Content-Type", "application/pdf")
      .setHeader("Content-Disposition", `attachment; filename="${resume.title}.pdf"`)
      .send(pdf);
  } catch (error) {
    res.status(422).json({
      message: error instanceof Error ? error.message : "PDF generation failed"
    });
  }
});

export default router;
