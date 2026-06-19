import { z } from "zod";

const entrySchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  organization: z.string().default(""),
  location: z.string().default(""),
  dates: z.string().default(""),
  cgpa: z.string().optional(),
  bullets: z.array(z.string()).default([])
});

export const resumeDataSchema = z.object({
  summary: z.string().default(""),
  personal: z.object({
    fullName: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    links: z.object({
      github: z.string().default(""),
      linkedin: z.string().default(""),
      portfolio: z.string().default(""),
      leetcode: z.string().default("")
    })
  }),
  education: z.array(entrySchema).default([]),
  experience: z.array(entrySchema).default([]),
  projects: z.array(entrySchema).default([]),
  skills: z.array(z.object({
    id: z.string().min(1),
    category: z.string().default(""),
    items: z.array(z.string()).default([])
  })).default([]),
  achievements: z.array(entrySchema).default([]),
  certifications: z.array(entrySchema).default([]),
  responsibilities: z.array(entrySchema).default([]),
  publications: z.array(entrySchema).default([])
});

export const createResumeSchema = z.object({
  title: z.string().min(1),
  template: z.enum(["classic", "modern", "compact"]).default("classic"),
  resumeData: resumeDataSchema
});

export const updateResumeSchema = createResumeSchema.partial().extend({
  latexContent: z.string().optional()
});
