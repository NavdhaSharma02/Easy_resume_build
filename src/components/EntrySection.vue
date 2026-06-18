<script setup lang="ts">
import { GripVertical, Plus, Trash2 } from "lucide-vue-next";
import type { ResumeEntry } from "../types/resume";
import { emptyEntry } from "../data/sampleResumes";

const entries = defineModel<ResumeEntry[]>({ required: true });

defineProps<{
  title: string;
  showCgpa?: boolean;
}>();

function addEntry() {
  entries.value.push(emptyEntry());
}

function removeEntry(index: number) {
  entries.value.splice(index, 1);
}

function moveEntry(index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= entries.value.length) return;
  const [item] = entries.value.splice(index, 1);
  entries.value.splice(next, 0, item);
}

const bulletsToText = (entry: ResumeEntry) => entry.bullets.join("\n");
const updateBullets = (entry: ResumeEntry, value: string) => {
  entry.bullets = value.split("\n");
};
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold">{{ title }}</h2>
      <button type="button" class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="addEntry">
        <Plus :size="15" />
        Add
      </button>
    </div>

    <div class="space-y-4">
      <div v-for="(entry, index) in entries" :key="entry.id" class="rounded-md border border-slate-200 p-3 dark:border-slate-800">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span class="inline-flex items-center gap-2 text-xs text-slate-500">
            <GripVertical :size="15" />
            Reorder
          </span>
          <div class="flex gap-2">
            <button type="button" class="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="moveEntry(index, -1)">Up</button>
            <button type="button" class="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="moveEntry(index, 1)">Down</button>
            <button type="button" class="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs text-white" @click="removeEntry(index)">
              <Trash2 :size="13" />
              Remove
            </button>
          </div>
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <input v-model="entry.title" placeholder="Title" />
          <input v-model="entry.organization" placeholder="Organization" />
          <input v-model="entry.location" placeholder="Location" />
          <input v-model="entry.dates" placeholder="Dates" />
          <div v-if="showCgpa" class="md:col-span-2">
            <label class="mb-1 block text-xs font-medium text-slate-500">GPA / CGPA</label>
            <input v-model="entry.cgpa" placeholder="e.g. 8.7/10 or 3.8/4.0" />
          </div>
        </div>
        <textarea class="mt-2" :value="bulletsToText(entry)" placeholder="Bullets, one per line" @input="updateBullets(entry, ($event.target as HTMLTextAreaElement).value)" />
      </div>
    </div>
  </section>
</template>
