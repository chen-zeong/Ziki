<template>
  <TaskListMain
    :tasks="tasks"
    :selected-task-id="selectedTaskId"
    @add-files="$emit('add-files')"
    @files-selected="$emit('files-selected', $event)"
    @update-task="$emit('update-task', $event)"
    @delete-task="$emit('delete-task', $event)"
    @resume-compression="$emit('resume-compression', $event)"
    @pause-task="$emit('pause-task', $event)"
    @select-task="$emit('select-task', $event)"
    @clear-all-tasks="$emit('clear-all-tasks')"
    @start-compress="$emit('start-compress')"
    @toggle-output-folder="$emit('toggle-output-folder')"
  />
</template>

<script setup lang="ts">
import TaskListMain from './task-list/TaskListMain.vue';
import type { CompressionTask } from '../types';

interface Props {
  tasks: CompressionTask[];
  selectedTaskId?: string | null;
}

interface Emits {
  (e: 'add-files'): void;
  (e: 'files-selected', files: FileList): void;
  (e: 'update-task', task: CompressionTask): void;
  (e: 'delete-task', taskId: string): void;
  (e: 'resume-compression', taskId: string): void;
  (e: 'pause-task', taskId: string): void;
  (e: 'select-task', taskId: string): void;
  (e: 'clear-all-tasks'): void;
  (e: 'start-compress'): void;
  (e: 'toggle-output-folder'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
</script>
