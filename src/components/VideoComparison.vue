<template>
  <!-- 预览窗口 -->
  <div class="h-3/5 rounded-md flex items-center justify-center relative mt-4">
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
  <div class="my-2" v-if="videoPath">
    <FrameSelector
      :video-path="videoPath"
      :selected-frame="selectedFrame"
      :time-range="timeRange"
      :task-id="taskId"
      :compressed-video-path="compressedVideoFilePath"
      @frame-selected="handleFrameSelected"
    />
  </div>
  
  <!-- 设置区域 -->
  <div class="h-2/5 flex flex-col bg-[#f8fafc] dark:bg-[#1e1e1e] rounded-md overflow-hidden mb-6" :class="!videoPath ? 'mt-6' : ''">
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
import { ref, watch } from 'vue';
import VideoPreview from './VideoPreview.vue';
import VideoSettingsPanel from './video-settings/VideoSettingsPanel.vue';
import ImageSettingsPanel from './image-settings/ImageSettingsPanel.vue';
import FrameSelector from './FrameSelector.vue';

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

// 当自定义时间段变化时，保持当前选中的帧并刷新
watch(() => props.timeRange, (newTimeRange) => {
  if (newTimeRange && videoPreviewRef.value && props.videoPath) {
    const index = selectedFrame.value ?? 0;
    videoPreviewRef.value.selectFrame(index);
  }
}, { deep: true });

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