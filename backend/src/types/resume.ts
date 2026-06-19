export type TemplateId = "classic" | "modern" | "compact";

export const DEFAULT_SECTION_ORDER = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "achievements",
  "certifications",
  "responsibilities",
  "publications"
] as const;

export type SectionId = typeof DEFAULT_SECTION_ORDER[number];

export type ResumeEntry = {
  id: string;
  title: string;
  organization: string;
  location: string;
  dates: string;
  cgpa?: string;
  bullets: string[];
};

export type SkillGroup = {
  id: string;
  category: string;
  items: string[];
};

export type ResumeData = {
  summary: string;
  sectionOrder?: SectionId[];
  personal: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    links: {
      github: string;
      linkedin: string;
      portfolio: string;
      leetcode: string;
    };
  };
  education: ResumeEntry[];
  experience: ResumeEntry[];
  projects: ResumeEntry[];
  skills: SkillGroup[];
  achievements: ResumeEntry[];
  certifications: ResumeEntry[];
  responsibilities: ResumeEntry[];
  publications: ResumeEntry[];
};

export type AtsReportPayload = {
  score: number;
  keywordMatch: number;
  missingKeywords: string[];
  strengths: string[];
  issues: string[];
};
