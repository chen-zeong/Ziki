<template>
  <MotionCard
    class="task-card group relative block rounded-2xl border px-4 py-3 transition-colors duration-300 ease-out cursor-pointer overflow-visible backdrop-blur"
    :class="[
      cardToneClass,
      {
        'is-selected ring-1 ring-[var(--brand-primary)]/20 text-slate-900/95 dark:text-slate-100': isActive
      }
    ]"
    :variants="cardVariants"
    :animate="cardState"
    :initial="false"
    :transition="cardTransition"
    @click="handleCardClick"
    @mouseenter="handleHover(true)"
    @mouseleave="handleHover(false)"
  >
    <div class="flex items-center gap-3">
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
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <StatusBadge
            v-if="task.status !== 'processing'"
            :status="task.status"
            :progress="task.status === 'completed' ? completionProgress : null"
          />
          <div
            v-if="task.status === 'processing'"
            class="progress-wrapper flex-none w-full max-w-[260px]"
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
            v-if="task.status !== 'processing'"
            class="action-btn"
            :title="$t('taskList.details')"
            @click.stop="handleDetailClick"
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
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </MotionCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
import { useTaskStore } from '../../stores/useTaskStore';
import StatusBadge from './StatusBadge.vue';
import { Video, Pause, Play, Folder, Info, X } from 'lucide-vue-next';
import { motion } from 'motion-v';
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
  (e: 'show-details', payload: { taskId: string; trigger: HTMLElement | null }): void;
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
const isHovering = ref(false);
const MotionCard = motion.div;

const cardVariants = {
  rest: { y: 0, scale: 1, opacity: 1 },
  hover: { y: -4, scale: 1.01, opacity: 1 },
  active: { y: -6, scale: 1.015, opacity: 1 }
} as const;

const cardTransition = {
  type: 'spring',
  stiffness: 340,
  damping: 28,
  mass: 0.65
};

const cardToneClass = computed(() => {
  if (isActive.value) return 'task-card--active';
  if (isHovering.value) return 'task-card--hover';
  return 'task-card--rest';
});

const cardState = computed(() => {
  if (isActive.value) return 'active';
  if (isHovering.value) return 'hover';
  return 'rest';
});

const handleHover = (isEntering: boolean) => {
  isHovering.value = isEntering;
};

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

const handleDetailClick = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement | null;
  emit('show-details', { taskId: props.task.id, trigger: target });
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
.task-card {
  position: relative;
  isolation: isolate;
  border-width: 1px;
  border-style: solid;
  border-color: var(--task-card-border);
  background: var(--task-card-bg);
  box-shadow: var(--task-card-shadow);
  backdrop-filter: blur(14px);
  transition: background 0.32s ease, border-color 0.32s ease, box-shadow 0.38s ease;
}
.task-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--task-card-overlay);
  opacity: var(--task-card-overlay-opacity);
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: -1;
}
.task-card--rest {
  --task-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 250, 255, 0.88) 100%);
  --task-card-border: rgba(148, 163, 184, 0.35);
  --task-card-shadow: 0 12px 26px -18px rgba(15, 23, 42, 0.42);
  --task-card-overlay: radial-gradient(120% 120% at 12% -18%, rgba(99, 102, 241, 0.22) 0%, transparent 68%);
  --task-card-overlay-opacity: 0.25;
}
.task-card--hover {
  --task-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(241, 245, 255, 0.94) 100%);
  --task-card-border: rgba(99, 102, 241, 0.4);
  --task-card-shadow: 0 18px 34px -16px rgba(79, 70, 229, 0.28);
  --task-card-overlay: radial-gradient(140% 140% at 16% -22%, rgba(96, 165, 250, 0.32) 0%, transparent 70%);
  --task-card-overlay-opacity: 0.6;
}
.task-card--active {
  --task-card-bg: linear-gradient(180deg, rgba(244, 248, 255, 0.95) 0%, rgba(232, 240, 255, 0.9) 100%);
  --task-card-border: rgba(79, 70, 229, 0.28);
  --task-card-shadow: 0 18px 36px -18px rgba(79, 70, 229, 0.28);
  --task-card-overlay: radial-gradient(160% 160% at 18% -24%, rgba(129, 140, 248, 0.28) 0%, transparent 72%);
  --task-card-overlay-opacity: 0.55;
}
.dark .task-card {
  --task-card-bg: linear-gradient(180deg, rgba(20, 24, 33, 0.92) 0%, rgba(17, 21, 29, 0.86) 100%);
  --task-card-border: rgba(71, 85, 105, 0.45);
  --task-card-shadow: 0 14px 32px -18px rgba(2, 6, 23, 0.6);
  --task-card-overlay: radial-gradient(140% 140% at 18% -32%, rgba(129, 140, 248, 0.32) 0%, transparent 75%);
  --task-card-overlay-opacity: 0.35;
}
.dark .task-card--hover {
  --task-card-bg: linear-gradient(180deg, rgba(27, 32, 43, 0.9) 0%, rgba(21, 26, 37, 0.86) 100%);
  --task-card-border: rgba(129, 140, 248, 0.45);
  --task-card-shadow: 0 18px 38px -16px rgba(15, 23, 42, 0.68);
  --task-card-overlay: radial-gradient(150% 150% at 20% -30%, rgba(96, 165, 250, 0.42) 0%, transparent 76%);
  --task-card-overlay-opacity: 0.65;
}
.dark .task-card--active {
  --task-card-bg: linear-gradient(180deg, rgba(31, 41, 55, 0.9) 0%, rgba(24, 32, 46, 0.86) 100%);
  --task-card-border: rgba(129, 140, 248, 0.38);
  --task-card-shadow: 0 20px 40px -18px rgba(37, 99, 235, 0.4);
  --task-card-overlay: radial-gradient(160% 160% at 18% -24%, rgba(129, 140, 248, 0.38) 0%, transparent 78%);
  --task-card-overlay-opacity: 0.5;
}
.task-card-grid {
  display: grid;
  grid-template-columns: 0fr auto;
  transition: grid-template-columns 0.3s ease-in-out;
}
.progress-track {
  position: relative;
  height: 26px;
  border-radius: 999px;
  overflow: hidden;
  padding: 2px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.18);
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.12);
}
.dark .progress-track {
  background: rgba(30, 58, 138, 0.35);
  border: 1px solid rgba(129, 140, 248, 0.25);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.4);
}
.progress-fill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(79, 70, 229, 0.95), rgba(37, 211, 178, 0.9));
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.28);
  overflow: hidden;
}
.progress-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
  opacity: 0.6;
}
.progress-sheen {
  position: absolute;
  top: -40%;
  left: -30%;
  width: 45%;
  height: 180%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
  transform: rotate(18deg);
  animation: progress-sheen-move 3.2s ease-in-out infinite;
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
  align-items: center;
  gap: 0.35rem;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(6px);
}
.dark .progress-label {
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.7);
}
@keyframes progress-sheen-move {
  0% { transform: translateX(-30%) rotate(18deg); opacity: 0.45; }
  50% { transform: translateX(160%) rotate(18deg); opacity: 0.85; }
  100% { transform: translateX(260%) rotate(18deg); opacity: 0; }
}
.action-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}
.action-btn:hover {
  background: rgba(99, 102, 241, 0.15);
  color: rgba(15, 23, 42, 0.85);
  transform: translateY(-1px);
}
.dark .action-btn:hover {
  background: rgba(129, 140, 248, 0.18);
  color: #e2e8f0;
}
.action-btn:active {
  transform: translateY(0);
}
</style>
