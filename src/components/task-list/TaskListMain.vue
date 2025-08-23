<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 工具栏 -->
    <TaskListToolbar
      :tasks="tasks"
      :selected-statuses="selectedStatuses"
      @add-files="$emit('add-files')"
      @pause-all-tasks="handleBatchPause"
      @start-all-tasks="handleBatchStart"
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
          @delete="deleteTask"
          @toggle-expand="toggleTaskExpansion"
          @pause="pauseTask"
          @resume="resumeTask"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import TaskListToolbar from './TaskListToolbar.vue';
import TaskItem from './TaskItem.vue';
import type { CompressionTask } from '../../types';

interface Props {
  tasks: CompressionTask[];
}

interface Emits {
  (e: 'add-files'): void;
  (e: 'update-task', task: CompressionTask): void;
  (e: 'delete-task', taskId: string): void;
  (e: 'resume-compression', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

// 状态管理
const selectedStatuses = ref(new Set<string>());
const expandedTasks = ref(new Set<string>());
const selectedTasks = ref(new Set<string>());

// 计算属性
const filteredTasks = computed(() => {
  if (selectedStatuses.value.size === 0) {
    return props.tasks;
  }
  return props.tasks.filter(task => selectedStatuses.value.has(task.status));
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
    await invoke('delete_task', { taskId });
    emit('delete-task', taskId);
    expandedTasks.value.delete(taskId);
    selectedTasks.value.delete(taskId);
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
};

const pauseTask = async (taskId: string) => {
  try {
    const task = props.tasks.find(t => t.id === taskId);
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
    const task = props.tasks.find(t => t.id === taskId);
    console.log('Resume task called for:', taskId, 'Task found:', task, 'Task status:', task?.status);
    if (task && task.status === 'paused') {
      console.log('Resuming task by restarting compression:', taskId);
      // 触发重新压缩
      emit('resume-compression', taskId);
    } else {
      console.log('Task not in paused state or not found:', taskId, task?.status);
    }
  } catch (error) {
    console.error('Failed to resume task:', error);
  }
};

const handleBatchPause = async () => {
  const pausableTasks = props.tasks.filter(task => 
    task.status === 'processing' || task.status === 'pending' || task.status === 'queued'
  );
  
  for (const task of pausableTasks) {
    try {
      await invoke('pause_task', { taskId: task.id });
      const updatedTask = { ...task, status: 'paused' as const };
      emit('update-task', updatedTask);
    } catch (error) {
      console.error(`Failed to pause task ${task.id}:`, error);
    }
  }
};

const handleBatchStart = async () => {
  const resumableTasks = props.tasks.filter(task => 
    task.status === 'paused' || task.status === 'failed'
  );
  
  for (const task of resumableTasks) {
    try {
      await invoke('resume_task', { taskId: task.id });
      const updatedTask = { ...task, status: 'queued' as const };
      emit('update-task', updatedTask);
    } catch (error) {
      console.error(`Failed to resume task ${task.id}:`, error);
    }
  }
};

// 监听任务变化，自动清理已删除任务的展开状态
watch(() => props.tasks, (newTasks) => {
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