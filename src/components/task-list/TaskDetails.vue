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
                <StatusBadge v-if="task" :status="task.status" :progress="completionPercent" />
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

              <section v-if="metadataRows.length" class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {{ $t('taskList.fileInfo') }}
                  </h3>
                  <span
                    v-if="hasAfterData"
                    class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-500 dark:text-sky-300"
                  >
                    {{ $t('taskList.compressionComparison') }}
                  </span>
                </div>
                <div class="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5">
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
import type { CompressionTask, VideoMetadata } from '../../types';
import StatusBadge from './StatusBadge.vue';

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
}>();

defineEmits<{ close: [] }>();

const { t } = useI18n();

const task = computed(() => props.task);
const isVisible = computed(() => props.open && !!task.value);

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
