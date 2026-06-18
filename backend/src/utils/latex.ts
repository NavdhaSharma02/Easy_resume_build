export const escapeLatex = (value = "") =>
  value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}");

export function sanitizeLatex(source: string) {
  return source
    .replace(/\\write18\b/gi, "")
    .replace(/\\input\b/gi, "")
    .replace(/\\include\b/gi, "")
    .replace(/\\openout\b/gi, "")
    .replace(/\\read\b/gi, "")
    .replace(/\\catcode\b/gi, "");
}
