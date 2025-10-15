<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors"
    :class="badgeClass"
  >
    <component :is="iconMap[status]" class="w-3.5 h-3.5" />
    <span>{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle, PauseCircle, Clock, AlertTriangle, Loader2 } from 'lucide-vue-next';
import type { CompressionTask } from '../../types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  status: CompressionTask['status'];
}>();

const { t } = useI18n();

const iconMap = {
  completed: CheckCircle,
  paused: PauseCircle,
  pending: Clock,
  queued: Clock,
  processing: Loader2,
  failed: AlertTriangle
} as const;

const label = computed(() => {
  const map: Record<CompressionTask['status'], string> = {
    completed: t('taskList.statusCompleted'),
    paused: t('taskList.statusPaused'),
    pending: t('taskList.statusPending'),
    queued: t('taskList.statusQueued'),
    processing: t('taskList.statusProcessing'),
    failed: t('taskList.statusFailed')
  };
  return map[props.status];
});

const badgeClass = computed(() => {
  const base = 'border-slate-200/80 dark:border-white/15';
  switch (props.status) {
    case 'completed':
      return `${base} bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300`;
    case 'processing':
      return `${base} bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200`;
    case 'failed':
      return `${base} bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300`;
    case 'paused':
      return `${base} bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300`;
    case 'queued':
      return `${base} bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300`;
    default:
      return `${base} bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300`;
  }
});
</script>
