<script setup lang="ts">
import { ref } from "vue";
import { GripVertical, Plus, Trash2 } from "lucide-vue-next";
import type { ResumeEntry } from "../types/resume";
import { emptyEntry } from "../data/sampleResumes";

const entries = defineModel<ResumeEntry[]>({ required: true });
const draggingBullet = ref<{ entryId: string; index: number } | null>(null);

defineProps<{
  title: string;
  showCgpa?: boolean;
  titleLabel?: string;
  organizationLabel?: string;
  locationLabel?: string;
  datesLabel?: string;
  hideLocation?: boolean;
}>();

function addEntry() {
  entries.value.push(emptyEntry());
}

function removeEntry(index: number) {
  entries.value.splice(index, 1);
}

function addBullet(entry: ResumeEntry) {
  entry.bullets.push("");
}

function removeBullet(entry: ResumeEntry, index: number) {
  entry.bullets.splice(index, 1);
  if (!entry.bullets.length) entry.bullets.push("");
}

function moveBullet(entry: ResumeEntry, index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= entry.bullets.length) return;
  moveArrayItem(entry.bullets, index, next);
}

function moveArrayItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
}

function startBulletDrag(entry: ResumeEntry, index: number, event: PointerEvent) {
  if (entry.bullets.length < 2) return;
  event.preventDefault();
  draggingBullet.value = { entryId: entry.id, index };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", dragBullet);
  window.addEventListener("pointerup", stopBulletDrag, { once: true });
}

function dragBullet(event: PointerEvent) {
  const dragState = draggingBullet.value;
  if (!dragState) return;
  const entry = entries.value.find((item) => item.id === dragState.entryId);
  if (!entry) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-bullet-index]");
  if (target?.dataset.bulletEntryId !== entry.id) return;
  const to = Number(target.dataset.bulletIndex);
  if (!Number.isInteger(to) || to === dragState.index) return;
  moveArrayItem(entry.bullets, dragState.index, to);
  draggingBullet.value = { entryId: entry.id, index: to };
}

function stopBulletDrag() {
  draggingBullet.value = null;
  window.removeEventListener("pointermove", dragBullet);
}
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
        <div class="mb-2 flex justify-end">
          <button type="button" class="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs text-white" @click="removeEntry(index)">
            <Trash2 :size="13" />
            Remove
          </button>
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <input v-model="entry.title" :placeholder="titleLabel ?? 'Title'" />
          <input v-model="entry.organization" :placeholder="organizationLabel ?? 'Organization'" />
          <input v-if="!hideLocation" v-model="entry.location" :placeholder="locationLabel ?? 'Location'" />
          <input v-model="entry.dates" :placeholder="datesLabel ?? 'Dates, e.g. Jan 2024 - Present'" />
          <div v-if="showCgpa" class="md:col-span-2">
            <label class="mb-1 block text-xs font-medium text-slate-500">CGPA</label>
            <input v-model="entry.cgpa" placeholder="e.g. 8.7/10" />
          </div>
        </div>

        <div class="mt-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-slate-500">Bullet points</span>
            <button type="button" class="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="addBullet(entry)">
              <Plus :size="13" />
              Add bullet
            </button>
          </div>
          <div
            v-for="(_bullet, bulletIndex) in entry.bullets"
            :key="bulletIndex"
            :data-bullet-entry-id="entry.id"
            :data-bullet-index="bulletIndex"
            class="rounded-md border border-slate-200 p-2 dark:border-slate-800"
            :class="draggingBullet?.entryId === entry.id && draggingBullet.index === bulletIndex && 'border-moss bg-teal-50/40 dark:bg-teal-950/20'"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <button type="button" class="inline-flex touch-none select-none items-center gap-2 rounded px-1 py-1 text-xs text-slate-500 active:cursor-grabbing" @pointerdown="startBulletDrag(entry, bulletIndex, $event)">
                <GripVertical :size="13" />
                Bullet {{ bulletIndex + 1 }}
              </button>
              <div class="flex gap-2">
                <button type="button" class="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="moveBullet(entry, bulletIndex, -1)">Up</button>
                <button type="button" class="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700" @click="moveBullet(entry, bulletIndex, 1)">Down</button>
                <button type="button" class="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs text-white" @click="removeBullet(entry, bulletIndex)">
                  <Trash2 :size="13" />
                  Remove
                </button>
              </div>
            </div>
            <textarea v-model="entry.bullets[bulletIndex]" class="min-h-24" placeholder="Write this bullet as a short paragraph" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
