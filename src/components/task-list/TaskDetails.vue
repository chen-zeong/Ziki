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
        ref="popoverRef"
        @click.stop
      >
          <header class="task-detail-header">
            <div class="min-w-0">
              <p class="task-detail-title" :title="task?.file.name || ''">
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
                <table class="w-full text-[13px] leading-[1.35]">
                  <thead>
                    <tr>
                      <th class="py-2 pl-4 text-left font-medium">{{ $t('taskList.metric') }}</th>
                      <th class="py-2 pr-4 text-right font-medium">{{ $t('taskList.before') }}</th>
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
                      <td class="py-2 pl-4 pr-4 font-medium text-slate-500 dark:text-slate-400">
                        {{ row.label }}
                      </td>
                      <td class="py-2 pr-4 text-right font-medium text-slate-700 dark:text-slate-200">
                        {{ row.before }}
                      </td>
                      <td
                        v-if="hasAfterData"
                        class="py-2 pr-4 text-right font-medium text-slate-600 dark:text-slate-200/90"
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
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import type { CSSProperties } from 'vue';
import { X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { CompressionTask, VideoMetadata } from '../../types';
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
const popoverRef = ref<HTMLElement | null>(null);
const popoverTop = ref(0);
const popoverLeft = ref(0);
const isAnchored = ref(false);

const task = computed(() => props.task);
const isVisible = computed(() => props.open && !!task.value);
const popoverStyle = computed<CSSProperties>(() => {
  if (!isVisible.value) return {};
  if (!isAnchored.value) {
    return {
      top: `${window.scrollY + window.innerHeight / 2}px`,
      left: `${window.scrollX + window.innerWidth / 2}px`,
      transform: 'translate(-50%, -50%)'
    };
  }
  return {
    top: `${popoverTop.value}px`,
    left: `${popoverLeft.value}px`
  };
});

const popoverClass = computed(() => ({
  'task-detail-popover--anchored': isAnchored.value,
  'task-detail-popover--centered': !isAnchored.value
}));

const updatePopoverPosition = async () => {
  if (!isVisible.value || typeof window === 'undefined') return;
  await nextTick();
  await new Promise<void>(resolve => {
    window.requestAnimationFrame(() => resolve());
  });
  const rect = props.anchorRect;
  const popEl = popoverRef.value;
  if (rect) {
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const viewportLeft = window.scrollX;
    const viewportRight = viewportLeft + window.innerWidth;
    const width = popEl?.offsetWidth ?? 380;
    const height = popEl?.offsetHeight ?? 0;

    const desiredLeft = rect.right + 16 + viewportLeft;
    const maxLeft = viewportRight - width - 16;
    const minLeft = viewportLeft + 16;
    popoverLeft.value = Math.max(minLeft, Math.min(desiredLeft, maxLeft));

    const anchorTop = rect.top + viewportTop;
    const anchorBottom = rect.bottom + viewportTop;
    const anchorCenter = anchorTop + rect.height / 2;
    const verticalOffset = Math.min(Math.max(rect.height * 0.3, 28), 96);
    let desiredCenter = anchorCenter - verticalOffset;
    if (height > 0) {
      const margin = 24;
      const safeTop = viewportTop + margin + height / 2;
      const safeBottom = viewportBottom - margin - height / 2;
      const availableBelow = viewportBottom - margin - anchorBottom;
      const shortage = Math.max(0, height / 2 - availableBelow);
      if (shortage > 0) {
        const smoothing = Math.min(Math.max(shortage * 0.45, 18), 72);
        desiredCenter -= shortage + smoothing;
      }
      const maxAnchorAlignedCenter = anchorTop - 16 + height / 2;
      desiredCenter = Math.min(desiredCenter, maxAnchorAlignedCenter);
      popoverTop.value = Math.max(safeTop, Math.min(desiredCenter, safeBottom));
    } else {
      popoverTop.value = desiredCenter;
    }

    isAnchored.value = true;
  } else {
    isAnchored.value = false;
  }
};

watch([isVisible, () => props.anchorRect], () => {
  if (isVisible.value) {
    void updatePopoverPosition();
  }
});

watch(task, () => {
  if (isVisible.value) {
    void updatePopoverPosition();
  }
});

onMounted(() => {
  if (isVisible.value) {
    void updatePopoverPosition();
  }
});

const formatFileSize = (bytes?: number | null) => {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '--';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

const showAfterData = computed(() => task.value?.status === 'completed');

const highlightIfChanged = (before: string, after: string, allowHighlight: boolean) => {
  if (!allowHighlight) return '';
  const normalizedBefore = before?.toString().trim().toLowerCase();
  const normalizedAfter = after?.toString().trim().toLowerCase();
  if (!normalizedAfter || normalizedAfter === '--') return '';
  if (normalizedBefore === normalizedAfter) return '';
  return 'detail-value--changed';
};

const metadataRows = computed<InfoRow[]>(() => {
  if (!task.value) return [];

  const meta: Partial<VideoMetadata> = task.value.file.metadata ?? {};
  const compressed: Partial<VideoMetadata> = task.value.compressedMetadata ?? {};
  const originalSize = task.value.file.size ?? task.value.originalSize ?? null;
  const compressedSize = task.value.compressedSize ?? null;
  const allowAfter = showAfterData.value;
  const afterOrPlaceholder = (value: string) => (allowAfter ? value : '--');

  const rows: InfoRow[] = [];

  const sizeBefore = formatFileSize(originalSize);
  const sizeAfter = afterOrPlaceholder(formatFileSize(compressedSize));
  rows.push({
    key: 'fileSize',
    label: t('taskList.fileSize'),
    before: sizeBefore,
    after: sizeAfter,
    toneClass: highlightIfChanged(sizeBefore, sizeAfter, allowAfter)
  });

  const formatBefore = sanitizeText(toUpper(meta.format));
  const formatAfterValue = sanitizeText(
    compressed.format ? toUpper(compressed.format) : toUpper(task.value.settings.format)
  );
  const formatAfter = afterOrPlaceholder(formatAfterValue);
  rows.push({
    key: 'format',
    label: t('videoSettings.format'),
    before: formatBefore,
    after: formatAfter,
    toneClass: highlightIfChanged(formatBefore, formatAfter, allowAfter)
  });

  const videoCodecBefore = sanitizeText(meta.videoCodec);
  const videoCodecAfter = afterOrPlaceholder(sanitizeText(compressed.videoCodec || task.value.settings.videoCodec));
  rows.push({
    key: 'videoCodec',
    label: t('videoSettings.videoCodec'),
    before: videoCodecBefore,
    after: videoCodecAfter,
    toneClass: highlightIfChanged(videoCodecBefore, videoCodecAfter, allowAfter)
  });

  const resolutionBefore = sanitizeText(meta.resolution);
  const resolutionAfter = afterOrPlaceholder(sanitizeText(getTargetResolution(task.value)));
  rows.push({
    key: 'resolution',
    label: t('videoSettings.resolution'),
    before: resolutionBefore,
    after: resolutionAfter,
    toneClass: highlightIfChanged(resolutionBefore, resolutionAfter, allowAfter)
  });

  const bitrateBefore = formatBitrate(meta.bitrate);
  const bitrateAfter = afterOrPlaceholder(formatBitrate(compressed.bitrate));
  rows.push({
    key: 'bitrate',
    label: t('videoSettings.bitrate'),
    before: bitrateBefore,
    after: bitrateAfter,
    toneClass: highlightIfChanged(bitrateBefore, bitrateAfter, allowAfter)
  });

  const durationBefore = formatDuration(meta.duration ?? null);
  const durationAfter = afterOrPlaceholder(formatDuration(compressed.duration ?? meta.duration ?? null));
  rows.push({
    key: 'duration',
    label: t('taskList.duration'),
    before: durationBefore,
    after: durationAfter,
    toneClass: highlightIfChanged(durationBefore, durationAfter, allowAfter)
  });

  const frameRateBefore = formatFps(meta.fps);
  const frameRateAfter = afterOrPlaceholder(formatFps(compressed.fps));
  rows.push({
    key: 'frameRate',
    label: t('taskList.frameRate'),
    before: frameRateBefore,
    after: frameRateAfter,
    toneClass: highlightIfChanged(frameRateBefore, frameRateAfter, allowAfter)
  });

  const audioCodecBefore = sanitizeText(meta.audioCodec);
  const audioCodecAfter = afterOrPlaceholder(sanitizeText(compressed.audioCodec));
  rows.push({
    key: 'audioCodec',
    label: t('taskList.audioCodec'),
    before: audioCodecBefore,
    after: audioCodecAfter,
    toneClass: highlightIfChanged(audioCodecBefore, audioCodecAfter, allowAfter)
  });

  const audioSampleRateBefore = sanitizeText(meta.sampleRate);
  const audioSampleRateAfter = afterOrPlaceholder(sanitizeText(compressed.sampleRate));
  rows.push({
    key: 'audioSampleRate',
    label: t('taskList.audioSampleRate'),
    before: audioSampleRateBefore,
    after: audioSampleRateAfter,
    toneClass: highlightIfChanged(audioSampleRateBefore, audioSampleRateAfter, allowAfter)
  });

  const colorDepthBefore = sanitizeText(meta.colorDepth);
  const colorDepthAfter = afterOrPlaceholder(sanitizeText(compressed.colorDepth ?? task.value.settings.bitDepth));
  rows.push({
    key: 'colorDepth',
    label: t('taskList.colorDepth'),
    before: colorDepthBefore,
    after: colorDepthAfter,
    toneClass: highlightIfChanged(colorDepthBefore, colorDepthAfter, allowAfter)
  });

  return rows.filter(row => row.before !== '--' || (row.after && row.after !== '--'));
});

const hasAfterData = computed(() =>
  showAfterData.value && metadataRows.value.some(row => row.after && row.after !== '--')
);

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
  width: min(360px, calc(100vw - 48px));
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22px 44px -26px rgba(15, 23, 42, 0.32);
  padding: 16px 0 0;
  backdrop-filter: blur(12px);
  transform-origin: top left;
}
.dark .task-detail-popover {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(28, 29, 36, 0.94);
  box-shadow: 0 26px 48px -26px rgba(0, 0, 0, 0.7);
}
.task-detail-popover--anchored {
  transform: translateY(-50%);
  transform-origin: left center;
}
.task-detail-popover--centered {
  transform: translate(-50%, -50%);
  transform-origin: center;
}
.task-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}
.dark .task-detail-header {
  border-color: rgba(148, 163, 184, 0.18);
}
.task-detail-title {
  display: block;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dark .task-detail-title {
  color: #f5f5f5;
}
.task-detail-subtitle {
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}
.dark .task-detail-subtitle {
  color: rgba(226, 232, 240, 0.7);
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
  color: rgba(226, 232, 240, 0.85);
}
.dark .task-detail-close:hover {
  background: rgba(148, 163, 184, 0.22);
  color: #f5f5f5;
}
.task-detail-body {
  max-height: min(72vh, 520px);
  overflow-y: auto;
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-table-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #475569;
}
.dark .detail-table-title {
  color: rgba(226, 232, 240, 0.9);
}
.detail-table-hint {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(14, 165, 233, 0.9);
}
.dark .detail-table-hint {
  color: rgba(226, 232, 240, 0.65);
}
.detail-table-wrapper {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.92);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  overflow: hidden;
}
.detail-value--changed {
  color: #7c3aed;
  font-weight: 600;
}
.dark .detail-value--changed {
  color: #c4b5fd;
}
.detail-table-wrapper table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.detail-table-wrapper table thead {
  background: rgba(248, 250, 252, 0.95);
  color: rgba(71, 85, 105, 0.88);
}
.detail-table-wrapper table thead th {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
}
.detail-table-wrapper table tbody td {
  border: none;
}
.detail-table-wrapper table tbody tr {
  transition: background 0.18s ease;
}
.detail-table-wrapper table tbody tr:hover {
  background: rgba(148, 163, 184, 0.14);
}
.dark .detail-table-wrapper {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(32, 33, 40, 0.92);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}
.dark .detail-table-wrapper table thead {
  background: rgba(48, 49, 56, 0.6);
  color: rgba(232, 233, 240, 0.82);
}
.dark .detail-table-wrapper table tbody tr:hover {
  background: rgba(99, 102, 111, 0.2);
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
