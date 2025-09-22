<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import { useTaskStore } from '../stores/useTaskStore';
import HeaderBar from './HeaderBar.vue';
import MainContent from './MainContent.vue';
import FooterBar from './FooterBar.vue';

interface Props {
  tasks?: any[];
  currentFile: any;
  isUploaderVisible: boolean;
  selectedFiles: any[];
  isProcessing: boolean;
  isProcessingBatch?: boolean;
  selectedTaskId?: string | null;
  outputPath: string;
  timeRangeSettings: any;
  showOutputFolderPopup: boolean;
  showTimeRangePopup: boolean;

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
  'toggle-output-folder-popup',
  'toggle-time-range-popup',
  'output-path-update',
  'time-validation-change',
  'batch-compress',
  'compress',
  'update:timeRangeSettings'
]);

const globalSettings = useGlobalSettingsStore();
const mainContentRef = ref<InstanceType<typeof MainContent> | null>(null);

// 暴露triggerCompress方法给父组件
const triggerCompress = () => {
  if (mainContentRef.value) {
    mainContentRef.value.triggerCompress();
  }
};

// 暴露clearTaskCache方法给父组件
const clearTaskCache = (videoPath: string) => {
  if (mainContentRef.value) {
    mainContentRef.value.clearTaskCache(videoPath);
  }
};

// 新增：暴露refreshPreview方法给父组件
const refreshPreview = () => {
  if (mainContentRef.value && (mainContentRef.value as any).refreshPreview) {
    (mainContentRef.value as any).refreshPreview();
  }
};

defineExpose({
  triggerCompress,
  clearTaskCache,
  refreshPreview
});
</script>

<template>
  <!-- 整个应用窗口容器 -->
  <div class="w-full h-[100dvh] min-h-[100dvh] bg-gray-200 dark:bg-[#1e1e1e] flex flex-col overflow-hidden transition-colors duration-300">
    <!-- 顶部标题栏 -->
    <HeaderBar />

    <!-- 主内容区域 -->
    <MainContent
      ref="mainContentRef"
      :tasks="tasks"
      :current-file="props.currentFile"
      :is-uploader-visible="props.isUploaderVisible"
      :selected-files="props.selectedFiles"
      :is-processing="props.isProcessing"
      :is-processing-batch="props.isProcessingBatch"
      :selected-task-id="selectedTaskId"
      :time-range-settings="props.timeRangeSettings"

      @files-selected="emit('files-selected', $event)"
      @compress="emit('compress', $event)"
      @reset="emit('reset')"
      @update-images="emit('update-images', $event)"
      @update-task="emit('update-task', $event)"
      @delete-task="emit('delete-task', $event)"
      @resume-compression="emit('resume-compression', $event)"
      @pause-task="emit('pause-task', $event)"
      @select-task="emit('select-task', $event)"
      @clear-all-tasks="emit('clear-all-tasks')"
    />

    <!-- 底部状态栏 -->
    <FooterBar
      :tasks="tasks"
      :current-file="props.currentFile"
      :is-processing="props.isProcessing"
      :is-processing-batch="props.isProcessingBatch"
      :output-path="props.outputPath"
      :time-range-settings="props.timeRangeSettings"
      :show-output-folder-popup="props.showOutputFolderPopup"
      :show-time-range-popup="props.showTimeRangePopup"
      @toggle-output-folder-popup="emit('toggle-output-folder-popup')"
      @toggle-time-range-popup="emit('toggle-time-range-popup')"
      @output-path-update="emit('output-path-update', $event)"
      @time-validation-change="emit('time-validation-change', $event)"
      @batch-compress="emit('batch-compress')"
      @bottom-compress="triggerCompress"
      @update:timeRangeSettings="emit('update:timeRangeSettings', $event)"
    />
  </div>
</template>

<style scoped>
/* 确保任务列表容器能够自适应高度变化 */
.lg\:col-span-2 {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 优化按钮悬停效果 */
button {
  transition: all 0.2s ease-in-out;
}

/* 涟漪按钮效果 */
.ripple-button {
  position: relative;
  overflow: hidden;
}

.ripple-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple-button:active::before {
  width: 300px;
  height: 300px;
}

/* 进度蒙版层动画 */
.progress-mask {
  width: 0%;
  animation: progress-fill 3s ease-in-out infinite;
}

@keyframes progress-fill {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 0%;
  }
}
</style>