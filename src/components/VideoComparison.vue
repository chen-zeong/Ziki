<template>
  <!-- 预览窗口 -->
  <div
    class="relative w-full aspect-[4/3] lg:aspect-[5/4] rounded-2xl bg-white dark:bg-[#181b23] flex items-center justify-center transition-all duration-300 shadow-[0_12px_35px_rgba(15,23,42,0.12)]"
  >
    <VideoPreview
      ref="videoPreviewRef"
      :title="title"
      :before-image="beforeImage"
      :after-image="afterImage"
      :video-path="videoPath"
      :compressed-video-path="compressedVideoPath"
      :compressed-video-file-path="compressedVideoFilePath"
      :task-status="taskStatus"
      :task-id="taskId"
      :time-range="timeRange"

      @reset="$emit('reset')"
      @update-images="handleUpdateImages"
    />
  </div>
  
  <!-- 帧选择器（仅视频显示） -->
  <div v-if="videoPath" class="relative my-3 flex justify-center">
    <div class="px-12">
      <FrameSelector
        :video-path="videoPath"
        :selected-frame="selectedFrame"
        :time-range="timeRange"
        :task-id="taskId"
        :compressed-video-path="compressedVideoFilePath"
        @frame-selected="handleFrameSelected"
      />
    </div>
    <button
      type="button"
      class="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full border border-slate-200/80 dark:border-white/15 bg-white dark:bg-[#1b2130] text-slate-600 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-[#222a3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50"
      :aria-pressed="showTimeRange"
      :aria-label="t('videoComparison.timeRange') || 'Time range'"
      @click="toggleTimeRange"
    >
      <Scissors class="w-4 h-4" />
    </button>
    <Transition name="time-range-fade">
      <div
        v-if="showTimeRange"
        class="absolute left-0 top-full mt-3 z-20 w-[min(22rem,calc(100vw-4rem))] rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#181f2e] px-4 py-3 shadow-[0_24px_45px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.65)]"
      >
        <TimeRangeSettings
          :modelValue="timeRangeSettings"
          :metadata="currentVideoMetadata"
          @update:modelValue="handleTimeRangeUpdate"
          @validationChange="handleTimeValidation"
        />
      </div>
    </Transition>
  </div>
  
  <!-- 设置区域 -->
  <div
    class="h-2/5 flex flex-col gap-4 transition-all duration-300"
    :class="videoPath ? '' : 'mt-2'"
  >
    <template v-if="videoPath">
      <VideoSettingsPanel
        ref="settingsPanelRef"
        :video-path="videoPath"
        :is-processing="isProcessing"
        :is-processing-batch="isProcessingBatch"
        :task-status="taskStatus"
        :time-range-settings="timeRangeSettings"
        @compress="handleCompress"
        @update:timeRangeSettings="$emit('update:timeRangeSettings', $event)"
        @time-validation-change="$emit('time-validation-change', $event)"
      />
    </template>
    <template v-else>
      <ImageSettingsPanel
        ref="settingsPanelRef"
        :is-processing="isProcessing"
        :is-processing-batch="isProcessingBatch"
        :task-status="taskStatus"
        @compress="handleCompress"
      />
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { Scissors } from 'lucide-vue-next';
import VideoPreview from './VideoPreview.vue';
import VideoSettingsPanel from './video-settings/VideoSettingsPanel.vue';
import ImageSettingsPanel from './image-settings/ImageSettingsPanel.vue';
import FrameSelector from './FrameSelector.vue';
import TimeRangeSettings from './video-settings/TimeRangeSettings.vue';
import type { VideoFile } from '../types';

interface Props {
  title?: string;
  beforeImage: string;
  afterImage: string;
  videoPath?: string;
  compressedVideoPath?: string;
  compressedVideoFilePath?: string;
  isProcessing?: boolean;
  isProcessingBatch?: boolean;
  taskStatus?: string;
  taskId?: string;
  timeRange?: { start: number; end: number };
  timeRangeSettings?: any;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  isProcessing: false,
  isProcessingBatch: false,
  taskStatus: 'pending'
});

const emit = defineEmits<{
  reset: [];
  compress: [settings: any];
  updateImages: [{ beforeImage?: string; afterImage?: string }];
  'update:timeRangeSettings': [settings: any];
  'time-validation-change': [isValid: boolean];
}>();

// 组件引用
const videoPreviewRef = ref<InstanceType<typeof VideoPreview> | null>(null);
const settingsPanelRef = ref<any | null>(null);
const { t } = useI18n();
const showTimeRange = ref(false);

const currentFile = inject<{ value: VideoFile | null }>('currentFile', { value: null });
const currentVideoMetadata = computed(() => currentFile?.value?.metadata || null);

// 帧选择器状态
const selectedFrame = ref<number | null>(null);

// 处理帧选择
const handleFrameSelected = (frameIndex: number) => {
  selectedFrame.value = frameIndex;
  if (videoPreviewRef.value && props.videoPath) {
    videoPreviewRef.value.clearFrameCache(frameIndex);
    videoPreviewRef.value.selectFrame(frameIndex);
  }
};

const toggleTimeRange = () => {
  showTimeRange.value = !showTimeRange.value;
};

const handleTimeRangeUpdate = (val: any) => {
  emit('update:timeRangeSettings', val);
};

const handleTimeValidation = (isValid: boolean) => {
  emit('time-validation-change', isValid);
};

// 当自定义时间段变化时，保持当前选中的帧并刷新
watch(() => props.timeRange, (newTimeRange) => {
  if (newTimeRange && videoPreviewRef.value && props.videoPath) {
    const index = selectedFrame.value ?? 0;
    const instance = videoPreviewRef.value as any;
    if (instance && typeof instance.clearFrameCache === 'function') {
      instance.clearFrameCache(index);
    }
    if (instance && typeof instance.selectFrame === 'function') {
      instance.selectFrame(index);
    }
  }
}, { deep: true });

watch(() => props.videoPath, () => {
  showTimeRange.value = false;
});

// 处理图片更新
const handleUpdateImages = (data: { beforeImage?: string; afterImage?: string }) => {
  emit('updateImages', data);
};

// 处理压缩事件
const handleCompress = (settings: any) => {
  emit('compress', settings);
};

// 触发压缩
const triggerCompress = () => {
  if (settingsPanelRef.value && typeof settingsPanelRef.value.startCompression === 'function') {
    settingsPanelRef.value.startCompression();
  }
};

// 新增：强制刷新当前预览帧
const refreshPreview = () => {
  if (!videoPreviewRef.value || !props.videoPath) return;
  const index = selectedFrame.value ?? 0;
  if (typeof (videoPreviewRef.value as any).clearFrameCache === 'function') {
    (videoPreviewRef.value as any).clearFrameCache(index);
  }
  if (typeof (videoPreviewRef.value as any).selectFrame === 'function') {
    (videoPreviewRef.value as any).selectFrame(index);
  }
};

// 暴露方法供父组件调用
defineExpose({
  resetFrameData: () => {
    if (videoPreviewRef.value) {
      (videoPreviewRef.value as any).resetFrameData();
    }
  },
  clearTaskCache: (videoPath?: string) => {
    if (videoPreviewRef.value) {
      (videoPreviewRef.value as any).clearTaskCache(videoPath);
    }
  },
  triggerCompress,
  refreshPreview
});
</script>

<style scoped>
.time-range-fade-enter-active,
.time-range-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.time-range-fade-enter-from,
.time-range-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
