import type { AtsReport, ResumeData } from "../types/resume";

const actionVerbs = ["developed", "implemented", "optimized", "designed", "automated", "built", "improved", "reduced", "increased"];
const weakPhrases = ["worked on", "helped with", "responsible for"];

export function analyzeResume(data: ResumeData, jobDescription: string): AtsReport {
  const text = JSON.stringify(data).toLowerCase();
  const keywords = extractKeywords(jobDescription);
  const matched = keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
  const keywordMatch = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 100;
  const missingKeywords = keywords.filter((keyword) => !matched.includes(keyword)).slice(0, 8);
  const strengths: string[] = [];
  const issues: string[] = [];

  const requiredSections = [
    ["Education section present", data.education.length > 0],
    ["Skills section present", data.skills.some((group) => group.items.length)],
    ["Projects section present", data.projects.length > 0],
    ["Experience section present", data.experience.length > 0],
    ["Contact details present", Boolean(data.personal.email && data.personal.fullName)]
  ] as const;

  requiredSections.forEach(([label, ok]) => (ok ? strengths.push(label) : issues.push(label.replace("present", "missing"))));

  const verbCount = actionVerbs.filter((verb) => text.includes(verb)).length;
  const weakCount = weakPhrases.filter((phrase) => text.includes(phrase)).length;
  const quantified = (text.match(/\b\d+%?|\$\d+|\b\d+x\b/g) ?? []).length;

  if (verbCount >= 3) strengths.push("Good action verbs used");
  if (quantified >= 3) strengths.push("Strong quantified achievements");
  if (quantified < 3) issues.push("Few quantified achievements");
  if (weakCount) issues.push("Replace weak phrases with stronger accomplishment-led bullets");
  if (missingKeywords.length) issues.push("Missing relevant job-description keywords");

  const sectionScore = Math.round((requiredSections.filter(([, ok]) => ok).length / requiredSections.length) * 25);
  const impactScore = Math.max(0, Math.min(15, verbCount * 2 + quantified * 2 - weakCount * 3));
  const score = Math.min(100, 25 + sectionScore + Math.round(keywordMatch * 0.25) + impactScore + 8);

  return {
    score,
    keywordMatch,
    missingKeywords,
    strengths,
    issues
  };
}

function extractKeywords(jobDescription: string) {
  if (!jobDescription.trim()) return [];
  const stopwords = new Set(["and", "the", "for", "with", "from", "that", "this", "your", "will", "are", "you", "our"]);
  const counts = new Map<string, number>();
  jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word]) => word);
}
