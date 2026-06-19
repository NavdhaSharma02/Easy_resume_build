<script setup lang="ts">
import { computed, ref } from "vue";
import { Copy, Edit3, Plus, Search, Trash2 } from "lucide-vue-next";
import type { Resume } from "../types/resume";

const props = defineProps<{
  resumes: Resume[];
}>();

const emit = defineEmits<{
  create: [];
  edit: [id: string];
  duplicate: [id: string];
  delete: [id: string];
}>();

const search = ref("");

const filtered = computed(() =>
  props.resumes.filter((resume) => resume.title.toLowerCase().includes(search.value.toLowerCase()))
);
</script>

<template>
  <main class="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6">
    <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-semibold">Resumes</h1>
        <p class="text-sm text-slate-500">Create, search, edit, duplicate, and analyze tailored versions.</p>
      </div>
      <button class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 sm:w-auto" @click="emit('create')">
        <Plus :size="16" />
        Create resume
      </button>
    </div>

    <div class="mb-5 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <Search :size="16" class="text-slate-400" />
      <input v-model="search" class="border-0 bg-transparent p-0 focus:ring-0" placeholder="Search resumes" />
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="resume in filtered" :key="resume.id" class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold">{{ resume.title }}</h2>
            <p class="text-sm capitalize text-slate-500">{{ resume.template }} template</p>
          </div>
          <span class="rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            {{ resume.atsScore }}
          </span>
        </div>
        <p class="mb-4 text-sm text-slate-500">Last modified {{ new Date(resume.updatedAt).toLocaleDateString() }}</p>
        <div class="grid gap-2 sm:flex sm:flex-wrap">
          <button class="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="emit('edit', resume.id)">
            <Edit3 :size="15" />
            Edit
          </button>
          <button class="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="emit('duplicate', resume.id)">
            <Copy :size="15" />
            Duplicate
          </button>
          <button class="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white" @click="emit('delete', resume.id)">
            <Trash2 :size="15" />
            Delete
          </button>
        </div>
      </article>
    </div>

    <div v-if="!filtered.length" class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
      No resumes found.
    </div>
  </main>
</template>
