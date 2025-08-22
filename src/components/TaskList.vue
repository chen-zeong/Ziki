<template>
  <TaskListMain
    :tasks="tasks"
    @add-files="$emit('add-files')"
    @update-task="$emit('update-task', $event)"
    @delete-task="$emit('delete-task', $event)"
  />
</template>

<script setup lang="ts">
import TaskListMain from './task-list/TaskListMain.vue';
import type { CompressionTask } from '../types';

interface Props {
  tasks: CompressionTask[];
}

interface Emits {
  (e: 'add-files'): void;
  (e: 'update-task', task: CompressionTask): void;
  (e: 'delete-task', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
</script>