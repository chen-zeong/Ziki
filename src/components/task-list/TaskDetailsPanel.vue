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
              {{ $t('taskList.statusLabel') }}
            </span>
            <StatusBadge :status="task.status" :progress="completionPercent" />
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

        <section v-if="metadataRows.length" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {{ $t('taskList.fileInfo') }}
            </h3>
            <span
              v-if="hasAfterData"
              class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300"
            >
              {{ $t('taskList.compressionComparison') }}
            </span>
          </div>
          <div class="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5">
            <table class="w-full text-xs">
              <thead class="bg-slate-50/90 dark:bg-white/5 text-slate-500 dark:text-slate-400">
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
              <tbody class="text-slate-700 dark:text-slate-200">
                <tr
                  v-for="row in metadataRows"
                  :key="row.key"
                  class="border-t border-slate-100/70 dark:border-white/5"
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
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import type { CompressionTask, VideoMetadata } from '../../types';
import StatusBadge from './StatusBadge.vue';
import { useI18n } from 'vue-i18n';

type InfoRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  toneClass?: string;
};

const props = defineProps<{
  task: CompressionTask;
}>();

defineEmits<{ close: [] }>();

const { t } = useI18n();

const formatFileSize = (bytes?: number | null): string => {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '--';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (value?: string | number | Date) => {
  if (!value) return '--';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleString();
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
  if (before === after) return '';
  const improved = inverse ? after > before : after < before;
  return improved
    ? 'text-emerald-600 dark:text-emerald-300 font-semibold'
    : 'text-rose-500 dark:text-rose-300 font-semibold';
};

const metadataRows = computed<InfoRow[]>(() => {
  const meta: Partial<VideoMetadata> = props.task.file.metadata ?? {};
  const compressed: Partial<VideoMetadata> = props.task.compressedMetadata ?? {};

  const originalSize = props.task.file.size ?? props.task.originalSize ?? null;
  const compressedSize = props.task.compressedSize ?? null;

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
      after: sanitizeText(compressed.format ? toUpper(compressed.format) : toUpper(props.task.settings.format))
    },
    {
      key: 'videoCodec',
      label: t('videoSettings.videoCodec'),
      before: sanitizeText(meta.videoCodec),
      after: sanitizeText(compressed.videoCodec || props.task.settings.videoCodec)
    },
    {
      key: 'resolution',
      label: t('videoSettings.resolution'),
      before: sanitizeText(meta.resolution),
      after: sanitizeText(getTargetResolution(props.task))
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
      after: sanitizeText(compressed.colorDepth ?? props.task.settings.bitDepth)
    }
  ];

  return rows.filter(row => row.before !== '--' || (row.after && row.after !== '--'));
});

const hasAfterData = computed(() => metadataRows.value.some(row => row.after && row.after !== '--'));

const completionPercent = computed(() => {
  if (props.task.status !== 'completed') return null;
  const value = Number(props.task.progress);
  if (Number.isNaN(value)) return '100%';
  const clamped = Math.min(100, Math.max(value, 0));
  return `${Math.round(clamped)}%`;
});
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
