<template>
  <div
    class="task-card group relative block p-4 rounded-xl border border-slate-200/80 dark:border-white/10 transition-all duration-300 ease-out bg-white dark:bg-[#1a1d26] hover:bg-slate-50/70 dark:hover:bg-white/5 cursor-pointer overflow-visible"
    :class="{
      'is-selected shadow-[0_16px_34px_rgba(81,98,255,0.20)] scale-[1.015] bg-sky-50/95 dark:bg-[#1f2c3f] text-slate-900 dark:text-slate-100': isActive
    }"
    @click="handleCardClick"
  >
    <span
      v-if="isActive"
      class="absolute inset-y-3 left-1 w-[3px] rounded-full bg-[var(--brand-primary)]/85 dark:bg-[var(--brand-primary)]/70 pointer-events-none"
      aria-hidden="true"
    />
    <button
      v-if="isMultiSelect"
      type="button"
      class="task-checkbox absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]/60"
      :class="isChecked
        ? 'bg-[var(--brand-primary)] text-white border-transparent shadow-[0_8px_18px_rgba(81,98,255,0.32)]'
        : 'bg-white dark:bg-[#1f2330] border-slate-200/70 dark:border-white/15 text-transparent'"
      role="checkbox"
      :aria-checked="isChecked"
      @click.stop="toggleCheckbox"
      @keydown.enter.prevent="toggleCheckbox"
      @keydown.space.prevent="toggleCheckbox"
    >
      <Check v-if="isChecked" class="w-3.5 h-3.5" />
    </button>

    <div class="flex items-center gap-3">
      <!-- 多选时的勾选框已移入卡片内，默认隐藏 -->

      <div class="flex items-center gap-3 flex-1 min-w-0">
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
            class="action-btn"
            :title="$t('taskList.details')"
            @click.stop="$emit('show-details', task.id)"
          >
            <Info class="w-4 h-4" />
          </button>
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
import { Video, Pause, Play, Trash, Folder, Check, Info } from 'lucide-vue-next';
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

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

const isActive = computed(() => props.isSelected || (props.isMultiSelect && props.isChecked));

const toggleCheckbox = () => {
  emit('toggle-check', props.task.id);
};

const handleCardClick = () => {
  if (props.isMultiSelect) {
    toggleCheckbox();
  } else {
    emit('select', props.task.id);
  }
};

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
      if (isTauri) {
        folderPath = await invoke<string>('get_desktop_path');
      } else {
        console.warn('非 Tauri 环境，无法获取桌面路径');
        return;
      }
    }
    if (isTauri) {
      await invoke('open_output_folder', { folderPath });
    } else {
      console.warn('非 Tauri 环境，无法打开本地文件夹');
    }
  } catch (error) {
    console.error('Failed to open output folder:', error);
  }
};

const handleThumbnailError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

const estimatedRemaining = computed(() => {
  const { progress, startedAt, status } = props.task;
  // 仅在 processing 且有有效进度时尝试计算剩余时间
  if (status !== 'processing' || progress == null || progress <= 0 || progress >= 100) {
    return t('taskList.statusProcessing');
  }

  // 根据 startedAt 估算处理速度（百分比/秒）
  let elapsedSec: number | null = null;
  if (startedAt) {
    try {
      const startMs = typeof startedAt === 'string' ? Date.parse(startedAt) : new Date(startedAt as unknown as Date).getTime();
      if (!Number.isNaN(startMs)) {
        elapsedSec = Math.max(1, Math.floor((Date.now() - startMs) / 1000));
      }
    } catch (_) {
      // 解析失败则回退到显示“处理中”
      elapsedSec = null;
    }
  }

  if (!elapsedSec) {
    return t('taskList.statusProcessing');
  }

  const speed = progress / elapsedSec; // 百分比/秒
  if (!speed || speed <= 0) {
    return t('taskList.statusProcessing');
  }

  const remaining = (100 - progress) / speed; // 剩余秒数
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
