export type TemplateId = "classic" | "modern" | "compact";

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

export type Resume = {
  id: string;
  title: string;
  template: TemplateId;
  latexContent?: string;
  updatedAt: string;
  atsScore: number;
  data: ResumeData;
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
};

export type ApiResume = {
  id: string;
  title: string;
  template: "CLASSIC" | "MODERN" | "COMPACT";
  resumeData: ResumeData;
  latexContent?: string;
  updatedAt: string;
  atsReports?: Array<{ score: number }>;
};

export type AtsReport = {
  score: number;
  keywordMatch: number;
  missingKeywords: string[];
  strengths: string[];
  issues: string[];
};
