<script setup lang="ts">
import { ref, computed, provide, nextTick, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppLayout from './layouts/AppLayout.vue';

import { useFileHandler } from './composables/useFileHandler';
import { useBatchProcessor } from './composables/useBatchProcessor';
import type { CompressionSettings, CompressionTask } from './types';

const {
  tasks,
  currentFile,
  isUploaderVisible,
  selectedFiles,
  isProcessing,
  handleFiles,
  resetUploader,
  startCompression,
  switchToTask,
  deleteTask,
  resumeCompression
} = useFileHandler();

// 批量处理器
const {
  isProcessingBatch,
  startBatchCompression,
  stopBatchCompression,
  resumeBatchCompression,
  getBatchStats
} = useBatchProcessor();

// 选中的任务ID
const selectedTaskId = ref<string | null>(null);

// 当前选中任务
const selectedTask = computed<CompressionTask | null>(() => {
  return tasks.value.find(t => t.id === selectedTaskId.value) || null;
});

// 提供当前文件信息给子组件
provide('currentFile', currentFile);

// 提供“当前任务的设置”和“更新方法”给右侧设置面板
const currentTaskSettings = computed<CompressionSettings | null>(() => selectedTask.value ? selectedTask.value.settings : null);
provide('currentTaskSettings', currentTaskSettings);
provide('updateCurrentTaskSettings', (updates: Partial<CompressionSettings>) => {
  if (!selectedTask.value) return;
  const idx = tasks.value.findIndex(t => t.id === selectedTask.value!.id);
  if (idx !== -1) {
    tasks.value[idx] = {
      ...tasks.value[idx],
      settings: {
        ...tasks.value[idx].settings,
        ...updates
      }
    } as CompressionTask;
  }
});

const showOutputFolder = ref(false);
const showOutputFolderPopup = ref(false);
const outputPath = ref('');
const showTimeRangePopup = ref(false);
const timeRangeSettings = ref({
  enabled: false,
  timeRange: {
    start: '00:00:00',
    end: '00:00:00'
  }
});



const toggleOutputFolderPopup = () => {
  showOutputFolderPopup.value = !showOutputFolderPopup.value;
};

const toggleTimeRangePopup = () => {
  showTimeRangePopup.value = !showTimeRangePopup.value;
};

const handleTimeValidationChange = (isValid: boolean) => {
  // 处理时间验证状态变化
  console.log('Time validation changed:', isValid);
};

const handleTimeRangeSettingsUpdate = (newSettings: any) => {
  timeRangeSettings.value = newSettings;
  // 同步到当前选中任务的设置（以秒为单位存储）
  if (selectedTask.value) {
    const tr = newSettings.enabled ? {
      start: timeToSeconds(newSettings.timeRange.start),
      end: timeToSeconds(newSettings.timeRange.end)
    } : undefined;
    const idx = tasks.value.findIndex(t => t.id === selectedTask.value!.id);
    if (idx !== -1) {
      tasks.value[idx] = {
        ...tasks.value[idx],
        settings: {
          ...tasks.value[idx].settings,
          timeRange: tr
        }
      } as CompressionTask;
    }
  }
};



const handleOutputPathUpdate = (path: string) => {
  outputPath.value = path;
};

const handleOutputFolderClose = () => {
  showOutputFolder.value = false;
};

const beforeImage = computed(() => {
  return currentFile.value?.originalUrl || '';
});

const afterImage = computed(() => {
  return currentFile.value?.compressedUrl || '';
});

const computedTimeRange = computed(() => {
  if (!timeRangeSettings.value.enabled) {
    return undefined;
  }
  const start = timeToSeconds(timeRangeSettings.value.timeRange.start) || 0;
  const end = timeToSeconds(timeRangeSettings.value.timeRange.end) || 0;
  return { start, end };
});

const onFilesSelected = async (files: FileList) => {
  await handleFiles(files);
};

const onCompress = async (settings: CompressionSettings) => {
  if (!currentFile.value) {
    return;
  }
  
  console.log('Starting compression with output path:', outputPath.value);
  console.log('Time range settings:', timeRangeSettings.value);

  // 将时间段设置集成到压缩设置中
  const compressionSettings = {
    ...settings,
    timeRange: timeRangeSettings.value.enabled ? {
      start: timeToSeconds(timeRangeSettings.value.timeRange.start),
      end: timeToSeconds(timeRangeSettings.value.timeRange.end)
    } : undefined
  };

  try {
    await startCompression(compressionSettings, outputPath.value);
  } catch (error) {
    console.error('Compression failed in App.vue:', error);
  }
};

// 时间格式转换：HH:MM:SS 转换为秒数
const timeToSeconds = (timeStr: string): number | null => {
  if (!timeStr || timeStr === '00:00:00') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00:00';
  }
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// 根据任务设置应用时间段到UI
const applyTaskTimeRangeToUI = (task: CompressionTask | null) => {
  if (!task || !task.settings || !task.settings.timeRange) {
    timeRangeSettings.value.enabled = false;
    timeRangeSettings.value.timeRange.start = '00:00:00';
    timeRangeSettings.value.timeRange.end = '00:00:00';
    return;
  }
  const { start, end } = task.settings.timeRange;
  timeRangeSettings.value.enabled = start !== null || end !== null;
  timeRangeSettings.value.timeRange.start = start ? secondsToTime(start) : '00:00:00';
  timeRangeSettings.value.timeRange.end = end ? secondsToTime(end) : '00:00:00';
};

// 监听当前文件变化，以验证和调整时间范围
watch(currentFile, (newFile) => {
  if (newFile && newFile.metadata && timeRangeSettings.value.enabled) {
    const duration = newFile.metadata.duration;
    const startSeconds = timeToSeconds(timeRangeSettings.value.timeRange.start);
    const endSeconds = timeToSeconds(timeRangeSettings.value.timeRange.end);

    // 如果结束时间超过新视频时长，则调整为新视频时长
    if (endSeconds === null || endSeconds === 0 || endSeconds > duration) {
      timeRangeSettings.value.timeRange.end = secondsToTime(duration);
    }
    
    // 如果开始时间超过新视频时长，则重置为0
    if (startSeconds !== null && startSeconds > duration) {
      timeRangeSettings.value.timeRange.start = '00:00:00';
    }
  }
}, { deep: true });

const onUpdateImages = (images: { beforeImage?: string; afterImage?: string }) => {
  if (!currentFile.value) return;
  
  // 检查是否真的需要更新，避免不必要的响应式更新
  const needsUpdate = (
    (images.beforeImage && images.beforeImage !== currentFile.value.originalUrl) ||
    (images.afterImage && images.afterImage !== currentFile.value.compressedUrl)
  );
  
  if (!needsUpdate) return;
  
  // 使用nextTick确保更新在下一个tick中进行，避免递归
  nextTick(() => {
    if (!currentFile.value) return;
    
    // 创建新的文件对象
    const updatedFile = { ...currentFile.value };
    
    if (images.beforeImage && images.beforeImage !== updatedFile.originalUrl) {
      updatedFile.originalUrl = images.beforeImage;
    }
    
    // 注意：afterImage是压缩后的帧图片，不应该覆盖compressedUrl（压缩视频路径）
    // compressedUrl应该保持为压缩后的视频文件路径
    
    // 更新当前文件
    currentFile.value = updatedFile;
    
    // 同时更新selectedFiles中的对应文件
    const fileIndex = selectedFiles.value.findIndex((f: any) => f.id === updatedFile.id);
    if (fileIndex !== -1) {
      selectedFiles.value[fileIndex] = updatedFile;
    }
  });
};

const onReset = () => {
  resetUploader();
};

// 批量压缩处理函数
const handleBatchCompress = async () => {
  console.log('🔥 handleBatchCompress called!');
  console.log('Current isProcessingBatch:', isProcessingBatch.value);
  console.log('Current tasks:', tasks.value.map(t => ({ name: t.file.name, status: t.status })));
  
  if (isProcessingBatch.value) {
    // 如果正在批量处理，则停止
    console.log('Stopping batch compression');
    stopBatchCompression();
    return;
  }
  
  // 检查是否有排队中的任务需要恢复
  const queuedTasks = tasks.value.filter(t => t.status === 'queued');
  const pendingTasks = tasks.value.filter(t => t.status === 'pending');
  
  console.log('Queued tasks:', queuedTasks.length);
  console.log('Pending tasks:', pendingTasks.length);
  
  if (queuedTasks.length > 0 && pendingTasks.length === 0) {
    // 只有排队任务，恢复批量处理
    console.log('Resuming batch compression for queued tasks');
    await resumeBatchCompression(
      tasks.value,
      startCompression,
      switchToTask,
      outputPath.value,
      currentTaskSettings.value // 应用当前设置
    );
  } else {
    // 开始新的批量压缩
    console.log('Starting new batch compression');
    await startBatchCompression(
      tasks.value,
      startCompression,
      switchToTask,
      outputPath.value,
      currentTaskSettings.value // 应用当前设置
    );
  }
};

// AppLayout组件引用
const appLayoutRef = ref<InstanceType<typeof AppLayout> | null>(null);

// 底部按钮的压缩处理
const handleBottomCompress = () => {
  if (appLayoutRef.value) {
    appLayoutRef.value.triggerCompress();
  }
};



// 处理任务状态更新
const updateTask = (updatedTask: CompressionTask) => {
  const taskIndex = tasks.value.findIndex(t => t.id === updatedTask.id);
  if (taskIndex !== -1) {
    tasks.value[taskIndex] = updatedTask;
  }
};

// 处理任务选中
const selectTask = (taskId: string) => {
  selectedTaskId.value = taskId;
  switchToTask(taskId);
  // 将该任务的时间段设置应用到右下角时间段UI
  const t = tasks.value.find(t => t.id === taskId) || null;
  applyTaskTimeRangeToUI(t as CompressionTask | null);
};

// 处理恢复单个任务（支持 paused 与 queued）
const handleResumeCompression = async (taskId: string) => {
  console.log('handleResumeCompression 被调用，taskId:', taskId);
  const task = tasks.value.find(t => t.id === taskId);
  if (!task) {
    console.log('未找到任务:', taskId);
    return;
  }

  console.log('任务状态:', task.status, '批量处理状态:', isProcessingBatch.value);

  try {
    if (task.status === 'paused') {
      console.log('恢复暂停的任务:', taskId);
      // 直接调用已有的恢复逻辑
      await resumeCompression(taskId);
      return;
    }

    if (task.status === 'queued' || task.status === 'pending') {
      // 如果正在批量处理，则优先处理该任务：先暂停当前任务并停止批量队列，防止并发压缩/重复监听
      if (isProcessingBatch.value) {
        console.log('批量处理中，准备优先处理该任务：', taskId, '先暂停当前任务并停止批量队列');

        // 尝试暂停当前正在处理的任务
        const processingTask = tasks.value.find(t => t.status === 'processing');
        if (processingTask) {
          try {
            await invoke('pause_task', { taskId: processingTask.id });
            console.log('已暂停当前任务:', processingTask.id);
          } catch (pauseError) {
            const errorMessage = String(pauseError);
            if (errorMessage.includes('Process was interrupted') || errorMessage.includes('not found')) {
              console.log('当前任务进程已中断/不存在，视为已暂停:', processingTask.id);
            } else {
              console.error('暂停当前任务失败:', pauseError);
            }
          }
          // 同步前端状态为 paused
          const updatedTask = { ...processingTask, status: 'paused' as const };
          updateTask(updatedTask);
        }

        // 停止批量队列（重置 isProcessingBatch 和队列）
        stopBatchCompression();
      }

      console.log('开始处理排队/等待中的任务:', taskId);
      // 切到该任务以确保 startCompression 针对正确的 currentFile
      selectedTaskId.value = taskId;
      switchToTask(taskId);
      applyTaskTimeRangeToUI(task);

      // 使用该任务自身的设置启动压缩，传入 isBatchMode=false 来允许重新启动
      console.log('调用 startCompression，设置:', task.settings);
      await startCompression(task.settings, outputPath.value, false);
      console.log('startCompression 调用完成');

      // 自动恢复批量处理：当该任务完成或暂停后，如仍有排队/待处理任务且当前未处于批量模式，则自动继续批量
      const remainingQueuedOrPending = tasks.value.filter(t => t.status === 'queued' || t.status === 'pending');
      const hasProcessing = tasks.value.some(t => t.status === 'processing');
      if (remainingQueuedOrPending.length > 0 && !hasProcessing && !isProcessingBatch.value) {
        console.log('检测到仍有排队/待处理任务，且未在批量模式，自动恢复批量处理');
        await startBatchCompression(
          tasks.value,
          startCompression,
          switchToTask,
          outputPath.value,
          currentTaskSettings.value
        );
      }
    }
  } catch (e) {
    console.error('handleResumeCompression error:', e);
  }
};

// 初始化输出路径
const initializeOutputPath = async () => {
  try {
    const path = await invoke<string>('get_desktop_path');
    outputPath.value = path;
  } catch (error) {
    console.error('Failed to initialize output path:', error);
  }
};

// 组件挂载时初始化
onMounted(async () => {
  await initializeOutputPath();
});

// 监听任务变化，确保不超过99个，同时在首次有任务时默认选中第一个
watch(tasks, (newTasks) => {
  if (newTasks.length > 99) {
    // 删除最老的任务（按创建时间排序）
    const sortedTasks = [...newTasks].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const tasksToRemove = sortedTasks.slice(0, newTasks.length - 99);
    
    tasksToRemove.forEach(task => {
      deleteTask(task.id);
    });
  }

  // 如果当前没有选中任务且有任务，则默认选中第一个
  if (!selectedTaskId.value && newTasks.length > 0) {
    selectedTaskId.value = newTasks[0].id;
    switchToTask(newTasks[0].id);
    applyTaskTimeRangeToUI(newTasks[0]);
  }
}, { deep: true });


</script>

<template>
  <AppLayout
    ref="appLayoutRef"
    :tasks="tasks"
    :current-file="currentFile"
    :is-uploader-visible="isUploaderVisible"
    :selected-files="selectedFiles"
    :is-processing="isProcessing"
    :is-processing-batch="isProcessingBatch"
    :selected-task-id="selectedTaskId"
    :output-path="outputPath"
    :time-range-settings="timeRangeSettings"
    :show-output-folder-popup="showOutputFolderPopup"
    :show-time-range-popup="showTimeRangePopup"
    @files-selected="onFilesSelected"
    @compress="onCompress"
    @reset="onReset"
    @update-images="onUpdateImages"
    @update-task="updateTask"
    @delete-task="deleteTask"
    @resume-compression="handleResumeCompression"
    @select-task="selectTask"
    @toggle-output-folder-popup="toggleOutputFolderPopup"
    @toggle-time-range-popup="toggleTimeRangePopup"
    @output-path-update="handleOutputPathUpdate"
    @time-validation-change="handleTimeValidationChange"
    @batch-compress="handleBatchCompress"
    @bottom-compress="handleBottomCompress"
    @update:timeRangeSettings="handleTimeRangeSettingsUpdate"
  />




</template>