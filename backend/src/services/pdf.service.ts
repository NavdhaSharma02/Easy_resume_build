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

type FontScaleLevel = "slight" | "compact" | "tight" | "ultra";

function fontSizeCommand(size: number, leading: number) {
  return `\\fontsize{${size}pt}{${leading}pt}\\selectfont`;
}

function scaleResumeFonts(latexContent: string, level: FontScaleLevel) {
  const settings = {
    slight: {
      documentSize: "10pt",
      huge: fontSizeCommand(22, 24),
      large: fontSizeCommand(14, 16),
      section: fontSizeCommand(11, 13),
      normal: fontSizeCommand(10, 12),
      small: fontSizeCommand(9, 10.5),
      body: fontSizeCommand(9.6, 11.2)
    },
    compact: {
      documentSize: "10pt",
      huge: fontSizeCommand(20, 22),
      large: fontSizeCommand(13, 15),
      section: fontSizeCommand(10.5, 12.5),
      normal: fontSizeCommand(9.5, 11.2),
      small: fontSizeCommand(8.5, 9.8),
      body: fontSizeCommand(9.1, 10.6)
    },
    tight: {
      documentSize: "10pt",
      huge: fontSizeCommand(18, 20),
      large: fontSizeCommand(12, 14),
      section: fontSizeCommand(10, 12),
      normal: fontSizeCommand(9, 10.5),
      small: fontSizeCommand(8, 9.2),
      body: fontSizeCommand(8.6, 10)
    },
    ultra: {
      documentSize: "10pt",
      huge: fontSizeCommand(16, 18),
      large: fontSizeCommand(11, 13),
      section: fontSizeCommand(9.5, 11.2),
      normal: fontSizeCommand(8.5, 9.8),
      small: fontSizeCommand(7.6, 8.8),
      body: fontSizeCommand(8.1, 9.4)
    }
  }[level];

  return latexContent
    .replace(/\\documentclass\[letterpaper,[^\]]+\]\{article\}/, `\\documentclass[letterpaper,${settings.documentSize}]{article}`)
    .replace(/\\begin\{document\}\s*(?:\\(?:small|footnotesize|scriptsize|fontsize\{[^}]+\}\{[^}]+\}\\selectfont)\s*)?/, `\\begin{document}\n${settings.body}\n`)
    .replaceAll("\\Huge", settings.huge)
    .replaceAll("\\LARGE", settings.large)
    .replaceAll("\\large", settings.section)
    .replaceAll("\\normalsize", settings.normal)
    .replaceAll("\\small", settings.small);
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
      scaleResumeFonts(latexContent, "slight"),
      scaleResumeFonts(latexContent, "compact"),
      scaleResumeFonts(latexContent, "tight"),
      scaleResumeFonts(latexContent, "ultra"),
      forceOnePageLatex(scaleResumeFonts(latexContent, "ultra"))
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
