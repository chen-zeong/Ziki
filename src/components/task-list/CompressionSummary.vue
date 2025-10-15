<template>
  <div class="border border-slate-200/70 dark:border-white/10 rounded-lg overflow-hidden">
    <table class="w-full text-xs">
      <thead class="bg-slate-50 dark:bg-white/5">
        <tr class="text-slate-500 dark:text-slate-400">
          <th class="py-2 pl-3 text-left font-medium">{{ $t('taskList.metric') }}</th>
          <th class="py-2 text-right font-medium">{{ $t('taskList.before') }}</th>
          <th class="py-2 pr-3 text-right font-medium">{{ $t('taskList.after') }}</th>
        </tr>
      </thead>
      <tbody class="text-slate-600 dark:text-slate-300">
        <tr v-for="row in rows" :key="row.label" class="border-t border-slate-100 dark:border-white/5">
          <td class="py-2 pl-3">{{ row.label }}</td>
          <td class="py-2 text-right">{{ row.before }}</td>
          <td class="py-2 pr-3 text-right">{{ row.after }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CompressionTask } from '../../types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  task: CompressionTask;
}>();

const { t } = useI18n();

const rows = computed(() => {
  const original = props.task.file.metadata || {};
  const compressed = props.task.compressedMetadata || {};
  const formatSize = (value?: number) => {
    if (!value) return '--';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(value) / Math.log(1024));
    return `${parseFloat((value / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };

  return [
    {
      label: t('taskList.fileSize'),
      before: formatSize(props.task.originalSize ?? props.task.file.size),
      after: formatSize(props.task.compressedSize)
    },
    {
      label: t('videoSettings.resolution'),
      before: original.resolution || '--',
      after: compressed.resolution || props.task.settings.resolution || '--'
    },
    {
      label: t('videoSettings.bitrate'),
      before: original.bitrate || '--',
      after: compressed.bitrate || '--'
    },
    {
      label: t('taskList.duration'),
      before: formatDuration(original.duration),
      after: formatDuration(compressed.duration ?? original.duration)
    },
    {
      label: t('taskList.frameRate'),
      before: original.fps ? `${Number(original.fps).toFixed(2)} fps` : '--',
      after: compressed.fps ? `${Number(compressed.fps).toFixed(2)} fps` : '--'
    }
  ];
});

const formatDuration = (seconds?: number) => {
  if (!seconds) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes}:${secs.toString().padStart(2, '0')}`;
};
</script>
