import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { compileLatexToPdf } from "../services/pdf.service.js";

const router = Router();

const generatePdfSchema = z.object({
  latexContent: z.string().min(1)
});

router.post("/generate", validate(generatePdfSchema), async (req, res) => {
  try {
    const pdf = await compileLatexToPdf(req.body.latexContent);
    res
      .status(200)
      .setHeader("Content-Type", "application/pdf")
      .setHeader("Content-Disposition", 'attachment; filename="resume.pdf"')
      .send(pdf);
  } catch (error) {
    res.status(422).json({
      message: error instanceof Error ? error.message : "PDF generation failed"
    });
  }
});

export default router;
