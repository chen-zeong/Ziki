<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTaskStore } from '../stores/useTaskStore';
import HeaderBar from './HeaderBar.vue';
import MainContent from './MainContent.vue';

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
  'output-path-update',
  'time-validation-change',
  'batch-compress',
  'undo-compress',
  'update:timeRangeSettings'
]);

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
  <div class="w-full h-[100dvh] min-h-[100dvh] bg-transparent dark:bg-transparent flex flex-col overflow-hidden transition-colors duration-300">
    <!-- 顶部标题栏（改为绝对定位覆盖层，透明背景，不占据布局高度） -->
    <HeaderBar 
      class="absolute top-0 left-0 right-0 z-50"
      :output-path="props.outputPath"
      :show-output-folder-popup="props.showOutputFolderPopup"
      @toggle-output-folder-popup="emit('toggle-output-folder-popup')"
      @output-path-update="emit('output-path-update', $event)"
    />

    <!-- 主内容区域（顶到页面最上方） -->
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
      @update:timeRangeSettings="emit('update:timeRangeSettings', $event)"
      @time-validation-change="emit('time-validation-change', $event)"
      @toggle-output-folder-popup="emit('toggle-output-folder-popup')"
      @batch-compress="emit('batch-compress', $event)"
      @undo-compress="emit('undo-compress')"
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
}
</style>
