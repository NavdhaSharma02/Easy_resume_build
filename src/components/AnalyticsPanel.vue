<script setup lang="ts">
import type { AtsReport } from "../types/resume";

defineProps<{
  report: AtsReport;
}>();
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-2">
    <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p class="text-sm text-slate-500">ATS score</p>
      <div class="mt-2 text-4xl font-semibold">{{ report.score }}</div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p class="text-sm text-slate-500">Keyword match</p>
      <div class="mt-2 text-4xl font-semibold">{{ report.keywordMatch }}%</div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 class="mb-2 font-semibold">Missing keywords</h3>
      <p v-if="!report.missingKeywords.length" class="text-sm text-slate-500">No missing keywords detected.</p>
      <div v-else class="flex flex-wrap gap-2">
        <span v-for="keyword in report.missingKeywords" :key="keyword" class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {{ keyword }}
        </span>
      </div>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 class="mb-2 font-semibold">Strengths</h3>
      <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <li v-for="item in report.strengths" :key="item">- {{ item }}</li>
      </ul>
    </div>
    <div class="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
      <h3 class="mb-2 font-semibold">Suggestions</h3>
      <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <li v-for="item in report.issues" :key="item">- {{ item }}</li>
      </ul>
    </div>
  </section>
</template>
