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

    <div class="flex items-center gap-3">
      <!-- 多选时的勾选框已移入卡片内，默认隐藏 -->

      <div class="flex items-center gap-3 flex-1 min-w-0">
        <button
          v-if="isMultiSelect"
          type="button"
          class="multi-select-toggle"
          :class="{ 'is-checked': isChecked }"
          :aria-pressed="isChecked"
          @click.stop="toggleCheckbox"
        >
          <Check v-if="isChecked" class="w-3.5 h-3.5" />
        </button>

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
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <StatusBadge
            v-if="task.status !== 'processing'"
            :status="task.status"
            :progress="task.status === 'completed' ? completionProgress : null"
          />
          <div
            v-if="task.status === 'processing'"
            class="progress-wrapper flex-1 min-w-[220px] max-w-[420px]"
          >
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: normalizedProgress + '%' }"
              >
                <span class="progress-sheen"></span>
              </div>
              <div class="progress-content">
                <span class="progress-label">{{ progressLabel }}</span>
              </div>
            </div>
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
import { Video, Pause, Play, Trash, Folder, Info, Check } from 'lucide-vue-next';
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

const progressValue = computed(() => Number(props.task.progress ?? 0));
const normalizedProgress = computed(() => {
  const value = progressValue.value;
  if (value === 0) return 2;
  return Math.min(100, Math.max(value, 2));
});

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

const completionProgress = computed(() => {
  if (progressValue.value && progressValue.value > 0) {
    return `${Math.round(progressValue.value)}%`;
  }
  return '100%';
});

const progressLabel = computed(() => {
  const raw = Number.isFinite(progressValue.value) ? progressValue.value : 0;
  const clamped = Math.min(100, Math.max(raw, 0));
  const percent = clamped >= 10 ? clamped.toFixed(0) : clamped.toFixed(1);
  const eta = props.task.etaText?.trim();
  const etaDisplay = eta && eta.length ? eta : '--';
  return `${percent.replace(/\\.0$/, '')}% · ${etaDisplay}`;
});

const failureHint = computed(() => {
  if (!props.task.error) return t('taskList.statusFailed');
  return props.task.error.length > 28 ? `${props.task.error.slice(0, 28)}…` : props.task.error;
});
</script>

<style scoped>
.task-card-grid { display: grid; grid-template-columns: 0fr auto; transition: grid-template-columns 0.3s ease-in-out; }
.progress-track {
  position: relative;
  height: 28px;
  border-radius: 999px;
  overflow: hidden;
  padding: 2px;
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.24), rgba(148, 163, 184, 0.08));
  box-shadow: inset 0 1px 5px rgba(15, 23, 42, 0.12);
}
.dark .progress-track {
  background: linear-gradient(135deg, rgba(39, 48, 70, 0.65), rgba(27, 35, 54, 0.4));
  box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.45);
}
.progress-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(81, 98, 255, 0.95), rgba(37, 211, 178, 0.92));
  transition: width 0.35s ease;
  box-shadow: 0 6px 16px rgba(81, 98, 255, 0.28);
  overflow: hidden;
}
.progress-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  opacity: 0.6;
}
.progress-sheen {
  position: absolute;
  top: -40%;
  left: -30%;
  width: 45%;
  height: 180%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 70%);
  transform: rotate(18deg);
  animation: progress-sheen-move 2.8s ease-in-out infinite;
}
.progress-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.progress-label {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.015em;
  color: #0f172a;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
}
.dark .progress-label {
  color: #e2e8f0;
  text-shadow: none;
  background: rgba(15, 23, 42, 0.65);
}
@keyframes progress-sheen-move {
  0% { transform: translateX(-30%) rotate(18deg); opacity: 0.45; }
  50% { transform: translateX(160%) rotate(18deg); opacity: 0.9; }
  100% { transform: translateX(260%) rotate(18deg); opacity: 0; }
}
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
.multi-select-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1.5px solid rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.85);
  color: rgba(15, 23, 42, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 1px 3px rgba(15, 23, 42, 0.12);
  transition: all 0.2s ease;
  cursor: pointer;
}
.multi-select-toggle:hover {
  border-color: rgba(81, 98, 255, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 6px 14px rgba(81, 98, 255, 0.18);
}
.multi-select-toggle.is-checked {
  background: rgba(81, 98, 255, 0.95);
  border-color: rgba(81, 98, 255, 1);
  color: #fff;
  box-shadow: 0 8px 20px rgba(81, 98, 255, 0.28);
}
.dark .multi-select-toggle {
  background: rgba(15, 23, 42, 0.75);
  color: rgba(226, 232, 240, 0.85);
  border-color: rgba(148, 163, 184, 0.4);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.2), 0 1px 4px rgba(2, 6, 23, 0.5);
}
.dark .multi-select-toggle:hover {
  border-color: rgba(129, 140, 248, 0.8);
  box-shadow: inset 0 1px 0 rgba(226, 232, 240, 0.12), 0 8px 18px rgba(79, 70, 229, 0.32);
}
.dark .multi-select-toggle.is-checked {
  background: rgba(99, 102, 241, 0.95);
  border-color: rgba(129, 140, 248, 1);
  color: #f8fafc;
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.35);
}
</style>
