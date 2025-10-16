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
  'pause-task',
  'select-task',
  'clear-all-tasks',
  // 新增：时间段设置事件
  'update:timeRangeSettings',
  'time-validation-change',
  // 新增：输出文件夹弹窗转发
  'toggle-output-folder-popup'
]);

const showOutputFolder = ref(false);
const videoComparisonRef = ref<InstanceType<typeof VideoComparison> | null>(null);

const beforeImage = computed(() => props.currentFile?.originalUrl || '');
const afterImage = computed(() => props.currentFile?.compressedUrl || '');

const timeToSeconds = (timeStr: string): number | null => {
  if (!timeStr || timeStr === '00:00:00') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return hours * 3600 + minutes * 60 + seconds;
};

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

// 根据文件名/路径推断任务类型
const inferTaskTypeFromFile = (file: any): 'video' | 'image' | null => {
  if (!file) return null;
  const name: string = file.name || file.path || '';
  const lower = name.toLowerCase();
  if (!lower) return null;
  const videoExts = ['mp4','mov','m4v','mkv','avi','wmv','flv','webm','mpeg','mpg','3gp','ogv'];
  const imageExts = ['jpg','jpeg','png','gif','bmp','tiff','tif','webp','svg','ico','heic','heif','avif','jxl'];
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot + 1) : '';
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return null;
};

// 根据当前文件匹配任务类型（video/image）
const currentTaskType = computed(() => {
  const task = tasks.value.find(t => t.file.id === props.currentFile?.id);
  if ((task as any)?.type) return (task as any).type as 'video' | 'image';
  return inferTaskTypeFromFile(props.currentFile) || 'image';
});

// 根据当前文件匹配任务ID
const currentTaskId = computed(() => {
  const task = tasks.value.find(t => t.file.id === props.currentFile?.id);
  return task?.id;
});

const handleOutputFolderClose = () => {
  showOutputFolder.value = false;
};

const handleOutputPathUpdate = (path: string) => {
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
  <main class="flex-grow flex overflow-hidden pr-6 pt-9 gap-6 bg-transparent dark:bg-transparent transition-all duration-300" style="pointer-events: auto;">
    <!-- 左侧面板: 任务队列 -->
    <div class="flex h-full w-1/3 max-w-[420px] -mt-9">
      <div class="flex-1 flex flex-col overflow-hidden bg-white/95 dark:bg-[#101621]/95 border-r border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
        <div class="flex-1 flex flex-col overflow-hidden">
          <div
            v-if="showOutputFolder"
            class="flex-shrink-0 px-4 pt-6 pb-4 border-b border-slate-200/60 dark:border-white/10"
          >
            <OutputFolder
              :show-output-folder="showOutputFolder"
              @update:output-path="handleOutputPathUpdate"
              @close="handleOutputFolderClose"
            />
          </div>

          <div class="flex-1 overflow-hidden">
            <TaskList 
              :tasks="tasks" 
              :selected-task-id="selectedTaskId"
              :show-theme-toggle="false" 
              @add-files="() => { if (!isUploaderVisible) onReset(); }"
              @files-selected="emit('files-selected', $event)"
              @update-task="emit('update-task', $event)"
              @delete-task="emit('delete-task', $event)"
              @resume-compression="emit('resume-compression', $event)"
              @pause-task="emit('pause-task', $event)"
              @select-task="emit('select-task', $event)"
              @clear-all-tasks="emit('clear-all-tasks')"
              @start-compress="triggerCompress"
              @toggle-output-folder="emit('toggle-output-folder-popup')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧面板: 预览和设置 -->
    <div
      class="w-2/3 flex flex-col overflow-hidden transition-all duration-300"
      :class="isUploaderVisible ? 'space-y-8' : 'space-y-5'"
    >
      <!-- File Upload (Visible by default) -->
      <div v-if="isUploaderVisible" class="flex-grow mt-4">
        <div class="h-full rounded-2xl bg-white/80 dark:bg-dark-primary/80 backdrop-blur-md soft-shadow transition-colors">
          <div class="h-full p-3 rounded-xl bg-white dark:bg-[#1e1e1e] flex items-center justify-center">
            <FileUploader @files-selected="emit('files-selected', $event)" />
          </div>
        </div>
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
        :time-range-settings="props.timeRangeSettings"
        @reset="onReset"
        @compress="emit('compress', $event)"
        @update-images="emit('update-images', $event)"
        @update:timeRangeSettings="emit('update:timeRangeSettings', $event)"
        @time-validation-change="emit('time-validation-change', $event)"
      />
    </div>
  </main>

</template>
