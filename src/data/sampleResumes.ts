import type { Resume, ResumeData } from "../types/resume";

export const createId = () => crypto.randomUUID();

export const emptyEntry = () => ({
  id: createId(),
  title: "",
  organization: "",
  location: "",
  dates: "",
  cgpa: "",
  bullets: [""]
});

export const blankResumeData = (): ResumeData => ({
  summary: "",
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    links: {
      github: "",
      linkedin: "",
      portfolio: "",
      leetcode: ""
    }
  },
  education: [emptyEntry()],
  experience: [emptyEntry()],
  projects: [emptyEntry()],
  skills: [{ id: createId(), category: "Languages", items: ["TypeScript", "Python", "SQL"] }],
  achievements: [],
  certifications: [],
  responsibilities: [],
  publications: []
});

const softwareEngineerData: ResumeData = {
  summary: "Software engineer focused on TypeScript, backend systems, and ATS-friendly automation. Experienced in building performant APIs, data-driven dashboards, and production-ready resume tooling.",
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
      id: createId(),
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
      id: createId(),
      title: "Software Engineer Intern",
      organization: "Acme Labs",
      location: "Backend Engineering",
      dates: "May 2025 - Aug 2025",
      bullets: [
        "Developed TypeScript services that reduced API response time by 32%",
        "Implemented PostgreSQL indexes and improved dashboard load time by 41%"
      ]
    }
  ],
  projects: [
    {
      id: createId(),
      title: "Resume Intelligence Platform",
      organization: "github.com/aarav/resume-intelligence",
      location: "resume-intelligence.aarav.dev",
      dates: "2026",
      bullets: [
        "Designed an ATS scoring engine with keyword extraction and actionable feedback",
        "Automated LaTeX generation for three ATS-friendly resume templates"
      ]
    }
  ],
  skills: [
    { id: createId(), category: "Languages", items: ["TypeScript", "Python", "SQL", "C++"] },
    { id: createId(), category: "Frameworks", items: ["Vue", "React", "Node.js", "Prisma"] },
    { id: createId(), category: "Tools", items: ["PostgreSQL", "Docker", "Git", "Linux"] }
  ],
  achievements: [
    { id: createId(), title: "Hackathon Finalist", organization: "Build Sprint", location: "", dates: "2025", bullets: ["Built a working prototype in 24 hours with a team of 4"] }
  ],
  certifications: [],
  responsibilities: [],
  publications: []
};

export const sampleResumes: Resume[] = [
  {
    id: createId(),
    title: "Software Engineer Resume",
    template: "classic",
    updatedAt: new Date().toISOString(),
    atsScore: 86,
    data: softwareEngineerData
  },
  {
    id: createId(),
    title: "Data Science Resume",
    template: "modern",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    atsScore: 78,
    data: {
      ...softwareEngineerData,
      personal: { ...softwareEngineerData.personal, fullName: "Maya Rao", email: "maya@example.com" },
      skills: [
        { id: createId(), category: "Data", items: ["Python", "Pandas", "scikit-learn", "SQL", "Tableau"] },
        { id: createId(), category: "ML", items: ["Regression", "Classification", "Feature Engineering"] }
      ]
    }
  }
];
