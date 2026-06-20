import { randomUUID } from "node:crypto";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { DEFAULT_SECTION_ORDER, type ResumeData, type ResumeEntry, type SkillGroup } from "../types/resume.js";

type ParsedSections = Partial<Record<"summary" | "education" | "experience" | "projects" | "skills" | "achievements" | "certifications" | "responsibilities" | "publications", string[]>>;
type SectionId = keyof ParsedSections;

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

const datePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*(?:-|–|to)?\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})|\d{4}\s*(?:-|–|to)\s*(?:present|current|\d{4})/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/;
const urlPattern = /(?:https?:\/\/|www\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s,)]+)?|[a-z0-9.-]+\.(?:com|dev|app|io|me|in|net|org)(?:\/[^\s,)]+)?/gi;

export async function extractResumeText(file: Express.Multer.File) {
  if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text;
    } finally {
      await parser.destroy();
    }
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
  const urls = findUrls(cleanedText);
  const github = urls.find((url) => /github\.com/i.test(url)) ?? "";
  const linkedin = urls.find((url) => /linkedin\.com\/in\//i.test(url)) ?? "";
  const leetcode = urls.find((url) => /leetcode\.com/i.test(url)) ?? "";
  const portfolio = urls.find((url) => !/github\.com|linkedin\.com|leetcode\.com/i.test(url) && !url.includes("@")) ?? "";

  return {
    summary: parseSummary(lines, sections),
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    personal: {
      fullName: parseName(lines),
      email: firstMatch(cleanedText, emailPattern),
      phone: firstMatch(contactBlock, phonePattern),
      location: "",
      links: {
        github,
        linkedin,
        portfolio,
        leetcode
      }
    },
    education: parseEntries(cleanSectionLines(sections.education ?? []), "education"),
    experience: parseEntries(cleanSectionLines(sections.experience ?? []), "experience"),
    projects: parseEntries(cleanSectionLines(sections.projects ?? [], { keepLinks: true }), "projects"),
    skills: parseSkills(cleanSectionLines(sections.skills ?? [])),
    achievements: parseEntries(cleanSectionLines(sections.achievements ?? []), "general"),
    certifications: parseEntries(cleanSectionLines(sections.certifications ?? []), "general"),
    responsibilities: parseEntries(cleanSectionLines(sections.responsibilities ?? []), "general"),
    publications: parseEntries(cleanSectionLines(sections.publications ?? [], { keepLinks: true }), "general")
  };
}

function splitSections(lines: string[]) {
  const sections: ParsedSections = {};
  let current: SectionId | undefined;

  for (const line of lines) {
    const { heading, rest } = parseHeadingLine(line);
    if (heading) {
      current = heading;
      sections[current] ??= [];
      if (rest) sections[current]?.push(rest);
      continue;
    }
    if (current) sections[current]?.push(line);
  }

  return sections;
}

function parseSummary(lines: string[], sections: ParsedSections) {
  const summary = cleanSectionLines(sections.summary ?? []).join(" ").trim();
  if (summary) return summary;

  const firstHeadingIndex = lines.findIndex((line) => Boolean(parseHeadingLine(line).heading));
  const introLines = lines.slice(1, firstHeadingIndex > 0 ? firstHeadingIndex : Math.min(lines.length, 5));
  return introLines
    .filter((line) => !isContactLine(line) && !parseHeadingLine(line).heading)
    .join(" ")
    .slice(0, 600);
}

function parseName(lines: string[]) {
  return lines.find((line) =>
    line.length <= 60 &&
    !isContactLine(line) &&
    !parseHeadingLine(line).heading &&
    /^[A-Za-z][A-Za-z\s.'-]+$/.test(line)
  ) ?? "";
}

function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0]?.trim() ?? "";
}

function parseEntries(lines: string[], kind: "education" | "experience" | "projects" | "general") {
  const blocks = kind === "education" ? groupEducationBlocks(lines) : groupBlocks(lines, kind);
  const entries = blocks.map((block) => parseEntry(block, kind)).filter((entry) => entry.title || entry.organization || entry.bullets.some(Boolean));
  return entries.length ? entries : [];
}

function groupBlocks(lines: string[], kind: "education" | "experience" | "projects" | "general") {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const isBullet = /^[-•*]\s+/.test(line);
    const cleaned = stripBullet(line);
    const startsNewBlock = current.length > 0 && !isBullet && isLikelyEntryStart(cleaned, current, kind);
    if (startsNewBlock) {
      blocks.push(current);
      current = [];
    }
    current.push(cleaned);
  }

  if (current.length) blocks.push(current);
  return blocks.length ? blocks : [lines];
}

function groupEducationBlocks(lines: string[]) {
  const meaningful = lines.map(stripBullet).filter(Boolean);
  if (!meaningful.length) return [];

  const degreeIndexes = meaningful
    .map((line, index) => isDegreeLine(line) ? index : -1)
    .filter((index) => index >= 0);

  if (degreeIndexes.length <= 1) return [meaningful];

  return degreeIndexes.map((start, index) => {
    const end = degreeIndexes[index + 1] ?? meaningful.length;
    return meaningful.slice(start, end);
  });
}

function parseEntry(block: string[], kind: "education" | "experience" | "projects" | "general"): ResumeEntry {
  const usefulLines = block.map((line) => line.trim()).filter(Boolean);
  const heading = usefulLines[0] ?? "";
  const joined = usefulLines.join(" ");
  const date = firstMatch(joined, datePattern);
  const nonBulletMeta = usefulLines.filter((line) => !isBulletLike(line) && !isLinkOnlyLine(line));
  const bulletLines = usefulLines
    .filter((line, index) => index > 0 && !isMetadataLine(line, kind))
    .map(removeInlineLinks)
    .filter(Boolean);
  const parts = splitParts(heading);

  if (kind === "education") {
    const degree = nonBulletMeta.find(isDegreeLine) ?? parts.find(isDegreeLine) ?? heading;
    const schoolLine = nonBulletMeta.find((line) => line !== degree && isInstitutionLine(line)) ?? "";
    const schoolParts = splitParts(cleanDateText(schoolLine));
    const school = schoolParts[0] ?? cleanDateText(schoolLine);
    const location = schoolParts.slice(1).join(", ");
    const cgpa = firstMatch(joined, /(?:cgpa|gpa)[:\s]*([0-9.]+(?:\/[0-9.]+)?)/i).replace(/^(?:cgpa|gpa)[:\s]*/i, "")
      || firstMatch(degree, /\b(?:10(?:\.0)?|[0-9](?:\.[0-9]{1,2})?)\b$/);
    const educationBullets = bulletLines.filter((line) => !isDegreeLine(line) && !isInstitutionLine(line) && !/(?:cgpa|gpa)[:\s]*[0-9.]+/i.test(line));
    return entry({
      title: cleanCgpaText(cleanDateText(degree)),
      organization: school,
      location,
      dates: date,
      cgpa,
      bullets: educationBullets
    });
  }

  if (kind === "projects") {
    const urls = findUrls(joined);
    const github = urls.find((url) => /github\.com/i.test(url)) ?? "";
    const live = urls.find((url) => !/github\.com|linkedin\.com|leetcode\.com/i.test(url)) ?? "";
    const techLine = usefulLines.find((line) => /tech|stack|tools|built with|technologies/i.test(line));
    const title = cleanProjectTitle(parts[0] ?? heading);
    return entry({
      title,
      organization: github,
      location: live && live !== github ? live : "",
      dates: parseTechStack(techLine, parts.slice(1)),
      bullets: bulletLines
    });
  }

  if (kind === "experience") {
    const role = nonBulletMeta.find(isRoleLine) ?? parts.find(isRoleLine) ?? parts[0] ?? heading;
    const company = nonBulletMeta.find((line) => line !== role && !datePattern.test(line)) ?? parts.find((part) => part !== role && !datePattern.test(part)) ?? "";
    return entry({
      title: cleanDateText(role),
      organization: cleanDateText(company),
      location: "",
      dates: date,
      bullets: bulletLines
    });
  }

  return entry({
    title: cleanDateText(parts[0] ?? heading),
    organization: parts[1] ?? "",
    location: "",
    dates: date,
    bullets: bulletLines
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
  const text = lines.map(stripBullet).join("\n");
  if (!text.trim()) return [];

  const groups = lines.reduce<SkillGroup[]>((result, line) => {
      const cleaned = stripBullet(line);
      const [category, rawItems] = cleaned.includes(":") ? cleaned.split(/:(.*)/).filter(Boolean) : ["Skills", cleaned];
      const items = rawItems.split(/[,|•;/]/).map((item) => item.trim()).filter((item) => item && !isContactLine(item));
      if (items.length) result.push({ id: randomUUID(), category: category.trim(), items });
      return result;
    }, []);

  if (groups.length) return groups;
  return [{
    id: randomUUID(),
    category: "Skills",
    items: text.split(/[,|•;\n]/).map((item) => item.trim()).filter(Boolean)
  }];
}

function parseHeadingLine(line: string): { heading?: SectionId; rest?: string } {
  const [candidate, ...restParts] = line.split(":");
  const normalized = normalizeHeading(candidate);
  const heading = headingMap[normalized] ?? flexibleHeading(normalized);
  return heading ? { heading, rest: restParts.join(":").trim() } : {};
}

function normalizeHeading(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function flexibleHeading(normalized: string): SectionId | undefined {
  if (normalized.length > 45) return undefined;
  if (normalized.includes("skill")) return "skills";
  if (normalized.includes("project")) return "projects";
  if (normalized.includes("education") || normalized.includes("academic")) return "education";
  if (normalized.includes("experience") || normalized.includes("employment") || normalized.includes("internship")) return "experience";
  if (normalized.includes("certification") || normalized.includes("certificate")) return "certifications";
  if (normalized.includes("achievement") || normalized.includes("award")) return "achievements";
  if (normalized.includes("responsibilit")) return "responsibilities";
  if (normalized.includes("publication")) return "publications";
  if (normalized.includes("summary") || normalized.includes("profile") || normalized.includes("objective")) return "summary";
  return undefined;
}

function findUrls(text: string) {
  return Array.from(text.matchAll(urlPattern))
    .map((match) => match[0].replace(/[.,;:]+$/, ""))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function cleanSectionLines(lines: string[], options: { keepLinks?: boolean } = {}) {
  return lines
    .map((line) => line.trim())
    .filter((line) => line && !parseHeadingLine(line).heading && (options.keepLinks || !isContactLine(line)));
}

function isContactLine(line: string) {
  return emailPattern.test(line) || phonePattern.test(line) || /github\.com|linkedin\.com|leetcode\.com|https?:\/\//i.test(line);
}

function stripBullet(line: string) {
  return line.replace(/^[-•*▪◦‣]\s*/, "").trim();
}

function isBulletLike(line: string) {
  return /^[-•*▪◦‣]\s+/.test(line);
}

function isLikelyEntryStart(line: string, current: string[], kind: "education" | "experience" | "projects" | "general") {
  if (current.length < 2) return false;
  const currentHasBullet = current.length > 2;
  const currentHasDate = current.some((item) => datePattern.test(item));
  if (kind === "projects") return currentHasBullet && !/tech|stack|tools|built with|technologies/i.test(line);
  if (kind === "education") return currentHasDate && (isDegreeLine(line) || isInstitutionLine(line));
  if (kind === "experience") return currentHasDate && (isRoleLine(line) || splitParts(line).length > 1);
  return currentHasBullet || currentHasDate;
}

function splitParts(line: string) {
  return line.split(/\s+\|\s+|\s+–\s+|\s+-\s+|,\s+/).map((part) => part.trim()).filter(Boolean);
}

function isDegreeLine(line: string) {
  return /\b(b\.?\s?tech|bachelor|master|m\.?\s?tech|b\.?e\.?|m\.?e\.?|b\.?s\.?|m\.?s\.?|ph\.?d|degree|diploma)\b/i.test(line);
}

function isInstitutionLine(line: string) {
  return /\b(university|college|institute|school|academy|vit|iit|nit)\b/i.test(line);
}

function isRoleLine(line: string) {
  return /\b(engineer|developer|intern|manager|analyst|designer|consultant|lead|associate|specialist|trainee|researcher)\b/i.test(line);
}

function isMetadataLine(line: string, kind: "education" | "experience" | "projects" | "general") {
  if (datePattern.test(line) || isLinkOnlyLine(line)) return true;
  if (kind === "education" && (isDegreeLine(line) || isInstitutionLine(line) || /(?:cgpa|gpa)[:\s]*[0-9.]+/i.test(line))) return true;
  if (kind === "projects" && /tech|stack|tools|built with|technologies/i.test(line)) return true;
  return false;
}

function isLinkOnlyLine(line: string) {
  const withoutLinks = removeInlineLinks(line).replace(/[|,;:/-]/g, "").trim();
  return findUrls(line).length > 0 && !withoutLinks;
}

function removeInlineLinks(line: string) {
  return line.replace(urlPattern, "").replace(/\s{2,}/g, " ").trim();
}

function cleanDateText(line: string) {
  return line.replace(datePattern, "").replace(/\b(?:cgpa|gpa)[:\s]*[0-9.]+(?:\/[0-9.]+)?/i, "").replace(/\s{2,}/g, " ").replace(/[|,;-]+$/, "").trim();
}

function cleanCgpaText(line: string) {
  return line.replace(/\b(?:10(?:\.0)?|[0-9](?:\.[0-9]{1,2})?)\b$/, "").trim();
}

function cleanProjectTitle(line: string) {
  return removeInlineLinks(cleanDateText(line)).replace(/\b(?:tech|stack|tools|built with|technologies)\b.*$/i, "").trim();
}

function parseTechStack(techLine = "", fallbackParts: string[]) {
  const fromLine = techLine.replace(/^(?:tech(?:nologies)?|tech stack|tools|built with)\s*[:|-]\s*/i, "").trim();
  if (fromLine && !findUrls(fromLine).length) return fromLine;
  return fallbackParts.filter((part) => !datePattern.test(part) && !findUrls(part).length).join(", ");
}
