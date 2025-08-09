<template>
  <div class="video-comparison-container h-full flex flex-col overflow-hidden">
    <!-- 视频预览区域 -->
    <div class="flex-1 mb-6">
      <VideoPreview
        ref="videoPreviewRef"
        :title="title"
        :before-image="beforeImage"
        :after-image="afterImage"
        :video-path="videoPath"
        :compressed-video-path="compressedVideoPath"
        :compressed-video-file-path="compressedVideoFilePath"
        @reset="$emit('reset')"
        @update-images="handleUpdateImages"
      />
    </div>
    <!-- 参数设置面板 -->
    <div class="flex-shrink-0">
      <VideoSettingsPanel
        :video-path="videoPath"
        @compress="handleCompress"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import VideoPreview from './VideoPreview.vue';
import VideoSettingsPanel from './video-settings/VideoSettingsPanel.vue';

interface Props {
  title?: string;
  beforeImage: string;
  afterImage: string;
  videoPath?: string;
  compressedVideoPath?: string;
  compressedVideoFilePath?: string;
}

withDefaults(defineProps<Props>(), {
  title: '处理与预览'
});

const emit = defineEmits<{
  reset: [];
  compress: [settings: any];
  updateImages: [{ beforeImage?: string; afterImage?: string }];
}>();

// 组件引用
const videoPreviewRef = ref<InstanceType<typeof VideoPreview> | null>(null);

// 处理图片更新
const handleUpdateImages = (data: { beforeImage?: string; afterImage?: string }) => {
  emit('updateImages', data);
};

// 处理压缩事件
const handleCompress = (settings: any) => {
  emit('compress', settings);
};

// 暴露方法供父组件调用
defineExpose({
  resetFrameData: () => {
    if (videoPreviewRef.value) {
      videoPreviewRef.value.resetFrameData();
    }
  }
});
</script>