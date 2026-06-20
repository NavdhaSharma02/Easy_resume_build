import { DEFAULT_SECTION_ORDER, type ResumeData, type ResumeEntry, type SectionId, type SkillGroup, type TemplateId } from "../types/resume";

const escapeLatex = (value: string) =>
  value
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}");

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

const publicationHeading = (item: ResumeEntry) => {
  const link = item.title.trim();
  const title = link ? `\\href{${latexText(normalizeUrl(link))}}{\\texttt{${latexText(link)}}}` : "\\textbf{Publication}";
  return `      \\resumeProjectHeading
          {${title}}{}
${resumeItems(item.bullets)}`;
};

const publicationSection = (entries: ResumeEntry[]) =>
  entries.length
    ? section(
        "Publications",
        `  \\resumeSubHeadingListStart
${entries.map(publicationHeading).join("\n\n")}
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

const validSectionIds = new Set<string>(DEFAULT_SECTION_ORDER);

const orderedSectionIds = (order: SectionId[] = []) => [
  ...order.filter((sectionId, index) => validSectionIds.has(sectionId) && order.indexOf(sectionId) === index),
  ...DEFAULT_SECTION_ORDER.filter((sectionId) => !order.includes(sectionId))
];

const resumeSection = (sectionId: SectionId, data: ResumeData) => {
  switch (sectionId) {
    case "summary":
      return summarySection(data.summary);
    case "experience":
      return subheadingSection("Experience", data.experience, { hideLocation: true });
    case "projects":
      return projectSection("Projects", data.projects);
    case "education":
      return subheadingSection("Education", data.education, { showCgpa: true });
    case "skills":
      return skillsSection(data.skills);
    case "achievements":
      return projectSection("Achievements", data.achievements);
    case "certifications":
      return projectSection("Certifications", data.certifications);
    case "responsibilities":
      return projectSection("Positions of Responsibility", data.responsibilities);
    case "publications":
      return publicationSection(data.publications);
  }
};

const resumeSections = (data: ResumeData) =>
  orderedSectionIds(data.sectionOrder).map((sectionId) => resumeSection(sectionId, data)).filter(Boolean).join("\n\n");

const headerLinks = (data: ResumeData) => {
  const iconLink = (value: string, icon: string) =>
    value ? `\\href{${latexText(normalizeUrl(value))}}{${icon}}` : "";

  const links = [
    iconLink(data.personal.links.github, "\\faGithub"),
    iconLink(data.personal.links.linkedin, "\\faLinkedin"),
    iconLink(data.personal.links.portfolio, "\\faGlobe"),
    iconLink(data.personal.links.leetcode, "\\faCode")
  ].filter(Boolean);

  const contact = [
    data.personal.phone ? `\\faPhone* \\texttt{${latexText(data.personal.phone)}}` : "",
    data.personal.email ? `\\href{mailto:${latexText(data.personal.email)}}{\\faEnvelope}` : "",
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

  return `%-------------------------
% Resume in Latex
% Template adapted for Easy_Resume
% Based off of: https://github.com/jakeryang/resume
% License : MIT
%------------------------

\\documentclass[letterpaper,10pt]{article}

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

\\linespread{0.94}

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

\\addtolength{\\oddsidemargin}{-0.65in}
\\addtolength{\\evensidemargin}{0in}
\\addtolength{\\textwidth}{1.3in}
\\addtolength{\\topmargin}{-.7in}
\\addtolength{\\textheight}{1.35in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\setlength{\\parskip}{0pt}
\\setlength{\\parsep}{0pt}
\\sloppy
\\emergencystretch=2em

\\titleformat {\\section}{
    \\bfseries \\vspace{-4pt} \\raggedright \\normalsize
}{}{0em}{}[\\color{light-grey} {\\titlerule[1pt]} \\vspace{-9pt}]

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-4pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-4pt}\\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & {\\color{dark-grey}\\small #2}\\vspace{-1pt}\\\\
      \\textit{#3} & {\\color{dark-grey} \\small #4}\\\\
    \\end{tabular*}\\vspace{-8pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
      #1 & {\\color{dark-grey}\\small #2} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0in, label={}, itemsep=0pt, topsep=0pt, parsep=0pt, partopsep=0pt]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[itemsep=0pt, topsep=0pt, parsep=0pt, partopsep=0pt]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-6pt}}

\\color{text-grey}

\\begin{document}
\\small

%----------HEADING----------
\\begin{center}
    \\textbf{\\Large ${latexText(data.personal.fullName || "Your Name")}} \\\\ \\vspace{1pt}
${headerContactLine(data)}
\\end{center}

${resumeSections(data)}

\\end{document}`;
}
