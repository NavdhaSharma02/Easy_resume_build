<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import AppShell from "./components/AppShell.vue";
import AuthScreen from "./components/AuthScreen.vue";
import BuilderView from "./components/BuilderView.vue";
import DashboardView from "./components/DashboardView.vue";
import { blankResumeData, createId, sampleResumes } from "./data/sampleResumes";
import type { Resume } from "./types/resume";

const isDark = ref(false);
const user = ref<{ name: string; email: string } | null>(null);
const resumes = ref<Resume[]>(structuredClone(sampleResumes));
const activeResumeId = ref<string | null>(null);

const activeResume = computed(() => resumes.value.find((resume) => resume.id === activeResumeId.value) ?? null);

watchEffect(() => {
  document.documentElement.classList.toggle("dark", isDark.value);
});

function createResume() {
  const resume: Resume = {
    id: createId(),
    title: "Untitled Resume",
    template: "classic",
    updatedAt: new Date().toISOString(),
    atsScore: 72,
    data: blankResumeData()
  };
  resumes.value.unshift(resume);
  activeResumeId.value = resume.id;
}

function duplicateResume(id: string) {
  const source = resumes.value.find((resume) => resume.id === id);
  if (!source) return;
  const copy: Resume = {
    ...structuredClone(source),
    id: createId(),
    title: `${source.title} Copy`,
    updatedAt: new Date().toISOString()
  };
  resumes.value.unshift(copy);
}

function deleteResume(id: string) {
  resumes.value = resumes.value.filter((resume) => resume.id !== id);
}

function saveResume(updated: Resume) {
  const index = resumes.value.findIndex((resume) => resume.id === updated.id);
  if (index >= 0) resumes.value[index] = structuredClone(updated);
}
</script>

<template>
  <AppShell :is-dark="isDark" :is-authed="Boolean(user)" :user-email="user?.email ?? ''" @toggle-theme="isDark = !isDark" @logout="user = null">
    <AuthScreen v-if="!user" @authenticated="user = $event" />
    <BuilderView v-else-if="activeResume" :resume="activeResume" @back="activeResumeId = null" @save="saveResume" />
    <DashboardView v-else :resumes="resumes" @create="createResume" @edit="activeResumeId = $event" @duplicate="duplicateResume" @delete="deleteResume" />
  </AppShell>
</template>
