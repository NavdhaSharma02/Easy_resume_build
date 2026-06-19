import { randomUUID } from "node:crypto";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { DEFAULT_SECTION_ORDER, type ResumeData, type ResumeEntry, type SkillGroup } from "../types/resume.js";

type ParsedSections = Partial<Record<"summary" | "education" | "experience" | "projects" | "skills" | "achievements" | "certifications" | "responsibilities" | "publications", string[]>>;

const headingMap: Record<string, keyof ParsedSections> = {
  summary: "summary",
  profile: "summary",
  objective: "summary",
  education: "education",
  academics: "education",
  experience: "experience",
  "work experience": "experience",
  employment: "experience",
  internships: "experience",
  projects: "projects",
  skills: "skills",
  "technical skills": "skills",
  achievements: "achievements",
  awards: "achievements",
  certifications: "certifications",
  certificates: "certifications",
  responsibilities: "responsibilities",
  "positions of responsibility": "responsibilities",
  publications: "publications"
};

const datePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*(?:-|–|to)\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})|\d{4}\s*(?:-|–|to)\s*(?:present|current|\d{4})/i;

export async function extractResumeText(file: Express.Multer.File) {
  if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text;
  }

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.originalname.toLowerCase().endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value;
  }

  if (file.mimetype.startsWith("text/") || file.originalname.toLowerCase().endsWith(".txt")) {
    return file.buffer.toString("utf8");
  }

  throw new Error("Upload a PDF, DOCX, or TXT resume");
}

export function parseResumeText(text: string): ResumeData {
  const cleanedText = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections = splitSections(lines);
  const contactBlock = lines.slice(0, Math.min(lines.length, 12)).join(" ");

  return {
    summary: parseSummary(lines, sections),
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    personal: {
      fullName: parseName(lines),
      email: firstMatch(cleanedText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i),
      phone: firstMatch(contactBlock, /(?:\+?\d[\d\s().-]{7,}\d)/),
      location: "",
      links: {
        github: firstMatch(cleanedText, /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i),
        linkedin: firstMatch(cleanedText, /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_.-]+/i),
        portfolio: firstMatch(cleanedText, /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.(?:dev|me|io|app|com)(?:\/[^\s]*)?/i),
        leetcode: firstMatch(cleanedText, /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/[A-Za-z0-9_.-]+/i)
      }
    },
    education: parseEntries(sections.education ?? [], "education"),
    experience: parseEntries(sections.experience ?? [], "experience"),
    projects: parseEntries(sections.projects ?? [], "projects"),
    skills: parseSkills(sections.skills ?? []),
    achievements: parseEntries(sections.achievements ?? [], "general"),
    certifications: parseEntries(sections.certifications ?? [], "general"),
    responsibilities: parseEntries(sections.responsibilities ?? [], "general"),
    publications: parseEntries(sections.publications ?? [], "general")
  };
}

function splitSections(lines: string[]) {
  const sections: ParsedSections = {};
  let current: keyof ParsedSections | undefined;

  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[:|]/g, "").trim();
    const heading = headingMap[normalized];
    if (heading) {
      current = heading;
      sections[current] ??= [];
      continue;
    }
    if (current) sections[current]?.push(line);
  }

  return sections;
}

function parseSummary(lines: string[], sections: ParsedSections) {
  const summary = sections.summary?.join(" ").trim();
  if (summary) return summary;

  const firstHeadingIndex = lines.findIndex((line) => headingMap[line.toLowerCase().replace(/[:|]/g, "").trim()]);
  const introLines = lines.slice(1, firstHeadingIndex > 0 ? firstHeadingIndex : Math.min(lines.length, 5));
  return introLines
    .filter((line) => !line.includes("@") && !/github|linkedin|leetcode|https?:\/\//i.test(line) && !/\+?\d[\d\s().-]{7,}\d/.test(line))
    .join(" ")
    .slice(0, 600);
}

function parseName(lines: string[]) {
  return lines.find((line) =>
    line.length <= 60 &&
    !line.includes("@") &&
    !/github|linkedin|leetcode|https?:\/\//i.test(line) &&
    !/\+?\d[\d\s().-]{7,}\d/.test(line) &&
    !headingMap[line.toLowerCase().replace(/[:|]/g, "").trim()]
  ) ?? "";
}

function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0]?.trim() ?? "";
}

function parseEntries(lines: string[], kind: "education" | "experience" | "projects" | "general") {
  const blocks = groupBlocks(lines);
  const entries = blocks.map((block) => parseEntry(block, kind)).filter((entry) => entry.title || entry.organization || entry.bullets.some(Boolean));
  return entries.length ? entries : [];
}

function groupBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const isBullet = /^[-•*]\s+/.test(line);
    const startsNewBlock = current.length > 0 && !isBullet && (datePattern.test(line) || current.some((item) => datePattern.test(item)));
    if (startsNewBlock) {
      blocks.push(current);
      current = [];
    }
    current.push(line.replace(/^[-•*]\s+/, ""));
  }

  if (current.length) blocks.push(current);
  return blocks.length ? blocks : [lines];
}

function parseEntry(block: string[], kind: "education" | "experience" | "projects" | "general"): ResumeEntry {
  const heading = block[0] ?? "";
  const date = block.map((line) => line.match(datePattern)?.[0]).find(Boolean) ?? "";
  const bullets = block.slice(1).filter((line) => line !== date && !datePattern.test(line));
  const parts = heading.split(/\s+\|\s+| - | – |, /).map((part) => part.trim()).filter(Boolean);

  if (kind === "education") {
    return entry({
      title: parts[0] ?? heading,
      organization: parts[1] ?? "",
      location: parts[2] ?? "",
      dates: date,
      cgpa: firstMatch(block.join(" "), /(?:cgpa|gpa)[:\s]*([0-9.]+(?:\/[0-9.]+)?)/i).replace(/^(?:cgpa|gpa)[:\s]*/i, ""),
      bullets
    });
  }

  if (kind === "projects") {
    const github = firstMatch(block.join(" "), /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.\/-]+/i);
    const live = firstMatch(block.join(" "), /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.(?:dev|me|io|app|com)(?:\/[^\s]*)?/i);
    return entry({
      title: parts[0] ?? heading,
      organization: github,
      location: live && live !== github ? live : "",
      dates: parts.slice(1).join(", "),
      bullets
    });
  }

  return entry({
    title: parts[0] ?? heading,
    organization: parts[1] ?? "",
    location: "",
    dates: date,
    bullets
  });
}

function entry(values: Omit<ResumeEntry, "id">): ResumeEntry {
  return {
    id: randomUUID(),
    title: values.title ?? "",
    organization: values.organization ?? "",
    location: values.location ?? "",
    dates: values.dates ?? "",
    cgpa: values.cgpa ?? "",
    bullets: values.bullets.length ? values.bullets : [""]
  };
}

function parseSkills(lines: string[]): SkillGroup[] {
  const text = lines.join("\n");
  if (!text.trim()) return [];

  const groups = lines
    .map((line) => {
      const [category, rawItems] = line.includes(":") ? line.split(/:(.*)/).filter(Boolean) : ["Skills", line];
      const items = rawItems.split(/[,|•]/).map((item) => item.trim()).filter(Boolean);
      return items.length ? { id: randomUUID(), category: category.trim(), items } : undefined;
    })
    .filter((group): group is SkillGroup => Boolean(group));

  if (groups.length) return groups;
  return [{
    id: randomUUID(),
    category: "Skills",
    items: text.split(/[,|•\n]/).map((item) => item.trim()).filter(Boolean)
  }];
}
