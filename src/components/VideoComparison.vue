<template>
  <!-- 预览窗口 -->
  <div class="h-3/5 bg-black rounded-md flex items-center justify-center relative mt-4">
    <VideoPreview
      ref="videoPreviewRef"
      :title="title"
      :before-image="beforeImage"
      :after-image="afterImage"
      :video-path="videoPath"
      :compressed-video-path="compressedVideoPath"
      :compressed-video-file-path="compressedVideoFilePath"
      :task-status="taskStatus"
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
        :task-status="taskStatus"
        @compress="handleCompress"
      />
    </template>
    <template v-else>
      <ImageSettingsPanel
        ref="settingsPanelRef"
        :is-processing="isProcessing"
        :task-status="taskStatus"
        @compress="handleCompress"
      />
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
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
  taskStatus?: string;
  timeRange?: {
    start: number;
    end: number;
  };
}

withDefaults(defineProps<Props>(), {
  title: '处理与预览',
  isProcessing: false,
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
  if (videoPreviewRef.value) {
    videoPreviewRef.value.selectFrame(frameIndex);
  }
};

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

// 暴露方法供父组件调用
defineExpose({
  resetFrameData: () => {
    if (videoPreviewRef.value) {
      videoPreviewRef.value.resetFrameData();
    }
  },
  triggerCompress
});
</script>