import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PDFParse } from "pdf-parse";
import { env } from "../lib/env.js";
import { sanitizeLatex } from "../utils/latex.js";

const execFileAsync = promisify(execFile);
const dockerTimeoutMs = 10 * 60 * 1000;

type CompiledPdf = {
  pdf: Buffer;
  pageCount: number;
};

function summarizeLatexError(log: string, fallback: string) {
  const bangIndex = log.indexOf("\n!");
  if (bangIndex >= 0) {
    return log.slice(bangIndex + 1, bangIndex + 900).trim();
  }

  const fatalIndex = log.toLowerCase().indexOf("fatal error");
  if (fatalIndex >= 0) {
    return log.slice(fatalIndex, fatalIndex + 900).trim();
  }

  return log.trim().slice(-1200) || fallback;
}

function compactResumeLatex(latexContent: string, level: "compact" | "ultra") {
  const settings = level === "compact"
    ? {
        lineSpread: "0.91",
        sideMargin: "-0.72in",
        textWidth: "1.44in",
        topMargin: "-.72in",
        textHeight: "1.44in",
        bodySize: "\\fontsize{8.8pt}{9.9pt}\\selectfont",
        bulletLeftMargin: "0.12in"
      }
    : {
        lineSpread: "0.86",
        sideMargin: "-0.78in",
        textWidth: "1.56in",
        topMargin: "-.78in",
        textHeight: "1.56in",
        bodySize: "\\fontsize{8.1pt}{9.2pt}\\selectfont",
        bulletLeftMargin: "0.1in"
      };

  return latexContent
    .replace(/\\documentclass\[letterpaper,[^\]]+\]\{article\}/, "\\documentclass[letterpaper,10pt]{article}")
    .replace(/\\linespread\{[^}]+\}/, `\\linespread{${settings.lineSpread}}`)
    .replace(/\\addtolength\{\\oddsidemargin\}\{[^}]+\}/, `\\addtolength{\\oddsidemargin}{${settings.sideMargin}}`)
    .replace(/\\addtolength\{\\textwidth\}\{[^}]+\}/, `\\addtolength{\\textwidth}{${settings.textWidth}}`)
    .replace(/\\addtolength\{\\topmargin\}\{[^}]+\}/, `\\addtolength{\\topmargin}{${settings.topMargin}}`)
    .replace(/\\addtolength\{\\textheight\}\{[^}]+\}/, `\\addtolength{\\textheight}{${settings.textHeight}}`)
    .replace(/\\begin\{document\}\s*(?:\\(?:small|footnotesize|scriptsize|fontsize\{[^}]+\}\{[^}]+\}\\selectfont)\s*)?/, `\\begin{document}\n${settings.bodySize}\n`)
    .replaceAll("\\Huge", "\\LARGE")
    .replaceAll("\\large", "\\normalsize")
    .replace(/\\begin\{itemize\}\[(?:leftmargin=[^,\]]+,\s*)?itemsep=0pt/g, `\\begin{itemize}[leftmargin=${settings.bulletLeftMargin}, itemsep=0pt`);
}

function forceOnePageLatex(latexContent: string) {
  const beginDocument = "\\begin{document}";
  const endDocument = "\\end{document}";
  const beginIndex = latexContent.indexOf(beginDocument);
  const endIndex = latexContent.lastIndexOf(endDocument);

  if (beginIndex < 0 || endIndex < 0 || endIndex <= beginIndex) {
    return latexContent;
  }

  const preamble = latexContent.slice(0, beginIndex);
  const body = latexContent.slice(beginIndex + beginDocument.length, endIndex).trim();
  const tail = latexContent.slice(endIndex);
  const packagePreamble = [
    preamble,
    preamble.includes("\\usepackage{adjustbox}") ? "" : "\\usepackage{adjustbox}\n"
  ].join("");

  return `${packagePreamble}${beginDocument}
\\noindent\\begin{adjustbox}{max totalsize={\\textwidth}{\\textheight},center}
\\begin{minipage}{\\textwidth}
${body}
\\end{minipage}
\\end{adjustbox}
${tail}`;
}

async function countPdfPages(pdf: Buffer) {
  const parser = new PDFParse({ data: pdf });

  try {
    const info = await parser.getInfo();
    return info.total;
  } finally {
    await parser.destroy();
  }
}

async function runLatex(texPath: string, pdfPath: string, workdir: string, latexContent: string): Promise<CompiledPdf> {
  await writeFile(texPath, sanitizeLatex(latexContent), "utf8");
  if (env.PDF_ENGINE === "local") {
    await execFileAsync("pdflatex", ["-interaction=nonstopmode", "-halt-on-error", "resume.tex"], {
      cwd: workdir,
      timeout: dockerTimeoutMs
    });
  } else {
    await execFileAsync(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--cpus",
        "1",
        "--memory",
        "1g",
        "-v",
        `${workdir}:/work`,
        "-w",
        "/work",
        env.LATEX_DOCKER_IMAGE,
        "pdflatex",
        "-interaction=nonstopmode",
        "-halt-on-error",
        "resume.tex"
      ],
      { timeout: dockerTimeoutMs }
    );
  }

  const pdf = await readFile(pdfPath);
  return {
    pdf,
    pageCount: await countPdfPages(pdf)
  };
}

export async function compileLatexToPdf(latexContent: string) {
  const workdir = path.join(tmpdir(), `easy-resume-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const texPath = path.join(workdir, "resume.tex");
  const pdfPath = path.join(workdir, "resume.pdf");

  await mkdir(workdir, { recursive: true });

  try {
    const attempts = [
      latexContent,
      compactResumeLatex(latexContent, "compact"),
      forceOnePageLatex(compactResumeLatex(latexContent, "compact")),
      forceOnePageLatex(compactResumeLatex(latexContent, "ultra"))
    ];
    let lastPageCount = 0;

    for (const attempt of attempts) {
      const { pdf, pageCount } = await runLatex(texPath, pdfPath, workdir, attempt);
      if (pageCount === 1) {
        return pdf;
      }
      lastPageCount = pageCount;
    }

    throw new Error(`PDF generation failed. Resume output must be exactly one page, but generated ${lastPageCount} pages.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LaTeX compilation error";
    if (message.startsWith("PDF generation failed.")) {
      throw error;
    }

    const stderr = typeof error === "object" && error && "stderr" in error ? String(error.stderr) : "";
    const stdout = typeof error === "object" && error && "stdout" in error ? String(error.stdout) : "";
    const log = await readFile(path.join(workdir, "resume.log"), "utf8").catch(() => "");
    const firstPullHint = message.includes("Pulling fs layer")
      ? "Docker is still downloading the LaTeX image. Try again after the pull finishes, or run docker pull texlive/texlive:latest once."
      : summarizeLatexError(log || stderr || stdout, message);
    throw new Error(`PDF generation failed. ${firstPullHint}`);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
