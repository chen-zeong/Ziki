<template>
  <MotionCard
    class="task-card group relative block rounded-2xl border px-4 py-3 transition-colors duration-300 ease-out cursor-pointer overflow-visible backdrop-blur"
    :class="[
      cardToneClass,
      {
        'is-selected ring-1 ring-[var(--brand-primary)]/20 text-slate-900/95 dark:text-slate-100': isActive,
        'is-leaving': isLeavingSelection
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
            :progress="task.status === 'completed' ? compressionChange?.label ?? null : null"
            :trend="task.status === 'completed' ? compressionChange?.trend : undefined"
          />
          <div
            v-if="task.status === 'processing'"
            class="progress-wrapper flex items-center w-full max-w-[340px]"
          >
            <div class="progress-track flex-1 min-w-0">
              <div
                class="progress-fill"
                :style="{ width: normalizedProgress + '%' }"
              ></div>
              <div class="progress-content">
                <span class="progress-label">{{ progressLabel }}</span>
                <span v-if="etaDisplay" class="progress-eta">{{ etaDisplay }}</span>
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
import { computed, ref, watch, onBeforeUnmount } from 'vue';
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
const isLeavingSelection = ref(false);
const leavingTimer = ref<number | null>(null);
const MotionCard = motion.div;

const cardVariants = {
  rest: { y: 0, scale: 1, opacity: 1 },
  hover: { y: -2, scale: 1.006, opacity: 1 },
  active: { y: -4, scale: 1.012, opacity: 1 }
} as const;

const cardTransition = {
  default: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
  scale: { type: 'spring', stiffness: 220, damping: 28, mass: 0.85 },
  y: { duration: 0.32, ease: [0.16, 1, 0.3, 1] }
};

const cardToneClass = computed(() => {
  if (isActive.value) return 'task-card--active';
  if (isLeavingSelection.value) return 'task-card--leaving';
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
  const cardAnchor = target ? (target.closest('.task-card') as HTMLElement | null) : null;
  emit('show-details', { taskId: props.task.id, trigger: cardAnchor || target });
};

watch(isActive, (current, previous) => {
  if (leavingTimer.value !== null && typeof window !== 'undefined') {
    window.clearTimeout(leavingTimer.value);
    leavingTimer.value = null;
  }
  if (previous && !current) {
    isLeavingSelection.value = true;
    if (typeof window !== 'undefined') {
      leavingTimer.value = window.setTimeout(() => {
        isLeavingSelection.value = false;
        leavingTimer.value = null;
      }, 260);
    }
  } else if (current) {
    isLeavingSelection.value = false;
  }
});

onBeforeUnmount(() => {
  if (leavingTimer.value !== null && typeof window !== 'undefined') {
    window.clearTimeout(leavingTimer.value);
  }
});

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

const compressionChange = computed(() => {
  if (props.task.status !== 'completed') return null;
  const original = Number(props.task.originalSize ?? props.task.file.size ?? 0);
  const compressedSource = props.task.compressedSize ?? props.task.file.compressedSize;
  const compressed = compressedSource === undefined || compressedSource === null ? null : Number(compressedSource);
  if (!original || !Number.isFinite(original) || original <= 0) return null;
  if (compressed === null || !Number.isFinite(compressed)) return null;
  const delta = ((compressed - original) / original) * 100;
  if (!Number.isFinite(delta)) return null;
  const magnitude = Math.abs(delta);
  if (magnitude < 0.1) {
    return { label: '→ 0%', trend: 'flat' as const };
  }
  const percentText = magnitude >= 10
    ? `${Math.round(magnitude)}%`
    : `${magnitude.toFixed(1).replace(/\\.0$/, '')}%`;
  if (delta > 0) {
    return { label: `↑ ${percentText}`, trend: 'up' as const };
  }
  if (delta < 0) {
    return { label: `↓ ${percentText}`, trend: 'down' as const };
  }
  return { label: '→ 0%', trend: 'flat' as const };
});

const progressLabel = computed(() => {
  const raw = Number.isFinite(progressValue.value) ? progressValue.value : 0;
  const clamped = Math.min(100, Math.max(raw, 0));
  const percent = clamped >= 10 ? clamped.toFixed(0) : clamped.toFixed(1);
  const compact = percent.replace(/\\.0$/, '');
  const compressingRaw = t('taskList.compressing');
  const compressingText = compressingRaw.replace(/\\.*$/, '') || compressingRaw;
  return `${compressingText} ${compact}%`;
});

const toTimestamp = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatEtaDuration = (milliseconds: number): string => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '';
  const totalSeconds = Math.round(milliseconds / 1000);
  if (totalSeconds <= 0) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${t('timeUnits.hours')}`);
  if (minutes > 0) parts.push(`${minutes}${t('timeUnits.minutes')}`);
  if (hours === 0 && seconds > 0) parts.push(`${seconds}${t('timeUnits.seconds')}`);
  if (parts.length === 0) {
    parts.push(`1${t('timeUnits.seconds')}`);
  }
  return parts.join(' ');
};

const parseEtaClockText = (text: string): number | null => {
  if (!text) return null;
  const match = text.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  if ([hours, minutes, seconds].some(v => Number.isNaN(v))) return null;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

const etaComputed = computed(() => {
  const progress = progressValue.value;
  const startedAtMs = toTimestamp(props.task.startedAt);
  if (startedAtMs && progress > 0 && progress < 100) {
    const elapsed = Date.now() - startedAtMs;
    if (elapsed > 0) {
      const fraction = progress / 100;
      if (fraction > 0) {
        const total = elapsed / fraction;
        const remaining = total - elapsed;
        const formatted = formatEtaDuration(remaining);
        if (formatted) return formatted;
      }
    }
  }
  return '';
});

const etaLabel = computed(() => {
  if (etaComputed.value) return etaComputed.value;
  const raw = props.task.etaText?.trim();
  if (!raw || raw === '--') return '';
  const parsed = parseEtaClockText(raw);
  if (parsed !== null) {
    const formatted = formatEtaDuration(parsed);
    if (formatted) return formatted;
  }
  return raw;
});

const etaDisplay = computed(() => {
  if (!etaLabel.value) return '';
  return `${t('taskList.remainingShort')}: ${etaLabel.value}`;
});

const failureHint = computed(() => t('taskList.statusFailed'));
</script>

<style scoped>
.task-card {
  position: relative;
  isolation: isolate;
  border-width: var(--task-card-border-width, 1px);
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
  --task-card-bg: rgba(255, 255, 255, 0.95);
  --task-card-border: rgba(148, 163, 184, 0.7);
  --task-card-shadow: none;
  --task-card-overlay: radial-gradient(120% 120% at 12% -18%, rgba(99, 102, 241, 0.18) 0%, transparent 70%);
  --task-card-overlay-opacity: 0.2;
  --task-card-border-width: 0.75px;
}
.task-card--hover {
  --task-card-bg: rgba(248, 250, 255, 0.92);
  --task-card-border: rgba(99, 102, 241, 0.26);
  --task-card-shadow: none;
  --task-card-overlay: radial-gradient(140% 140% at 16% -22%, rgba(96, 165, 250, 0.22) 0%, transparent 68%);
  --task-card-overlay-opacity: 0.24;
  --task-card-border-width: 1px;
}
.task-card--active {
  --task-card-bg: rgba(248, 250, 255, 0.92);
  --task-card-border: rgba(99, 102, 241, 0.26);
  --task-card-shadow: none;
  --task-card-overlay: radial-gradient(140% 140% at 16% -22%, rgba(96, 165, 250, 0.22) 0%, transparent 68%);
  --task-card-overlay-opacity: 0.24;
  --task-card-border-width: 1px;
}
.task-card--leaving {
  --task-card-bg: rgba(252, 253, 255, 0.9);
  --task-card-border: rgba(148, 163, 184, 0.52);
  --task-card-shadow: none;
  --task-card-overlay: radial-gradient(135% 135% at 12% -18%, rgba(148, 163, 184, 0.24) 0%, transparent 70%);
  --task-card-overlay-opacity: 0.22;
  --task-card-border-width: 0.85px;
}
.dark .task-card {
  --task-card-bg: rgba(13, 16, 24, 0.96);
  --task-card-border: rgba(148, 163, 184, 0.18);
  --task-card-shadow: 0 24px 48px -34px rgba(5, 6, 12, 0.82);
  --task-card-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(76, 80, 92, 0.14) 18%, rgba(10, 12, 18, 0) 58%, rgba(0, 0, 0, 0.35) 100%), radial-gradient(90% 120% at 50% -20%, rgba(255, 255, 255, 0.04) 0%, transparent 70%);
  --task-card-overlay-opacity: 1;
  --task-card-border-width: 0.85px;
}
.task-card.is-leaving::before {
  animation: selectionFade 0.32s ease forwards;
}
@keyframes selectionFade {
  0% {
    opacity: 0.45;
    transform: translateY(-6px);
  }
  100% {
    opacity: var(--task-card-overlay-opacity);
    transform: translateY(0);
  }
}
.dark .task-card--hover {
  --task-card-bg: rgba(18, 21, 30, 0.94);
  --task-card-border: rgba(168, 174, 189, 0.26);
  --task-card-shadow: 0 30px 54px -36px rgba(6, 7, 14, 0.86);
  --task-card-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(92, 96, 110, 0.16) 16%, rgba(12, 14, 20, 0) 60%), radial-gradient(70% 110% at 50% -8%, rgba(255, 255, 255, 0.06) 0%, transparent 78%);
  --task-card-overlay-opacity: 1;
  --task-card-border-width: 1px;
}
.dark .task-card--active {
  --task-card-bg: rgba(22, 25, 34, 0.94);
  --task-card-border: rgba(209, 213, 219, 0.32);
  --task-card-shadow: 0 36px 60px -38px rgba(0, 0, 0, 0.88);
  --task-card-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(108, 112, 128, 0.22) 18%, rgba(16, 18, 26, 0) 64%), radial-gradient(120% 105% at 50% -16%, rgba(255, 255, 255, 0.08) 0%, transparent 62%);
  --task-card-overlay-opacity: 1;
  --task-card-border-width: 1px;
}
.dark .task-card--leaving {
  --task-card-bg: rgba(16, 19, 27, 0.94);
  --task-card-border: rgba(156, 163, 175, 0.24);
  --task-card-shadow: 0 26px 52px -36px rgba(4, 5, 10, 0.84);
  --task-card-overlay: linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(70, 74, 86, 0.14) 20%, rgba(12, 14, 20, 0) 62%);
  --task-card-overlay-opacity: 1;
  --task-card-border-width: 0.95px;
}
.task-card-grid {
  display: grid;
  grid-template-columns: 0fr auto;
  transition: grid-template-columns 0.3s ease-in-out;
}
.progress-track {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 30px;
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(99, 102, 241, 0.22);
  overflow: hidden;
}
.dark .progress-track {
  background: rgba(38, 43, 56, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.28);
}
.progress-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}
.progress-fill {
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  border-radius: inherit;
  background: rgba(99, 102, 241, 0.9);
  transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.dark .progress-fill {
  background: linear-gradient(90deg, rgba(209, 213, 224, 0.86) 0%, rgba(148, 163, 184, 0.82) 100%);
}
.progress-label {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.4rem;
  padding: 0;
  position: relative;
  z-index: 1;
  font-size: 12px;
  letter-spacing: 0.01em;
  color: rgba(30, 41, 59, 0.88);
  font-weight: 700;
}
.dark .progress-label {
  color: #e2e8f0;
  font-weight: 600;
}
.progress-eta {
  font-size: 11px;
  font-weight: 600;
  color: rgba(71, 85, 105, 0.88);
  flex-shrink: 0;
  text-align: right;
}
.dark .progress-eta {
  color: rgba(203, 213, 225, 0.82);
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
  background: rgba(148, 163, 184, 0.22);
  color: #e2e8f0;
}
.action-btn:active {
  transform: translateY(0);
}
</style>
