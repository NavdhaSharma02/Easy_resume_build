<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from "vue";
import AppShell from "./components/AppShell.vue";
import AuthScreen from "./components/AuthScreen.vue";
import BuilderView from "./components/BuilderView.vue";
import DashboardView from "./components/DashboardView.vue";
import { blankResumeData } from "./data/sampleResumes";
import type { ApiResume, ApiUser, Resume, TemplateId } from "./types/resume";
import { apiRequest, tokenStorageKey, userStorageKey } from "./utils/api";

const isDark = ref(false);
const user = ref<ApiUser | null>(null);
const resumes = ref<Resume[]>([]);
const activeResumeId = ref<string | null>(null);
const appError = ref("");
const isLoading = ref(false);

const activeResume = computed(() => resumes.value.find((resume) => resume.id === activeResumeId.value) ?? null);

watchEffect(() => {
  document.documentElement.classList.toggle("dark", isDark.value);
});

onMounted(() => {
  const savedUser = localStorage.getItem(userStorageKey);
  if (savedUser && localStorage.getItem(tokenStorageKey)) {
    user.value = JSON.parse(savedUser);
    loadResumes();
  }
});

function fromApiResume(resume: ApiResume): Resume {
  return {
    id: resume.id,
    title: resume.title,
    template: resume.template.toLowerCase() as TemplateId,
    latexContent: resume.latexContent,
    updatedAt: resume.updatedAt,
    atsScore: resume.atsReports?.[0]?.score ?? 0,
    data: { ...resume.resumeData, summary: resume.resumeData.summary ?? "" }
  };
}

async function authenticate(payload: { mode: "login" | "signup"; name: string; email: string; password: string }) {
  appError.value = "";
  try {
    const result = await apiRequest<{ token: string; user: ApiUser }>(`/api/auth/${payload.mode}`, {
      method: "POST",
      body: JSON.stringify(payload.mode === "signup"
        ? { name: payload.name, email: payload.email, password: payload.password }
        : { email: payload.email, password: payload.password })
    });
    localStorage.setItem(tokenStorageKey, result.token);
    localStorage.setItem(userStorageKey, JSON.stringify(result.user));
    user.value = result.user;
    await loadResumes();
  } catch (error) {
    appError.value = error instanceof Error ? error.message : "Authentication failed";
  }
}

async function loadResumes() {
  isLoading.value = true;
  appError.value = "";
  try {
    const result = await apiRequest<ApiResume[]>("/api/resumes");
    resumes.value = result.map(fromApiResume);
  } catch (error) {
    appError.value = error instanceof Error ? error.message : "Could not load resumes";
  } finally {
    isLoading.value = false;
  }
}

async function createResume() {
  const created = await apiRequest<ApiResume>("/api/resumes", {
    method: "POST",
    body: JSON.stringify({ title: "Untitled Resume", template: "classic", resumeData: blankResumeData() })
  });
  const resume = fromApiResume(created);
  resumes.value.unshift(resume);
  activeResumeId.value = resume.id;
}

async function duplicateResume(id: string) {
  const copy = await apiRequest<ApiResume>(`/api/resumes/${id}/duplicate`, { method: "POST" });
  resumes.value.unshift(fromApiResume(copy));
}

async function deleteResume(id: string) {
  await apiRequest<void>(`/api/resumes/${id}`, { method: "DELETE" });
  resumes.value = resumes.value.filter((resume) => resume.id !== id);
}

async function saveResume(updated: Resume) {
  const saved = await apiRequest<ApiResume>(`/api/resumes/${updated.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: updated.title,
      template: updated.template,
      resumeData: updated.data,
      latexContent: updated.latexContent
    })
  });
  const index = resumes.value.findIndex((resume) => resume.id === updated.id);
  if (index >= 0) resumes.value[index] = fromApiResume(saved);
}

function logout() {
  localStorage.removeItem(tokenStorageKey);
  localStorage.removeItem(userStorageKey);
  user.value = null;
  resumes.value = [];
  activeResumeId.value = null;
}
</script>

<template>
  <AppShell :is-dark="isDark" :is-authed="Boolean(user)" :user-email="user?.email ?? ''" @toggle-theme="isDark = !isDark" @logout="logout">
    <div v-if="appError" class="mx-auto mt-4 max-w-7xl px-4">
      <div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        {{ appError }}
      </div>
    </div>
    <AuthScreen v-if="!user" @authenticated="authenticate" />
    <main v-else-if="isLoading" class="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-500">Loading resumes...</main>
    <BuilderView v-else-if="activeResume" :resume="activeResume" @back="activeResumeId = null" @save="saveResume" />
    <DashboardView v-else :resumes="resumes" @create="createResume" @edit="activeResumeId = $event" @duplicate="duplicateResume" @delete="deleteResume" />
  </AppShell>
</template>
