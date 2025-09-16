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
  <div class="h-2/5 flex flex-col bg-white dark:bg-[#1e1e1e] rounded-md overflow-hidden mb-6" :class="!videoPath ? 'mt-6' : ''">
    <template v-if="videoPath">
      <VideoSettingsPanel
        ref="settingsPanelRef"
        :video-path="videoPath"
        :is-processing="isProcessing"
        :is-processing-batch="isProcessingBatch"
        :task-status="taskStatus"
        @compress="handleCompress"
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
  timeRange?: {
    start: number;
    end: number;
  };
}

const props = withDefaults(defineProps<Props>(), {
  title: '处理与预览',
  isProcessing: false,
  isProcessingBatch: false,
  taskStatus: 'pending'
});

const emit = defineEmits<{
  reset: [];
  compress: [settings: any];
  updateImages: [{ beforeImage?: string; afterImage?: string }];
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
    // 只在视频模式下处理帧选择，图片模式跳过
    videoPreviewRef.value.clearFrameCache(frameIndex);
    videoPreviewRef.value.selectFrame(frameIndex);
  }
};

// 当自定义时间段变化时，保持当前选中的帧并刷新
watch(() => props.timeRange, (newTimeRange) => {
  if (newTimeRange && videoPreviewRef.value && props.videoPath) {
    // 只在视频模式下处理时间段变化，图片模式跳过
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
  // 只在视频模式下刷新帧，图片模式跳过
  const index = selectedFrame.value ?? 0;
  // 尝试清除该帧缓存以确保重新生成
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