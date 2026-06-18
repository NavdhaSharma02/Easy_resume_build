<script setup lang="ts">
import { ref } from "vue";
import { FileText } from "lucide-vue-next";

const emit = defineEmits<{
  authenticated: [{ name: string; email: string }];
}>();

const mode = ref<"login" | "signup">("login");
const name = ref("");
const email = ref("demo@easyresume.dev");
const password = ref("password123");

function submit() {
  emit("authenticated", {
    name: name.value || "Demo User",
    email: email.value
  });
}
</script>

<template>
  <main class="grid min-h-[calc(100vh-66px)] place-items-center px-4">
    <form class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900" @submit.prevent="submit">
      <div class="mb-6 flex items-center gap-3">
        <span class="grid h-11 w-11 place-items-center rounded-md bg-moss text-white">
          <FileText />
        </span>
        <div>
          <h1 class="text-xl font-semibold">Easy_Resume</h1>
          <p class="text-sm text-slate-500">ATS-friendly LaTeX resume builder</p>
        </div>
      </div>

      <div class="mb-4 grid grid-cols-2 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
        <button type="button" class="rounded px-3 py-2 text-sm" :class="mode === 'login' && 'bg-white shadow dark:bg-slate-950'" @click="mode = 'login'">Login</button>
        <button type="button" class="rounded px-3 py-2 text-sm" :class="mode === 'signup' && 'bg-white shadow dark:bg-slate-950'" @click="mode = 'signup'">Sign up</button>
      </div>

      <input v-if="mode === 'signup'" v-model="name" class="mb-3" placeholder="Name" required />
      <input v-model="email" class="mb-3" type="email" placeholder="Email" required />
      <input v-model="password" class="mb-4" type="password" placeholder="Password" minlength="8" required />

      <button class="w-full rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">
        {{ mode === "signup" ? "Create account" : "Login" }}
      </button>
      <p class="mt-4 text-xs text-slate-500">Use your account or the seeded demo login after backend setup.</p>
    </form>
  </main>
</template>
