<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors"
    :class="badgeClass"
  >
    <component :is="iconMap[status]" class="w-3.5 h-3.5" />
    <span v-if="label">{{ label }}</span>
    <span
      v-if="progressLabel"
      class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-tight shadow-sm transition-colors"
      :class="progressBadgeClass"
    >
      {{ progressLabel }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle, PauseCircle, Clock, AlertTriangle, Loader2, XCircle } from 'lucide-vue-next';
import type { CompressionTask } from '../../types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  status: CompressionTask['status'];
  progress?: string | number | null;
  trend?: 'up' | 'down' | 'flat';
}>();

const { t } = useI18n();

const iconMap = {
  completed: CheckCircle,
  paused: PauseCircle,
  pending: Clock,
  queued: Clock,
  processing: Loader2,
  failed: AlertTriangle,
  cancelled: XCircle
} as const;

const label = computed(() => {
  const map: Record<CompressionTask['status'], string> = {
    completed: '',
    paused: t('taskList.statusPaused'),
    pending: t('taskList.statusPending'),
    queued: t('taskList.statusQueued'),
    processing: t('taskList.statusProcessing'),
    failed: t('taskList.statusFailed'),
    cancelled: t('taskList.statusCancelled')
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
    case 'cancelled':
      return `${base} bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300`;
    case 'paused':
      return `${base} bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300`;
    case 'queued':
      return `${base} bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300`;
    default:
      return `${base} bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300`;
  }
});

const progressLabel = computed(() => {
  if (props.progress === null || props.progress === undefined) return '';
  const value = typeof props.progress === 'number'
    ? props.progress.toString()
    : String(props.progress);
  const trimmed = value.trim();
  return trimmed.length ? trimmed : '';
});

const progressBadgeClass = computed(() => {
  if (props.status === 'completed') {
    if (props.trend === 'down') {
      return 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200';
    }
    if (props.trend === 'up') {
      return 'bg-emerald-100/70 text-rose-600 dark:bg-emerald-400/20 dark:text-rose-200';
    }
    return 'bg-slate-100/75 text-slate-600 dark:bg-white/12 dark:text-slate-200';
  }
  return 'bg-slate-100/80 text-slate-600 dark:bg-white/10 dark:text-slate-200';
});
</script>
