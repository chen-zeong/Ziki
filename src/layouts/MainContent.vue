<script setup lang="ts">
import { ref, computed } from 'vue';
import FileUploader from '../components/FileUploader.vue';
import VideoComparison from '../components/VideoComparison.vue';
import TaskList from '../components/TaskList.vue';
import OutputFolder from '../components/OutputFolder.vue';
import { useTaskStore } from '../stores/useTaskStore';
import type { CompressionTask } from '../types';

interface Props {
  tasks?: CompressionTask[];
  currentFile: any;
  isUploaderVisible: boolean;
  selectedFiles: any[];
  isProcessing: boolean;
  isProcessingBatch?: boolean;
  selectedTaskId?: string | null;
  timeRangeSettings: any;
}

const props = defineProps<Props>();
const taskStore = useTaskStore();

// 从store或props获取数据
const tasks = computed(() => props.tasks || taskStore.tasks);
const selectedTaskId = computed(() => props.selectedTaskId || taskStore.selectedTaskId);

const emit = defineEmits([
  'files-selected',
  'compress',
  'reset',
  'update-images',
  'update-task',
  'delete-task',
  'resume-compression',
  'select-task',
  'clear-all-tasks'
]);

const showOutputFolder = ref(false);
const videoComparisonRef = ref<InstanceType<typeof VideoComparison> | null>(null);

const beforeImage = computed(() => {
  return props.currentFile?.originalUrl || '';
});

const afterImage = computed(() => {
  const result = props.currentFile?.compressedUrl || '';
  console.log('[MainContent] afterImage computed:', {
    currentFileId: props.currentFile?.id,
    currentFileName: props.currentFile?.name,
    compressedUrl: props.currentFile?.compressedUrl,
    compressedPath: props.currentFile?.compressedPath,
    result: result
  });
  return result;
});

const computedTimeRange = computed(() => {
  if (!props.timeRangeSettings.enabled) {
    return undefined;
  }
  const start = timeToSeconds(props.timeRangeSettings.timeRange.start) || 0;
  const end = timeToSeconds(props.timeRangeSettings.timeRange.end) || 0;
  return { start, end };
});

// 根据当前文件匹配任务状态
const currentTaskStatus = computed(() => {
  const task = tasks.value.find(t => t.file.id === props.currentFile?.id);
  return task?.status || 'pending';
});

// 根据当前文件匹配任务类型（video/image）
const currentTaskType = computed(() => {
  const task = tasks.value.find(t => t.file.id === props.currentFile?.id);
  return (task as any)?.type || 'video';
});

// 根据当前文件匹配任务ID
const currentTaskId = computed(() => {
  const task = tasks.value.find(t => t.file.id === props.currentFile?.id);
  return task?.id;
});

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

const handleOutputFolderClose = () => {
  showOutputFolder.value = false;
};

const handleOutputPathUpdate = (path: string) => {
  // 这个功能需要在父组件中处理
  console.log('Output path updated:', path);
};

const onReset = () => {
  emit('reset');
};

// 暴露VideoComparison组件的方法给父组件
const triggerCompress = () => {
  if (videoComparisonRef.value) {
    videoComparisonRef.value.triggerCompress();
  }
};

// 清理任务缓存
const clearTaskCache = (videoPath?: string) => {
  if (videoComparisonRef.value) {
    videoComparisonRef.value.clearTaskCache(videoPath);
  }
};

// 新增：强制刷新当前预览帧
const refreshPreview = () => {
  if (videoComparisonRef.value && (videoComparisonRef.value as any).refreshPreview) {
    (videoComparisonRef.value as any).refreshPreview();
  }
};

defineExpose({
  triggerCompress,
  clearTaskCache,
  refreshPreview
});
</script>

<template>
  <!-- 主内容区域 -->
  <main class="flex-grow flex pr-3 space-x-3 overflow-hidden bg-white dark:bg-dark-primary" style="pointer-events: auto;">
    <!-- 左侧面板: 任务队列 -->
    <div class="w-1/3 flex flex-col">
      <div class="flex-grow overflow-hidden">
        <!-- Output Folder Settings (Expandable) -->
        <OutputFolder
          v-if="showOutputFolder"
          :show-output-folder="showOutputFolder"
          @update:output-path="handleOutputPathUpdate"
          @close="handleOutputFolderClose"
        />
        
        <!-- Task List -->
        <TaskList 
          :tasks="tasks" 
          :selected-task-id="selectedTaskId"
          :show-theme-toggle="false" 
          @add-files="() => { if (!isUploaderVisible) onReset(); }"
          @files-selected="emit('files-selected', $event)"
          @update-task="emit('update-task', $event)"
          @delete-task="emit('delete-task', $event)"
          @resume-compression="emit('resume-compression', $event)"
          @select-task="emit('select-task', $event)"
          @clear-all-tasks="emit('clear-all-tasks')"
        />
      </div>
    </div>

    <!-- 右侧面板: 预览和设置 -->
    <div class="w-2/3 flex flex-col overflow-hidden" :class="isUploaderVisible ? 'space-y-6' : 'space-y-3'">
      <!-- File Upload (Visible by default) -->
      <div v-if="isUploaderVisible" class="flex-grow bg-white dark:bg-[#1e1e1e] rounded-md flex items-center justify-center">
        <FileUploader @files-selected="emit('files-selected', $event)" />
      </div>

      <!-- Quality Comparison & Settings (Hidden by default) -->
      <VideoComparison 
        v-else
        ref="videoComparisonRef"
        :title="currentFile?.name"
        :before-image="beforeImage"
        :after-image="afterImage"
        :is-processing="isProcessing"
        :is-processing-batch="props.isProcessingBatch"
        :task-status="currentTaskStatus"
        :task-id="currentTaskId"
        :video-path="currentTaskType === 'video' ? currentFile?.path : undefined"
        :compressed-video-path="currentTaskType === 'video' ? currentFile?.compressedUrl : undefined"
        :compressed-video-file-path="currentTaskType === 'video' ? currentFile?.compressedPath : undefined"
        :time-range="currentTaskType === 'video' ? computedTimeRange : undefined"
        @reset="onReset"
        @compress="emit('compress', $event)"
        @update-images="emit('update-images', $event)"
      />
    </div>
  </main>
</template>