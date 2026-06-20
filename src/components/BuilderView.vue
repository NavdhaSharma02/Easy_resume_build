<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowDown, ArrowLeft, ArrowUp, Download, FileCode2, FileText, GripVertical, Wand2 } from "lucide-vue-next";
import { DEFAULT_SECTION_ORDER, type AtsReport, type Resume, type SectionId, type TemplateId } from "../types/resume";
import { analyzeResume } from "../utils/ats";
import { API_URL, apiUrl } from "../utils/api";
import { generateLatex } from "../utils/latex";
import AnalyticsPanel from "./AnalyticsPanel.vue";
import EntrySection from "./EntrySection.vue";
import SkillsEditor from "./SkillsEditor.vue";

const props = defineProps<{
  resume: Resume;
}>();

const emit = defineEmits<{
  back: [];
}>();

const activeTab = ref<"form" | "latex" | "pdf" | "analytics">("form");
const jobDescription = ref("We are looking for a TypeScript engineer with PostgreSQL, Docker, REST API, automation, and performance optimization experience.");
const report = ref<AtsReport>(analyzeResume(props.resume.data, jobDescription.value));
const isGeneratingPdf = ref(false);
const pdfError = ref("");
const pdfPreviewUrl = ref("");
const draggingSectionIndex = ref<number | null>(null);
const sectionPointerStart = ref<{ index: number; x: number; y: number } | null>(null);
const sectionLabels: Record<SectionId, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  achievements: "Achievements",
  certifications: "Certifications",
  responsibilities: "Positions of Responsibility",
  publications: "Publications"
};
const validSectionIds = new Set<string>(DEFAULT_SECTION_ORDER);

function normalizeSectionOrder(order: SectionId[] = []) {
  return [
    ...order.filter((sectionId, index) => validSectionIds.has(sectionId) && order.indexOf(sectionId) === index),
    ...DEFAULT_SECTION_ORDER.filter((sectionId) => !order.includes(sectionId))
  ];
}

props.resume.data.sectionOrder = normalizeSectionOrder(props.resume.data.sectionOrder);

const latex = computed(() => generateLatex(props.resume.data, props.resume.template));
const orderedSections = computed(() => props.resume.data.sectionOrder ?? DEFAULT_SECTION_ORDER);

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
    const response = await fetch(apiUrl("/api/pdf/generate"), {
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
    const message = error instanceof Error ? error.message : "PDF generation failed";
    pdfError.value = message === "Load failed" || message === "Failed to fetch"
      ? `Could not reach the backend at ${API_URL}. Check VITE_API_URL on the frontend and CLIENT_URL on the backend.`
      : message;
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

function moveSection(from: number, to: number) {
  const order = props.resume.data.sectionOrder ?? DEFAULT_SECTION_ORDER;
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
  const reordered = [...order];
  const [sectionId] = reordered.splice(from, 1);
  reordered.splice(to, 0, sectionId);
  props.resume.data.sectionOrder = reordered;
}

function startSectionDrag(index: number, event: DragEvent) {
  draggingSectionIndex.value = index;
  event.dataTransfer?.setData("text/plain", String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function dragOverSection(index: number, event: DragEvent) {
  event.preventDefault();
  const from = draggingSectionIndex.value;
  if (from === null || from === index) return;
  moveSection(from, index);
  draggingSectionIndex.value = index;
}

function dropSection(index: number, event: DragEvent) {
  event.preventDefault();
  const from = draggingSectionIndex.value ?? Number(event.dataTransfer?.getData("text/plain"));
  if (Number.isInteger(from)) moveSection(from, index);
  draggingSectionIndex.value = null;
}

function stopSectionDrag() {
  draggingSectionIndex.value = null;
}

function startSectionPointerDrag(index: number, event: PointerEvent) {
  sectionPointerStart.value = { index, x: event.clientX, y: event.clientY };
  draggingSectionIndex.value = index;
  window.addEventListener("pointermove", moveSectionPointerDrag, { passive: false });
  window.addEventListener("pointerup", stopSectionPointerDrag, { once: true });
}

function moveSectionPointerDrag(event: PointerEvent) {
  const start = sectionPointerStart.value;
  if (!start) return;
  const moved = Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y);
  if (moved < 8) return;
  event.preventDefault();
  const from = draggingSectionIndex.value;
  if (from === null) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-section-index]");
  const to = Number(target?.dataset.sectionIndex);
  if (!Number.isInteger(to) || to === from) return;
  moveSection(from, to);
  draggingSectionIndex.value = to;
}

function stopSectionPointerDrag() {
  sectionPointerStart.value = null;
  draggingSectionIndex.value = null;
  window.removeEventListener("pointermove", moveSectionPointerDrag);
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6">
    <div class="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <div>
        <button class="mb-2 inline-flex items-center gap-2 text-sm text-moss" @click="emit('back')">
          <ArrowLeft :size="15" />
          Back to dashboard
        </button>
        <input v-model="resume.title" class="block max-w-full border-0 bg-transparent p-0 text-xl font-semibold focus:ring-0 sm:max-w-xl sm:text-2xl" />
      </div>
      <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
        <select v-model="resume.template" class="col-span-2 sm:col-span-1 sm:w-auto">
          <option value="classic">Classic</option>
          <option value="modern">Modern</option>
          <option value="compact">Compact</option>
        </select>
        <button class="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="activeTab = 'latex'">
          <FileCode2 :size="16" />
          LaTeX
        </button>
        <button class="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="downloadTex">
          <Download :size="16" />
          .tex
        </button>
        <button class="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1" :disabled="isGeneratingPdf" @click="activeTab = 'pdf'">
          <FileText :size="16" />
          PDF
        </button>
      </div>
    </div>

    <div class="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      <button v-for="tab in ['form', 'latex', 'pdf', 'analytics']" :key="tab" class="shrink-0 px-3 py-2 text-sm capitalize" :class="activeTab === tab ? 'border-b-2 border-moss text-moss' : 'text-slate-500'" @click="activeTab = tab as 'form' | 'latex' | 'pdf' | 'analytics'">
        {{ tab }}
      </button>
    </div>

    <div v-if="activeTab === 'form'" class="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div class="space-y-5">
        <section class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <h2 class="mb-3 font-semibold">Personal Information</h2>
          <div class="grid gap-3 md:grid-cols-2">
            <input v-model="resume.data.personal.fullName" placeholder="Full name" />
            <input v-model="resume.data.personal.email" placeholder="Email" />
            <input v-model="resume.data.personal.phone" placeholder="Phone" />
            <input v-model="resume.data.personal.location" placeholder="Location" />
          </div>
        </section>

        <div
          v-for="(sectionId, index) in orderedSections"
          :key="sectionId"
          :data-section-index="index"
          class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2"
          :class="draggingSectionIndex === index && 'opacity-80'"
          @dragover="dragOverSection(index, $event)"
          @drop="dropSection(index, $event)"
        >
          <div class="flex flex-col items-center gap-2 pt-3">
            <button
              type="button"
              draggable="true"
              class="inline-flex h-9 w-9 touch-none cursor-grab select-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900"
              :class="draggingSectionIndex === index && 'border-moss text-moss'"
              :aria-label="`Drag ${sectionLabels[sectionId]} section`"
              @pointerdown="startSectionPointerDrag(index, $event)"
              @dragstart="startSectionDrag(index, $event)"
              @dragend="stopSectionDrag"
            >
              <GripVertical :size="17" />
            </button>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900"
              :disabled="index === 0"
              :aria-label="`Move ${sectionLabels[sectionId]} section up`"
              @pointerdown.stop
              @click="moveSection(index, index - 1)"
            >
              <ArrowUp :size="15" />
            </button>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900"
              :disabled="index === orderedSections.length - 1"
              :aria-label="`Move ${sectionLabels[sectionId]} section down`"
              @pointerdown.stop
              @click="moveSection(index, index + 1)"
            >
              <ArrowDown :size="15" />
            </button>
          </div>

          <section v-if="sectionId === 'summary'" class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <h2 class="mb-3 font-semibold">Summary</h2>
            <textarea v-model="resume.data.summary" class="min-h-28" placeholder="Brief professional summary" />
          </section>
          <EntrySection v-else-if="sectionId === 'education'" v-model="resume.data.education" title="Education" title-label="Degree" show-cgpa />
          <EntrySection v-else-if="sectionId === 'experience'" v-model="resume.data.experience" title="Experience" title-label="Job role" hide-location />
          <EntrySection v-else-if="sectionId === 'projects'" v-model="resume.data.projects" title="Projects" organization-label="GitHub link" location-label="Live site URL" dates-label="Tech used" />
          <SkillsEditor v-else-if="sectionId === 'skills'" v-model="resume.data.skills" />
          <EntrySection v-else-if="sectionId === 'achievements'" v-model="resume.data.achievements" title="Achievements" />
          <EntrySection v-else-if="sectionId === 'certifications'" v-model="resume.data.certifications" title="Certifications" />
          <EntrySection v-else-if="sectionId === 'responsibilities'" v-model="resume.data.responsibilities" title="Positions of Responsibility" />
          <EntrySection v-else-if="sectionId === 'publications'" v-model="resume.data.publications" title="Publications" title-label="Publication link" hide-organization hide-location hide-dates />
        </div>
      </div>

      <aside class="order-first space-y-5 lg:order-none">
        <section class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <h2 class="mb-3 font-semibold">Section Order</h2>
          <div class="space-y-2">
            <div
              v-for="(sectionId, index) in orderedSections"
              :key="sectionId"
              :data-section-index="index"
              class="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-2 text-sm dark:border-slate-800"
              :class="draggingSectionIndex === index && 'border-moss bg-teal-50/60 dark:bg-teal-950/20'"
              @dragover="dragOverSection(index, $event)"
              @drop="dropSection(index, $event)"
            >
              <button
                type="button"
                draggable="true"
                class="inline-flex h-8 w-8 shrink-0 touch-none cursor-grab select-none items-center justify-center rounded text-slate-500 active:cursor-grabbing"
                :aria-label="`Drag ${sectionLabels[sectionId]} section`"
                @pointerdown="startSectionPointerDrag(index, $event)"
                @dragstart="startSectionDrag(index, $event)"
                @dragend="stopSectionDrag"
              >
                <GripVertical :size="16" />
              </button>
              <span class="min-w-0 flex-1 truncate">{{ sectionLabels[sectionId] }}</span>
              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800"
                :disabled="index === 0"
                :aria-label="`Move ${sectionLabels[sectionId]} section up`"
                @pointerdown.stop
                @click="moveSection(index, index - 1)"
              >
                <ArrowUp :size="14" />
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800"
                :disabled="index === orderedSections.length - 1"
                :aria-label="`Move ${sectionLabels[sectionId]} section down`"
                @pointerdown.stop
                @click="moveSection(index, index + 1)"
              >
                <ArrowDown :size="14" />
              </button>
            </div>
          </div>
        </section>
        <section class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
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

    <section v-else-if="activeTab === 'latex'" class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold">Generated LaTeX</h2>
        <button class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="downloadTex">
          <Download :size="16" />
          Download .tex
        </button>
      </div>
      <textarea class="min-h-[520px] font-mono text-xs leading-5 sm:min-h-[620px]" :value="latex" readonly />
    </section>

    <section v-else-if="activeTab === 'pdf'" class="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
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

      <div class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <h2 class="mb-2 font-semibold">PDF Preview</h2>
        <iframe
          v-if="pdfPreviewUrl"
          :src="pdfPreviewUrl"
          title="Resume PDF preview"
          class="h-[70vh] w-full rounded-md border border-slate-300 bg-white dark:border-slate-700 sm:h-[620px]"
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
