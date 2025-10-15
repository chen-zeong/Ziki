<template>
  <div
    class="task-card group block p-4 rounded-xl border transition-all duration-200 bg-white dark:bg-[#1a1d26] hover:bg-slate-50/70 dark:hover:bg-white/5 cursor-pointer"
    :class="{
      'border-[var(--brand-primary)]/60 is-selected': isSelected,
      'border-slate-200/80 dark:border-white/10': !isSelected,
      'multi-select-active': isMultiSelect
    }"
    @click="$emit('select', task.id)"
  >
    <div class="flex items-center gap-3">
      <div
        class="checkbox-wrapper flex items-center justify-center transition-all duration-300"
        :class="[
          isMultiSelect ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-4 pointer-events-none',
          isMultiSelect ? 'delay-75' : ''
        ]"
      >
        <button
          class="h-6 w-6 grid place-content-center rounded-full border border-slate-300/80 dark:border-white/15 transition-all duration-150 bg-white dark:bg-transparent"
          :class="isChecked ? 'bg-[var(--brand-primary)] border-transparent text-white shadow-sm' : 'text-transparent'"
          @click.stop="$emit('toggle-check', task.id)"
        >
          <svg
            class="h-3.5 w-3.5 text-current transition-transform duration-150"
            :class="isChecked ? 'scale-100 opacity-100' : 'scale-75 opacity-0'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
      </div>

      <div
        class="flex items-center gap-3 flex-1 min-w-0 transition-transform duration-200"
        :class="isMultiSelect ? 'translate-x-3' : 'translate-x-0'"
      >
        <div class="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 grid place-items-center border border-slate-200/70 dark:border-white/10">
          <img
            v-if="task.file.thumbnailUrl || task.type === 'image'"
            :src="task.file.thumbnailUrl || task.file.originalUrl"
            :alt="task.file.name"
            class="w-full h-full object-cover"
            @error="handleThumbnailError"
          />
          <Video v-else class="h-5 w-5 text-slate-500 dark:text-slate-300" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900 dark:text-slate-50 truncate" :title="task.file.name">{{ task.file.name }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ formatFileSize(task.file.size || task.originalSize) }}
            <span v-if="task.status === 'completed' && task.compressedSize" class="ml-2 text-slate-400 dark:text-slate-500">
              → {{ formatFileSize(task.compressedSize) }}
            </span>
          </p>
        </div>

        <button
          class="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border border-slate-200/70 dark:border-white/15 text-slate-600 dark:text-slate-200 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-colors duration-150"
          @click.stop="$emit('show-details', task.id)"
        >
          {{ $t('taskList.details') }}
        </button>
      </div>
    </div>

    <div class="mt-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <StatusBadge :status="task.status" />
          <div v-if="task.status === 'processing'" class="w-32">
            <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                class="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-200 ease-linear"
                :style="{ width: `${Math.max(task.progress || 0, 3)}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              {{ (task.progress || 0).toFixed(1) }}% · {{ estimatedRemaining }}
            </p>
          </div>
          <div v-else-if="task.status === 'completed' && task.compressedSize" class="text-[11px] text-emerald-600 dark:text-emerald-300 font-medium">
            {{ compressionSummary }}
          </div>
          <div v-else-if="task.status === 'failed'" class="text-[11px] text-rose-500 dark:text-rose-300">
            {{ failureHint }}
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-300">
          <button
            v-if="task.status === 'processing'"
            class="action-btn"
            :title="$t('taskList.pauseTask')"
            @click.stop="$emit('pause', task.id)"
          >
            <Pause class="w-4 h-4" />
          </button>
          <button
            v-else-if="task.status === 'paused' || task.status === 'queued'"
            class="action-btn"
            :title="$t('taskList.resumeTask')"
            @click.stop="$emit('resume', task.id)"
          >
            <Play class="w-4 h-4" />
          </button>
          <button
            v-if="task.status === 'completed'"
            class="action-btn"
            :title="$t('taskList.openOutputFolder')"
            @click.stop="openOutputFolder(task)"
          >
            <Folder class="w-4 h-4" />
          </button>
          <button
            class="action-btn text-rose-500 hover:text-rose-600"
            :title="$t('taskList.delete')"
            @click.stop="$emit('delete', task.id)"
          >
            <Trash class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
import { useTaskStore } from '../../stores/useTaskStore';
import StatusBadge from './StatusBadge.vue';
import { Video, Pause, Play, Trash, Folder } from 'lucide-vue-next';
import type { CompressionTask } from '../../types';

interface Props {
  task: CompressionTask;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  isChecked?: boolean;
}

interface Emits {
  (e: 'delete', taskId: string): void;
  (e: 'toggle-expand', taskId: string): void;
  (e: 'pause', taskId: string): void;
  (e: 'resume', taskId: string): void;
  (e: 'select', taskId: string): void;
  (e: 'toggle-check', taskId: string): void;
  (e: 'show-details', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();
const globalSettings = useGlobalSettingsStore();
const taskStore = useTaskStore();

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const openOutputFolder = async (task: CompressionTask) => {
  try {
    let folderPath = task.outputDirectory;
    if (!folderPath && task.file.compressedPath) {
      const path = task.file.compressedPath;
      const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      if (lastSlashIndex !== -1) {
        folderPath = path.substring(0, lastSlashIndex);
      }
    }
    if (!folderPath) {
      folderPath = await invoke<string>('get_desktop_path');
    }
    await invoke('open_output_folder', { folderPath });
  } catch (error) {
    console.error('Failed to open output folder:', error);
  }
};

const handleThumbnailError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

const estimatedRemaining = computed(() => {
  if (!props.task.speed || !props.task.progress) return t('taskList.statusProcessing');
  const remaining = (100 - props.task.progress) / (props.task.speed || 1);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} ${t('taskList.remainingShort') || ''}`;
});

const compressionSummary = computed(() => {
  if (!props.task.compressedSize || !props.task.originalSize) return t('taskList.statusCompleted');
  const change = ((props.task.originalSize - props.task.compressedSize) / props.task.originalSize) * 100;
  return `${t('taskList.compressedBy') || '减少'} ${Math.abs(change).toFixed(1)}%`;
});

const failureHint = computed(() => {
  if (!props.task.error) return t('taskList.statusFailed');
  return props.task.error.length > 28 ? `${props.task.error.slice(0, 28)}…` : props.task.error;
});
</script>

<style scoped>
.task-card-grid { display: grid; grid-template-columns: 0fr auto; transition: grid-template-columns 0.3s ease-in-out; }
.action-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  transition: color 0.15s ease, background 0.15s ease;
}
.action-btn:hover {
  background: rgba(15, 23, 42, 0.06);
}
.dark .action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
