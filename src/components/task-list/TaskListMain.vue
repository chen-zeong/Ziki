<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-[#2d2d2d]">
    <!-- 工具栏 -->
    <TaskListToolbar
      :tasks="tasks"
      :selected-statuses="selectedStatuses"
      @add-files="$emit('add-files')"
      @files-selected="$emit('files-selected', $event)"
      @clear-all-tasks="handleClearAllTasks"
      @toggle-status-filter="toggleStatusFilter"
    />
    
    <!-- 任务列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-lg font-medium mb-2">{{ $t('taskList.noTasks') }}</p>
        <p class="text-sm text-center max-w-md">{{ $t('taskList.noTasksDescription') }}</p>
      </div>
      
      <div v-else class="space-y-3">
        <TaskItem
          v-for="task in filteredTasks"
          :key="task.id"
          :task="task"
          :is-expanded="expandedTasks.has(task.id)"
          :is-selected="selectedTaskId === task.id"
          @delete="deleteTask"
          @toggle-expand="toggleTaskExpansion"
          @pause="pauseTask"
          @resume="resumeTask"
          @select="emit('select-task', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { useTaskStore } from '../../stores/useTaskStore';
import TaskListToolbar from './TaskListToolbar.vue';
import TaskItem from './TaskItem.vue';
import type { CompressionTask } from '../../types';

// 使用任务store
const taskStore = useTaskStore();

interface Props {
  // 保持props接口兼容性，但内部使用store
  tasks?: CompressionTask[];
  selectedTaskId?: string | null;
}

interface Emits {
  (e: 'add-files'): void;
  (e: 'files-selected', files: FileList): void;
  (e: 'update-task', task: CompressionTask): void;
  (e: 'delete-task', taskId: string): void;
  (e: 'resume-compression', taskId: string): void;
  (e: 'select-task', taskId: string): void;
  (e: 'clear-all-tasks'): void;
}

const props = defineProps<Props>();

// 使用store中的任务数据，如果props中有tasks则使用props（向后兼容）
const tasks = computed(() => props.tasks || taskStore.tasks);
const selectedTaskId = computed(() => props.selectedTaskId || taskStore.selectedTaskId);
const emit = defineEmits<Emits>();
const { t } = useI18n();

// 状态管理
const selectedStatuses = ref(new Set<string>());
const expandedTasks = ref(new Set<string>());
const selectedTasks = ref(new Set<string>());

// 计算属性
const filteredTasks = computed(() => {
  if (selectedStatuses.value.size === 0) {
    return tasks.value;
  }
  return tasks.value.filter(task => selectedStatuses.value.has(task.status));
});

// 方法
const toggleStatusFilter = (status: string) => {
  if (selectedStatuses.value.has(status)) {
    // 如果当前状态已选中，移除它
    selectedStatuses.value.delete(status);
    // 如果移除后没有选中任何状态，则进入全选状态（清空Set）
    if (selectedStatuses.value.size === 0) {
      selectedStatuses.value.clear();
    }
  } else {
    // 如果当前状态未选中，清空其他选择并只选中当前状态
    selectedStatuses.value.clear();
    selectedStatuses.value.add(status);
  }
};

const toggleTaskExpansion = (taskId: string) => {
  if (expandedTasks.value.has(taskId)) {
    expandedTasks.value.delete(taskId);
  } else {
    expandedTasks.value.add(taskId);
  }
};

const deleteTask = async (taskId: string) => {
  try {
    const task = tasks.value.find(t => t.id === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    // 如果任务正在压缩或已暂停（FFmpeg已开始），需要先取消系统任务
    if (task.status === 'processing' || task.status === 'paused') {
      console.log('Cancelling system task before deletion:', taskId);
      try {
        await invoke('pause_task', { taskId });
        console.log('System task cancelled successfully:', taskId);
      } catch (pauseError) {
        const errorMessage = String(pauseError);
        if (errorMessage.includes('Process was interrupted') || errorMessage.includes('not found')) {
          console.log('System task already interrupted/not found:', taskId);
        } else {
          console.warn('Failed to cancel system task, proceeding with deletion:', pauseError);
        }
      }
    }

    // 调用后端删除任务
    await invoke('delete_task', { taskId });
    
    // 通知父组件删除任务
    emit('delete-task', taskId);
    
    // 清理本地状态
    expandedTasks.value.delete(taskId);
    selectedTasks.value.delete(taskId);
    
    console.log('Task deleted successfully:', taskId);
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
};

const pauseTask = async (taskId: string) => {
  try {
    const task = tasks.value.find(t => t.id === taskId);
    console.log('Pause task called for:', taskId, 'Task found:', task, 'Task status:', task?.status);
    if (task && task.status === 'processing') {
      console.log('Calling pause_task for:', taskId);
      try {
        await invoke('pause_task', { taskId });
        console.log('Task paused successfully:', taskId);
      } catch (pauseError) {
        // 检查是否是因为进程被中断而失败
        const errorMessage = String(pauseError);
        if (errorMessage.includes('Process was interrupted') || errorMessage.includes('not found')) {
          console.log('Task was interrupted/killed, treating as paused:', taskId);
        } else {
          throw pauseError; // 重新抛出其他类型的错误
        }
      }
      // 无论是成功暂停还是进程被中断，都更新状态为paused
      const updatedTask = { ...task, status: 'paused' as const };
      emit('update-task', updatedTask);
    } else {
      console.log('Task not in processing state or not found:', taskId, task?.status);
    }
  } catch (error) {
    console.error('Failed to pause task:', error);
  }
};

const resumeTask = async (taskId: string) => {
  try {
    const task = tasks.value.find(t => t.id === taskId);
    console.log('Resume task called for:', taskId, 'Task found:', task, 'Task status:', task?.status);
    if (task && (task.status === 'paused' || task.status === 'queued')) {
      console.log('Resuming task by restarting compression:', taskId);
      // 触发重新压缩
      emit('resume-compression', taskId);
    } else {
      console.log('Task not in paused/queued state or not found:', taskId, task?.status);
    }
  } catch (error) {
    console.error('Failed to resume task:', error);
  }
};

const handleClearAllTasks = () => {
  emit('clear-all-tasks');
};

// 监听任务变化，自动清理已删除任务的展开状态
watch(tasks, (newTasks) => {
  const taskIds = new Set(newTasks.map(task => task.id));
  
  // 清理已删除任务的展开状态
  for (const taskId of expandedTasks.value) {
    if (!taskIds.has(taskId)) {
      expandedTasks.value.delete(taskId);
    }
  }
  
  // 清理已删除任务的选中状态
  for (const taskId of selectedTasks.value) {
    if (!taskIds.has(taskId)) {
      selectedTasks.value.delete(taskId);
    }
  }
}, { deep: true });
</script>