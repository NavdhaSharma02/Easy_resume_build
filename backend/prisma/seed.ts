import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";
import { generateLatex } from "../src/templates/latex.js";
import { DEFAULT_SECTION_ORDER, type ResumeData, type TemplateId } from "../src/types/resume.js";

const prisma = new PrismaClient();

const softwareEngineerData: ResumeData = {
  summary: "Software engineer focused on TypeScript, backend systems, and ATS-friendly automation. Experienced in building performant APIs, data-driven dashboards, and production-ready resume tooling.",
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  personal: {
    fullName: "Aarav Mehta",
    email: "aarav@example.com",
    phone: "+1 555 010 2026",
    location: "San Francisco, CA",
    links: {
      github: "github.com/aarav",
      linkedin: "linkedin.com/in/aarav",
      portfolio: "aarav.dev",
      leetcode: "leetcode.com/aarav"
    }
  },
  education: [
    {
      id: "edu-1",
      title: "B.S. Computer Science",
      organization: "State University",
      location: "California",
      dates: "2020 - 2024",
      cgpa: "3.8/4.0",
      bullets: ["Coursework in databases, algorithms, and distributed systems"]
    }
  ],
  experience: [
    {
      id: "exp-1",
      title: "Software Engineer Intern",
      organization: "Acme Labs",
      location: "",
      dates: "May 2025 - Aug 2025",
      bullets: ["Developed TypeScript services that reduced API response time by 32%", "Implemented PostgreSQL indexes and improved dashboard load time by 41%"]
    }
  ],
  projects: [
    {
      id: "proj-1",
      title: "Resume Intelligence Platform",
      organization: "github.com/aarav/resume-intelligence",
      location: "resume-intelligence.aarav.dev",
      dates: "Vue, TypeScript, Node.js, Prisma, PostgreSQL",
      bullets: ["Designed an ATS scoring engine with keyword extraction and actionable feedback", "Automated LaTeX generation for three ATS-friendly resume templates"]
    }
  ],
  skills: [
    { id: "skill-1", category: "Languages", items: ["TypeScript", "Python", "SQL", "C++"] },
    { id: "skill-2", category: "Frameworks", items: ["Vue", "React", "Node.js", "Prisma"] },
    { id: "skill-3", category: "Tools", items: ["PostgreSQL", "Docker", "Git", "Linux"] }
  ],
  achievements: [],
  certifications: [],
  responsibilities: [],
  publications: []
};

const samples: Array<{ title: string; template: TemplateId; data: ResumeData }> = [
  { title: "Software Engineer Resume", template: "classic", data: softwareEngineerData },
  {
    title: "Data Science Resume",
    template: "modern",
    data: {
      ...softwareEngineerData,
      personal: { ...softwareEngineerData.personal, fullName: "Maya Rao", email: "maya@example.com" },
      skills: [
        { id: "skill-data-1", category: "Data", items: ["Python", "Pandas", "scikit-learn", "SQL", "Tableau"] },
        { id: "skill-data-2", category: "ML", items: ["Regression", "Classification", "Feature Engineering"] }
      ]
    }
  }
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@easyresume.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@easyresume.dev",
      password: await hashPassword("password123")
    }
  });

  await prisma.resume.deleteMany({ where: { userId: user.id } });

  for (const sample of samples) {
    await prisma.resume.create({
      data: {
        userId: user.id,
        title: sample.title,
        template: sample.template.toUpperCase() as "CLASSIC" | "MODERN" | "COMPACT",
        resumeData: sample.data,
        latexContent: generateLatex(sample.data, sample.template)
      }
    });
  }
}

main().finally(async () => prisma.$disconnect());
