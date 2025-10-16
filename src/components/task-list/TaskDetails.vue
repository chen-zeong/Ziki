<template>
  <Teleport to="body">
    <Transition name="task-detail-pop">
      <div v-if="isVisible" class="fixed inset-0 z-[1100]">
        <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" @click="$emit('close')" />
        <div class="absolute inset-0 flex items-start justify-center pt-24 px-4">
          <div
            class="w-full max-w-lg rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#121726] shadow-[0_24px_60px_rgba(15,23,42,0.28)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.65)] overflow-hidden"
            @click.stop
          >
            <header class="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm">
              <div class="min-w-0">
                <p class="text-base font-semibold text-slate-900 dark:text-slate-50 truncate">
                  {{ task?.file.name }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {{ formatFileSize(task?.file.size || task?.originalSize) }}
                </p>
              </div>
              <button
                class="h-8 w-8 grid place-items-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                @click="$emit('close')"
              >
                <X class="w-4 h-4" />
              </button>
            </header>

            <div class="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
              <section class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {{ $t('taskList.statusLabel') }}
                  </p>
                  <p class="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    {{ statusLabel }}
                  </p>
                </div>
                <StatusBadge v-if="task" :status="task.status" />
              </section>

              <section class="grid grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-200">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {{ $t('taskList.createdAt') }}
                  </p>
                  <p class="mt-1">{{ formatDate(task?.createdAt) }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {{ $t('taskList.updatedAt') }}
                  </p>
                  <p class="mt-1">{{ formatDate(task?.updatedAt) }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {{ $t('taskList.progress') }}
                  </p>
                  <p class="mt-1">{{ ((task?.progress ?? 0) as number).toFixed(1) }}%</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {{ $t('taskList.remaining') }}
                  </p>
                  <p class="mt-1">{{ task?.etaText || '--' }}</p>
                </div>
              </section>

              <section v-if="metadataRows.length" class="space-y-2">
                <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {{ $t('taskList.fileInfo') }}
                </h3>
                <ul class="space-y-2 text-sm">
                  <li
                    v-for="item in metadataRows"
                    :key="item.label"
                    class="flex items-center justify-between rounded-lg bg-slate-100/60 dark:bg-white/5 px-3 py-2"
                  >
                    <span class="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-[0.16em]">
                      {{ item.label }}
                    </span>
                    <span class="text-slate-800 dark:text-slate-100 text-sm font-medium">
                      {{ item.value }}
                    </span>
                  </li>
                </ul>
              </section>

              <section v-if="showComparison" class="space-y-3">
                <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {{ $t('taskList.compressionComparison') }}
                </h3>
                <CompressionSummary v-if="task" :task="task" />
              </section>

              <section v-if="task?.errorMessage" class="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200/70 dark:border-rose-500/40 px-4 py-3 text-sm text-rose-600 dark:text-rose-200">
                <p class="font-semibold text-xs uppercase tracking-widest">{{ $t('taskList.statusFailed') }}</p>
                <p class="mt-1 leading-relaxed">{{ task.errorMessage }}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { CompressionTask } from '../../types';
import StatusBadge from './StatusBadge.vue';
import CompressionSummary from './CompressionSummary.vue';

const props = defineProps<{
  open: boolean;
  task: CompressionTask | null;
}>();

defineEmits<{ close: [] }>();

const { t } = useI18n();

const task = computed(() => props.task);
const isVisible = computed(() => props.open && !!task.value);

const showComparison = computed(() => task.value?.status === 'completed' && !!task.value.file.metadata);

const statusLabel = computed(() => {
  if (!task.value) return '--';
  const statusKey = `taskList.status${task.value.status.charAt(0).toUpperCase()}${task.value.status.slice(1)}`;
  return t(statusKey, task.value.status);
});

const metadataRows = computed(() => {
  const meta = task.value?.file.metadata;
  if (!meta) return [];
  return [
    { label: t('taskList.format'), value: meta.format?.toUpperCase() },
    { label: t('taskList.resolution'), value: meta.resolution },
    { label: t('taskList.frameRate'), value: meta.fps ? `${Number(meta.fps).toFixed(2)} fps` : undefined },
    { label: t('taskList.bitrate'), value: meta.bitrate },
    { label: t('taskList.duration'), value: meta.duration ? formatDuration(meta.duration) : undefined },
    { label: t('taskList.audioCodec'), value: meta.audioCodec },
    { label: t('taskList.audioSampleRate'), value: meta.sampleRate },
    { label: t('taskList.colorDepth'), value: meta.colorDepth }
  ].filter(item => item.value);
});

const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (value?: string | number | Date | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

const formatDuration = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.task-detail-pop-enter-active,
.task-detail-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.task-detail-pop-enter-from,
.task-detail-pop-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
