import type { ResumeData, ResumeEntry, SkillGroup, TemplateId } from "../types/resume.js";
import { escapeLatex, sanitizeLatex } from "../utils/latex.js";

const latexText = (value = "") => escapeLatex(value);
const latexParagraph = (value = "") => latexText(value.replace(/\s*\n+\s*/g, " "));

const resumeItems = (items: string[]) =>
  items.filter(Boolean).length
    ? `      \\resumeItemListStart
${items.filter(Boolean).map((item) => `        \\resumeItem{${latexParagraph(item)}}`).join("\n")}
      \\resumeItemListEnd`
    : "";

const subheading = (item: ResumeEntry, options: { showCgpa?: boolean; hideLocation?: boolean } = {}) => {
  const title = item.organization || item.title || "Organization";
  const role = item.title || item.organization || "Role";
  const locationParts = [options.hideLocation ? "" : item.location, options.showCgpa && item.cgpa ? `CGPA: ${item.cgpa}` : ""].filter(Boolean);
  return `    \\resumeSubheading
      {${latexText(title)}}{${latexText(item.dates)}}
      {${latexText(role)}}{${latexText(locationParts.join(" | "))}}
${resumeItems(item.bullets)}`;
};

const projectHeading = (item: ResumeEntry) => `      \\resumeProjectHeading
          {\\textbf{${latexText(item.title || item.organization || "Project")}}}{}
${projectTechStack(item)}
${projectLinks(item)}
${resumeItems(item.bullets)}`;

const projectTechStack = (item: ResumeEntry) =>
  item.dates ? `      \\small{\\textit{${latexText(item.dates)}}}\\\\[-1pt]` : "";

const normalizeUrl = (value: string) => /^https?:\/\//i.test(value) ? value : `https://${value}`;

const projectLink = (value: string, label: string) =>
  value ? `\\href{${latexText(normalizeUrl(value))}}{\\texttt{${latexText(label)}}}` : "";

const projectLinks = (item: ResumeEntry) => {
  const links = [
    projectLink(item.organization, "GitHub"),
    projectLink(item.location, "Live")
  ].filter(Boolean);

  return links.length ? `      \\small{${links.join(" $|$ ")}}\\vspace{-3pt}` : "";
};

const section = (title: string, body: string) =>
  body.trim()
    ? `%-----------${title.toUpperCase()}-----------
\\section{${latexText(title.toUpperCase())}}
${body}`
    : "";

const summarySection = (summary = "") =>
  summary.trim()
    ? section("Summary", `  \\small{${latexText(summary)}}`)
    : "";

const subheadingSection = (title: string, entries: ResumeEntry[], options: { showCgpa?: boolean; hideLocation?: boolean } = {}) =>
  entries.length
    ? section(
        title,
        `  \\resumeSubHeadingListStart
${entries.map((item) => subheading(item, options)).join("\n\n")}
  \\resumeSubHeadingListEnd`
      )
    : "";

const projectSection = (title: string, entries: ResumeEntry[]) =>
  entries.length
    ? section(
        title,
        `  \\resumeSubHeadingListStart
${entries.map(projectHeading).join("\n\n")}
  \\resumeSubHeadingListEnd`
      )
    : "";

const skillsSection = (groups: SkillGroup[]) => {
  const rows = groups
    .filter((group) => group.category || group.items.length)
    .map((group) => `     \\textbf{${latexText(group.category)}} {: ${group.items.map(latexText).join(", ")}}\\vspace{2pt} \\\\`)
    .join("\n");

  return rows.trim()
    ? section(
        "Skills",
        ` \\begin{itemize}[leftmargin=0in, label={}]
    \\small{\\item{
${rows}
    }}
 \\end{itemize}`
      )
    : "";
};

const headerLinks = (data: ResumeData) => {
  const links = [
    data.personal.links.github ? `\\hspace{1pt} \\faGithub \\hspace{2pt} \\texttt{${latexText(data.personal.links.github)}}` : "",
    data.personal.links.linkedin ? `\\hspace{1pt} \\faLinkedin \\hspace{2pt} \\texttt{${latexText(data.personal.links.linkedin)}}` : "",
    data.personal.links.portfolio ? `\\hspace{1pt} \\faGlobe \\hspace{2pt} \\texttt{${latexText(data.personal.links.portfolio)}}` : ""
  ].filter(Boolean);

  const contact = [
    data.personal.phone ? `\\faPhone* \\texttt{${latexText(data.personal.phone)}}` : "",
    data.personal.email ? `\\faEnvelope \\hspace{2pt} \\texttt{${latexText(data.personal.email)}}` : "",
    ...links,
    data.personal.location ? `\\faMapMarker* \\hspace{2pt}\\texttt{${latexText(data.personal.location)}}` : ""
  ].filter(Boolean);

  return contact.join(" \\hspace{1pt} $|$ ");
};

const headerContactLine = (data: ResumeData) => {
  const contact = headerLinks(data);
  return contact ? `    \\small ${contact}\n    \\\\ \\vspace{-3pt}` : "    \\vspace{-8pt}";
};

export function generateLatex(data: ResumeData, template: TemplateId) {
  void template;

  return sanitizeLatex(`%-------------------------
% Resume in Latex
% Template adapted for Easy_Resume
% Based off of: https://github.com/jakeryang/resume
% License : MIT
%------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}

\\definecolor{light-grey}{gray}{0.83}
\\definecolor{dark-grey}{gray}{0.3}
\\definecolor{text-grey}{gray}{.08}

\\DeclareRobustCommand{\\ebseries}{\\fontseries{eb}\\selectfont}
\\DeclareTextFontCommand{\\texteb}{\\ebseries}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{0in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat {\\section}{
    \\bfseries \\vspace{2pt} \\raggedright \\large
}{}{0em}{}[\\color{light-grey} {\\titlerule[2pt]} \\vspace{-4pt}]

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-1pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & {\\color{dark-grey}\\small #2}\\vspace{1pt}\\\\
      \\textit{#3} & {\\color{dark-grey} \\small #4}\\\\
    \\end{tabular*}\\vspace{-4pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
      #1 & {\\color{dark-grey}\\small #2} \\\\
    \\end{tabular*}\\vspace{-1pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{0pt}}

\\color{text-grey}

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge ${latexText(data.personal.fullName || "Your Name")}} \\\\ \\vspace{5pt}
${headerContactLine(data)}
\\end{center}

${summarySection(data.summary)}

${subheadingSection("Experience", data.experience, { hideLocation: true })}

${projectSection("Projects", data.projects)}

${subheadingSection("Education", data.education, { showCgpa: true })}

${skillsSection(data.skills)}

${projectSection("Achievements", data.achievements)}

${projectSection("Certifications", data.certifications)}

${projectSection("Positions of Responsibility", data.responsibilities)}

${projectSection("Publications", data.publications)}

\\end{document}`);
}
