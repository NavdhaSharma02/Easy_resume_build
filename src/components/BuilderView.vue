<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowLeft, Download, FileCode2, FileText, Save, Wand2 } from "lucide-vue-next";
import type { AtsReport, Resume, TemplateId } from "../types/resume";
import { analyzeResume } from "../utils/ats";
import { generateLatex } from "../utils/latex";
import AnalyticsPanel from "./AnalyticsPanel.vue";
import EntrySection from "./EntrySection.vue";
import SkillsEditor from "./SkillsEditor.vue";

const props = defineProps<{
  resume: Resume;
}>();

const emit = defineEmits<{
  back: [];
  save: [resume: Resume];
}>();

const activeTab = ref<"form" | "latex" | "pdf" | "analytics">("form");
const jobDescription = ref("We are looking for a TypeScript engineer with PostgreSQL, Docker, REST API, automation, and performance optimization experience.");
const report = ref<AtsReport>(analyzeResume(props.resume.data, jobDescription.value));
const isGeneratingPdf = ref(false);
const pdfError = ref("");
const pdfPreviewUrl = ref("");

const latex = computed(() => generateLatex(props.resume.data, props.resume.template));

function saveResume() {
  props.resume.updatedAt = new Date().toISOString();
  props.resume.atsScore = report.value.score;
  emit("save", props.resume);
}

function analyze() {
  report.value = analyzeResume(props.resume.data, jobDescription.value);
  props.resume.atsScore = report.value.score;
  activeTab.value = "analytics";
}

function downloadTex() {
  const blob = new Blob([latex.value], { type: "text/x-tex" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${props.resume.title || "resume"}.tex`;
  link.click();
  URL.revokeObjectURL(url);
}

async function generatePdf() {
  isGeneratingPdf.value = true;
  pdfError.value = "";

  try {
    const response = await fetch("http://127.0.0.1:4000/api/pdf/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latexContent: latex.value })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "PDF generation failed" }));
      throw new Error(error.message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = url;
    activeTab.value = "pdf";
  } catch (error) {
    pdfError.value = error instanceof Error ? error.message : "PDF generation failed";
    activeTab.value = "pdf";
  } finally {
    isGeneratingPdf.value = false;
  }
}

function downloadPdf() {
  if (!pdfPreviewUrl.value) return;
  const link = document.createElement("a");
  link.href = pdfPreviewUrl.value;
  link.download = `${props.resume.title || "resume"}.pdf`;
  link.click();
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6">
    <div class="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <div>
        <button class="mb-2 inline-flex items-center gap-2 text-sm text-moss" @click="emit('back')">
          <ArrowLeft :size="15" />
          Back to dashboard
        </button>
        <input v-model="resume.title" class="block max-w-xl border-0 bg-transparent p-0 text-2xl font-semibold focus:ring-0" />
      </div>
      <div class="flex flex-wrap gap-2">
        <select v-model="resume.template">
          <option value="classic">Classic</option>
          <option value="modern">Modern</option>
          <option value="compact">Compact</option>
        </select>
        <button class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="saveResume">
          <Save :size="16" />
          Save
        </button>
        <button class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="activeTab = 'latex'">
          <FileCode2 :size="16" />
          LaTeX
        </button>
        <button class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="downloadTex">
          <Download :size="16" />
          .tex
        </button>
        <button class="inline-flex items-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isGeneratingPdf" @click="activeTab = 'pdf'">
          <FileText :size="16" />
          PDF
        </button>
      </div>
    </div>

    <div class="mb-5 flex gap-2 border-b border-slate-200 dark:border-slate-800">
      <button v-for="tab in ['form', 'latex', 'pdf', 'analytics']" :key="tab" class="px-3 py-2 text-sm capitalize" :class="activeTab === tab ? 'border-b-2 border-moss text-moss' : 'text-slate-500'" @click="activeTab = tab as 'form' | 'latex' | 'pdf' | 'analytics'">
        {{ tab }}
      </button>
    </div>

    <div v-if="activeTab === 'form'" class="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div class="space-y-5">
        <section class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 class="mb-3 font-semibold">Personal Information</h2>
          <div class="grid gap-3 md:grid-cols-2">
            <input v-model="resume.data.personal.fullName" placeholder="Full name" />
            <input v-model="resume.data.personal.email" placeholder="Email" />
            <input v-model="resume.data.personal.phone" placeholder="Phone" />
            <input v-model="resume.data.personal.location" placeholder="Location" />
          </div>
        </section>

        <EntrySection v-model="resume.data.education" title="Education" show-cgpa />
        <EntrySection v-model="resume.data.experience" title="Experience" />
        <EntrySection v-model="resume.data.projects" title="Projects" />
        <EntrySection v-model="resume.data.achievements" title="Achievements" />
        <EntrySection v-model="resume.data.certifications" title="Certifications" />
        <EntrySection v-model="resume.data.responsibilities" title="Positions of Responsibility" />
        <EntrySection v-model="resume.data.publications" title="Publications" />
      </div>

      <aside class="space-y-5">
        <SkillsEditor v-model="resume.data.skills" />
        <section class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 class="mb-3 font-semibold">Links</h2>
          <div class="space-y-2">
            <input v-model="resume.data.personal.links.github" placeholder="GitHub" />
            <input v-model="resume.data.personal.links.linkedin" placeholder="LinkedIn" />
            <input v-model="resume.data.personal.links.portfolio" placeholder="Portfolio" />
            <input v-model="resume.data.personal.links.leetcode" placeholder="LeetCode" />
          </div>
        </section>
      </aside>
    </div>

    <section v-else-if="activeTab === 'latex'" class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold">Generated LaTeX</h2>
        <button class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="downloadTex">
          <Download :size="16" />
          Download .tex
        </button>
      </div>
      <textarea class="min-h-[620px] font-mono text-xs leading-5" :value="latex" readonly />
    </section>

    <section v-else-if="activeTab === 'pdf'" class="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="mb-2 font-semibold">PDF</h2>
        <p class="mb-4 text-sm text-slate-500">Compile the current resume into a PDF and preview it here.</p>
        <button class="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isGeneratingPdf" @click="generatePdf">
          <FileText :size="16" />
          {{ isGeneratingPdf ? "Generating PDF..." : pdfPreviewUrl ? "Regenerate PDF" : "Generate PDF" }}
        </button>
        <button class="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700" :disabled="!pdfPreviewUrl" @click="downloadPdf">
          <Download :size="16" />
          Download PDF
        </button>
        <div v-if="pdfError" class="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {{ pdfError }}
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="mb-2 font-semibold">PDF Preview</h2>
        <iframe
          v-if="pdfPreviewUrl"
          :src="pdfPreviewUrl"
          title="Resume PDF preview"
          class="h-[620px] w-full rounded-md border border-slate-300 bg-white dark:border-slate-700"
        />
        <div v-else class="grid aspect-[8.5/11] place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          Click Generate PDF to compile and download the current LaTeX.
        </div>
      </div>
    </section>

    <section v-else class="space-y-4">
      <textarea v-model="jobDescription" class="min-h-32" placeholder="Paste a job description for keyword matching" />
      <button class="inline-flex items-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-teal-800" @click="analyze">
        <Wand2 :size="16" />
        Analyze ATS compatibility
      </button>
      <AnalyticsPanel :report="report" />
    </section>
  </main>
</template>
