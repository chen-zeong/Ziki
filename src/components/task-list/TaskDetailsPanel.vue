<template>
  <Transition name="fade">
    <aside
      class="fixed inset-y-0 right-0 w-[360px] bg-white dark:bg-[#151821] border-l border-slate-200/70 dark:border-white/10 shadow-xl flex flex-col z-40"
    >
      <header class="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
            {{ task.file.name }}
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ formatFileSize(task.file.size || task.originalSize) }}
          </span>
        </div>
        <button
          class="h-8 w-8 grid place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 transition-colors"
          @click="$emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ $t('taskList.status') }}
            </span>
            <StatusBadge :status="task.status" />
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p class="uppercase tracking-wide text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {{ $t('taskList.createdAt') }}
              </p>
              <p class="mt-1 text-slate-700 dark:text-slate-200">{{ formatDate(task.createdAt) }}</p>
            </div>
            <div>
              <p class="uppercase tracking-wide text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {{ $t('taskList.progress') }}
              </p>
              <p class="mt-1 text-slate-700 dark:text-slate-200">
                {{ (task.progress || 0).toFixed(1) }}%
              </p>
            </div>
          </div>
        </section>

        <section v-if="task.file.metadata" class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {{ $t('taskList.fileInfo') }}
          </h3>
          <table class="w-full text-xs text-left border-t border-slate-200/70 dark:border-white/10">
            <tbody>
              <tr v-for="item in fileInfo" :key="item.label" class="border-b border-slate-100 dark:border-white/5">
                <td class="py-2 pr-3 text-slate-400 dark:text-slate-500">{{ item.label }}</td>
                <td class="py-2 text-slate-700 dark:text-slate-200 text-right">{{ item.value }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section v-if="task.status === 'completed'" class="space-y-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {{ $t('taskList.compressionComparison') }}
          </h3>
          <CompressionSummary :task="task" />
        </section>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import type { CompressionTask } from '../../types';
import StatusBadge from './StatusBadge.vue';
import CompressionSummary from './CompressionSummary.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  task: CompressionTask;
}>();

defineEmits<{ close: [] }>();

const { t } = useI18n();

const formatFileSize = (bytes: number): string => {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (value?: string | number) => {
  if (!value) return '--';
  const date = new Date(value);
  return date.toLocaleString();
};

const fileInfo = computed(() => {
  const meta = props.task.file.metadata || {};
  return [
    { label: t('taskList.format'), value: meta.format?.toUpperCase() || '--' },
    { label: t('taskList.resolution'), value: meta.resolution || '--' },
    { label: t('taskList.frameRate'), value: meta.fps ? `${Number(meta.fps).toFixed(2)} fps` : '--' },
    { label: t('taskList.bitrate'), value: meta.bitrate || '--' },
    { label: t('taskList.duration'), value: meta.duration ? formatDuration(meta.duration) : '--' },
    { label: t('taskList.audioCodec'), value: meta.audioCodec || '--' },
    { label: t('taskList.audioSampleRate'), value: meta.sampleRate || '--' },
    { label: t('taskList.colorDepth'), value: meta.colorDepth || '--' }
  ].filter(item => item.value && item.value !== '--');
});

const formatDuration = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
