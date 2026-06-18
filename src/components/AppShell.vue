<script setup lang="ts">
import { FileText, LogOut, Moon, Sun } from "lucide-vue-next";

defineProps<{
  isDark: boolean;
  isAuthed: boolean;
  userEmail: string;
}>();

const emit = defineEmits<{
  toggleTheme: [];
  logout: [];
}>();
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3 font-semibold">
          <span class="grid h-9 w-9 place-items-center rounded-md bg-moss text-white">
            <FileText :size="18" />
          </span>
          Easy_Resume
        </div>
        <div class="flex items-center gap-2">
          <span v-if="isAuthed" class="hidden text-sm text-slate-500 sm:inline">{{ userEmail }}</span>
          <button class="rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900" @click="emit('toggleTheme')" aria-label="Toggle theme">
            <Sun v-if="isDark" :size="17" />
            <Moon v-else :size="17" />
          </button>
          <button v-if="isAuthed" class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" @click="emit('logout')">
            <LogOut :size="16" />
            Logout
          </button>
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>
