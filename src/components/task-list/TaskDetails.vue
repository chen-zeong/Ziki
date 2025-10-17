<template>
  <Teleport to="body">
    <div v-if="isVisible" class="task-detail-layer">
      <div class="task-detail-backdrop" @click="$emit('close')" />
      <MotionPopover
        class="task-detail-popover"
        :class="popoverClass"
        :style="popoverStyle"
        :initial="popoverMotion.initial"
        :animate="popoverMotion.animate"
        :exit="popoverMotion.exit"
        :transition="popoverMotion.transition"
        @click.stop
      >
          <header class="task-detail-header">
            <div class="min-w-0">
              <p class="task-detail-title">
                {{ task?.file.name }}
              </p>
              <p class="task-detail-subtitle">
                {{ formatFileSize(task?.file.size || task?.originalSize) }}
              </p>
            </div>
            <button
              class="task-detail-close"
              @click="$emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </header>

          <div class="task-detail-body">
            <section class="task-detail-status">
              <div>
                <p class="detail-label">
                {{ $t('taskList.statusLabel') }}
                </p>
                <p class="detail-value">
                  {{ statusLabel }}
                </p>
              </div>
              <StatusBadge v-if="task" :status="task.status" :progress="completionPercent" />
            </section>

            <section class="detail-grid">
              <div>
                <p class="detail-label">
                  {{ $t('taskList.createdAt') }}
                </p>
                <p class="detail-value">{{ formatDate(task?.createdAt) }}</p>
              </div>
              <div>
                <p class="detail-label">
                  {{ $t('taskList.updatedAt') }}
                </p>
                <p class="detail-value">{{ formatDate(task?.updatedAt) }}</p>
              </div>
              <div>
                <p class="detail-label">
                  {{ $t('taskList.progress') }}
                </p>
                <p class="detail-value">{{ ((task?.progress ?? 0) as number).toFixed(1) }}%</p>
              </div>
              <div>
                <p class="detail-label">
                  {{ $t('taskList.remaining') }}
                </p>
                <p class="detail-value">{{ task?.etaText || '--' }}</p>
              </div>
            </section>

            <section v-if="metadataRows.length" class="detail-table">
              <div class="detail-table-header">
                <h3 class="detail-table-title">
                  {{ $t('taskList.fileInfo') }}
                </h3>
                <span
                  v-if="hasAfterData"
                  class="detail-table-hint"
                >
                  {{ $t('taskList.compressionComparison') }}
                </span>
              </div>
              <div class="detail-table-wrapper">
                <table class="w-full text-xs">
                  <thead>
                    <tr>
                      <th class="py-2 pl-4 text-left font-medium">{{ $t('taskList.metric') }}</th>
                      <th class="py-2 text-right font-medium">{{ $t('taskList.before') }}</th>
                      <th
                        v-if="hasAfterData"
                        class="py-2 pr-4 text-right font-medium"
                      >
                        {{ $t('taskList.after') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in metadataRows"
                      :key="row.key"
                    >
                      <td class="py-2 pl-4 font-medium text-slate-500 dark:text-slate-400">
                        {{ row.label }}
                      </td>
                      <td class="py-2 text-right pr-4">
                        {{ row.before }}
                      </td>
                      <td
                        v-if="hasAfterData"
                        class="py-2 pr-4 text-right"
                        :class="row.toneClass"
                      >
                        {{ row.after }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section v-if="task?.errorMessage" class="detail-error">
              <p class="detail-error-title">{{ $t('taskList.statusFailed') }}</p>
              <p class="detail-error-text">{{ task.errorMessage }}</p>
            </section>
          </div>
      </MotionPopover>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import { X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { CompressionTask, VideoMetadata } from '../../types';
import StatusBadge from './StatusBadge.vue';
import { motion } from 'motion-v';

type InfoRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  toneClass?: string;
};

const props = defineProps<{
  open: boolean;
  task: CompressionTask | null;
  anchorRect?: DOMRect | null;
}>();

defineEmits<{ close: [] }>();

const { t } = useI18n();
const MotionPopover = motion.div;
const popoverMotion = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.96 },
  transition: { type: 'spring', stiffness: 340, damping: 26, mass: 0.65 }
} as const;

const task = computed(() => props.task);
const isVisible = computed(() => props.open && !!task.value);
const popoverStyle = computed<CSSProperties>(() => {
  if (!isVisible.value) return {};
  if (props.anchorRect && typeof window !== 'undefined') {
    const rect = props.anchorRect;
    const viewportWidth = window.innerWidth + window.scrollX;
    const desiredLeft = rect.right + 16 + window.scrollX;
    const maxLeft = viewportWidth - 420;
    return {
      top: `${rect.top + window.scrollY}px`,
      left: `${Math.min(desiredLeft, maxLeft)}px`
    };
  }
  return {
    top: `${window.scrollY + window.innerHeight / 2}px`,
    left: `${window.scrollX + window.innerWidth / 2}px`,
    transform: 'translate(-50%, -50%)'
  };
});

const popoverClass = computed(() => ({
  'task-detail-popover--anchored': !!props.anchorRect,
  'task-detail-popover--centered': !props.anchorRect
}));

const statusLabel = computed(() => {
  if (!task.value) return '--';
  const statusKey = `taskList.status${task.value.status.charAt(0).toUpperCase()}${task.value.status.slice(1)}`;
  return t(statusKey, task.value.status);
});

const formatFileSize = (bytes?: number | null) => {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '--';
  if (bytes === 0) return '0 B';
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

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '--';
  if (seconds === 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const sanitizeText = (value?: string | number | null) => {
  if (value === null || value === undefined) return '--';
  const text = String(value).trim();
  return text.length ? text : '--';
};

const formatBitrate = (value?: string | null) => {
  if (!value) return '--';
  const text = value.toString().trim();
  if (!text || text.toLowerCase() === 'unknown') return '--';
  return text;
};

const formatFps = (value?: string | number | null) => {
  if (value === null || value === undefined) return '--';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return sanitizeText(value);
  return `${numeric.toFixed(2)} fps`;
};

const toUpper = (value?: string | null) => {
  if (!value) return undefined;
  return value.toString().toUpperCase();
};

const getTargetResolution = (taskItem: CompressionTask) => {
  if (taskItem.compressedMetadata?.resolution) {
    return taskItem.compressedMetadata.resolution;
  }
  if (taskItem.settings.resolution === 'custom' && taskItem.settings.customResolution) {
    const { width, height } = taskItem.settings.customResolution;
    if (width && height) {
      return `${width}x${height}`;
    }
  }
  if (taskItem.settings.resolution && taskItem.settings.resolution !== 'original') {
    return taskItem.settings.resolution;
  }
  return taskItem.file.metadata?.resolution || '--';
};

const getNumericTone = (before?: number | null, after?: number | null, inverse = false) => {
  if (
    before === null ||
    before === undefined ||
    after === null ||
    after === undefined ||
    Number.isNaN(before) ||
    Number.isNaN(after)
  ) {
    return '';
  }
  if (after === before) return '';
  const improved = inverse ? after > before : after < before;
  return improved
    ? 'text-emerald-600 dark:text-emerald-300 font-semibold'
    : 'text-rose-500 dark:text-rose-300 font-semibold';
};

const metadataRows = computed<InfoRow[]>(() => {
  if (!task.value) return [];

  const meta: Partial<VideoMetadata> = task.value.file.metadata ?? {};
  const compressed: Partial<VideoMetadata> = task.value.compressedMetadata ?? {};
  const originalSize = task.value.file.size ?? task.value.originalSize ?? null;
  const compressedSize = task.value.compressedSize ?? null;

  const rows: InfoRow[] = [
    {
      key: 'fileSize',
      label: t('taskList.fileSize'),
      before: formatFileSize(originalSize),
      after: formatFileSize(compressedSize),
      toneClass: getNumericTone(originalSize, compressedSize)
    },
    {
      key: 'format',
      label: t('videoSettings.format'),
      before: sanitizeText(toUpper(meta.format)),
      after: sanitizeText(compressed.format ? toUpper(compressed.format) : toUpper(task.value.settings.format))
    },
    {
      key: 'videoCodec',
      label: t('videoSettings.videoCodec'),
      before: sanitizeText(meta.videoCodec),
      after: sanitizeText(compressed.videoCodec || task.value.settings.videoCodec)
    },
    {
      key: 'resolution',
      label: t('videoSettings.resolution'),
      before: sanitizeText(meta.resolution),
      after: sanitizeText(getTargetResolution(task.value))
    },
    {
      key: 'bitrate',
      label: t('videoSettings.bitrate'),
      before: formatBitrate(meta.bitrate),
      after: formatBitrate(compressed.bitrate)
    },
    {
      key: 'duration',
      label: t('taskList.duration'),
      before: formatDuration(meta.duration ?? null),
      after: formatDuration(compressed.duration ?? meta.duration ?? null)
    },
    {
      key: 'frameRate',
      label: t('taskList.frameRate'),
      before: formatFps(meta.fps),
      after: formatFps(compressed.fps)
    },
    {
      key: 'audioCodec',
      label: t('taskList.audioCodec'),
      before: sanitizeText(meta.audioCodec),
      after: sanitizeText(compressed.audioCodec)
    },
    {
      key: 'audioSampleRate',
      label: t('taskList.audioSampleRate'),
      before: sanitizeText(meta.sampleRate),
      after: sanitizeText(compressed.sampleRate)
    },
    {
      key: 'colorDepth',
      label: t('taskList.colorDepth'),
      before: sanitizeText(meta.colorDepth),
      after: sanitizeText(compressed.colorDepth ?? task.value.settings.bitDepth)
    }
  ];

  return rows.filter(row => row.before !== '--' || (row.after && row.after !== '--'));
});

const hasAfterData = computed(() => metadataRows.value.some(row => row.after && row.after !== '--'));

const completionPercent = computed(() => {
  if (!task.value || task.value.status !== 'completed') return null;
  const value = Number(task.value.progress);
  if (Number.isNaN(value)) return '100%';
  const clamped = Math.min(100, Math.max(value, 0));
  return `${Math.round(clamped)}%`;
});
</script>

<style scoped>
.task-detail-layer {
  position: fixed;
  inset: 0;
  z-index: 1100;
  pointer-events: none;
}
.task-detail-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: transparent;
}
.task-detail-popover {
  position: absolute;
  pointer-events: auto;
  min-width: 340px;
  max-width: 420px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 48px -20px rgba(15, 23, 42, 0.3);
  padding: 18px 0 0;
  backdrop-filter: blur(12px);
  transform-origin: top left;
}
.dark .task-detail-popover {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(23, 28, 40, 0.96);
  box-shadow: 0 28px 54px -18px rgba(0, 0, 0, 0.6);
}
.task-detail-popover--anchored {
  transform: translateY(0);
}
.task-detail-popover--centered {
  transform: translate(-50%, -50%);
  transform-origin: center;
}
.task-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}
.dark .task-detail-header {
  border-color: rgba(148, 163, 184, 0.12);
}
.task-detail-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}
.dark .task-detail-title {
  color: #e2e8f0;
}
.task-detail-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}
.dark .task-detail-subtitle {
  color: #94a3b8;
}
.task-detail-close {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #475569;
  transition: background 0.18s ease, color 0.18s ease;
}
.task-detail-close:hover {
  background: rgba(148, 163, 184, 0.18);
  color: #1e293b;
}
.dark .task-detail-close {
  color: #cbd5f5;
}
.dark .task-detail-close:hover {
  background: rgba(100, 116, 139, 0.16);
  color: #e2e8f0;
}
.task-detail-body {
  max-height: min(60vh, 520px);
  overflow-y: auto;
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.task-detail-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #94a3b8;
}
.dark .detail-label {
  color: rgba(148, 163, 184, 0.7);
}
.detail-value {
  margin-top: 8px;
  font-size: 13px;
  color: #1e293b;
}
.dark .detail-value {
  color: #cbd5f5;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  font-size: 13px;
}
.detail-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-table-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8;
}
.detail-table-hint {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #0ea5e9;
}
.dark .detail-table-hint {
  color: #38bdf8;
}
.detail-table-wrapper {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(241, 245, 255, 0.56);
  overflow: hidden;
}
.detail-table-wrapper table thead {
  background: rgba(226, 232, 240, 0.6);
  color: #475569;
}
.detail-table-wrapper table tbody tr + tr {
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}
.dark .detail-table-wrapper {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.7);
}
.dark .detail-table-wrapper table thead {
  background: rgba(51, 65, 85, 0.4);
  color: #cbd5f5;
}
.dark .detail-table-wrapper table tbody tr + tr {
  border-color: rgba(148, 163, 184, 0.12);
}
.detail-error {
  border-radius: 12px;
  border: 1px solid rgba(248, 113, 113, 0.25);
  background: rgba(254, 226, 226, 0.7);
  padding: 12px 14px;
}
.detail-error-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #b91c1c;
}
.detail-error-text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #7f1d1d;
}
.dark .detail-error {
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(76, 5, 25, 0.6);
}
.dark .detail-error-title {
  color: rgba(248, 180, 180, 0.9);
}
.dark .detail-error-text {
  color: rgba(252, 231, 243, 0.85);
}
</style>
