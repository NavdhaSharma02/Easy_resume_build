import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../lib/env.js";
import { sanitizeLatex } from "../utils/latex.js";

const execFileAsync = promisify(execFile);
const dockerTimeoutMs = 10 * 60 * 1000;

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

export async function compileLatexToPdf(latexContent: string) {
  const workdir = path.join(tmpdir(), `easy-resume-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const texPath = path.join(workdir, "resume.tex");
  const pdfPath = path.join(workdir, "resume.pdf");

  await mkdir(workdir, { recursive: true });

  try {
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

    return await readFile(pdfPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LaTeX compilation error";
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
