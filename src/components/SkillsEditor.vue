<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import type { SkillGroup } from "../types/resume";
import { createId } from "../data/sampleResumes";

const groups = defineModel<SkillGroup[]>({ required: true });

function addGroup() {
  groups.value.push({ id: createId(), category: "", items: [] });
}

function removeGroup(index: number) {
  groups.value.splice(index, 1);
}

const skillsToText = (group: SkillGroup) => group.items.join(", ");
const updateSkills = (group: SkillGroup, value: string) => {
  group.items = value.split(",").map((item) => item.trim()).filter(Boolean);
};
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold">Skills</h2>
      <button type="button" class="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" @click="addGroup">
        <Plus :size="15" />
        Add
      </button>
    </div>

    <div class="space-y-3">
      <div v-for="(group, index) in groups" :key="group.id" class="grid gap-2">
        <input v-model="group.category" placeholder="Category" />
        <input :value="skillsToText(group)" placeholder="Comma-separated skills" @input="updateSkills(group, ($event.target as HTMLInputElement).value)" />
        <button type="button" class="inline-flex w-fit items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white" @click="removeGroup(index)">
          <Trash2 :size="15" />
          Remove
        </button>
      </div>
    </div>
  </section>
</template>
