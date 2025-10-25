<template>
  <div class="flex items-center gap-2">
    <span class="text-xs text-slate-500 dark:text-slate-400">{{ label }}</span>
    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
}>();
</script>
