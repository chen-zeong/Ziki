<template>
  <div class="frame-selector bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t('videoComparison.frameSelector') }}</h4>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ selectedFrame !== null ? $t('videoComparison.frameNumber', { number: selectedFrame + 1 }) : $t('videoComparison.noFrameSelected') }}
      </div>
    </div>
    
    <div class="frame-thumbnails-container">
      <div class="flex space-x-2 overflow-x-auto pb-2">
        <button
          v-for="frameIndex in frameCount"
          :key="frameIndex - 1"
          class="frame-thumbnail flex-shrink-0 relative"
          :class="{
            'selected': selectedFrame === frameIndex - 1,
            'loading': loadingFrames.has(frameIndex - 1)
          }"
          @click="selectFrame(frameIndex - 1)"
        >
          <div class="w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded border-2 transition-all duration-200 flex items-center justify-center">
            <div v-if="loadingFrames.has(frameIndex - 1)" class="loading-spinner">
              <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <img 
              v-else-if="frameThumbnails.has(frameIndex - 1)"
              :src="frameThumbnails.get(frameIndex - 1)"
              :alt="$t('videoComparison.frameAlt', { number: frameIndex })"
              class="w-full h-full object-cover rounded"
            >
            <div v-else class="text-xs text-gray-400">
              {{ frameIndex }}
            </div>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400">
            {{ frameIndex }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  videoPath?: string;
  selectedFrame?: number | null;
}

interface Emits {
  frameSelected: [frameIndex: number];
}

const props = withDefaults(defineProps<Props>(), {
  selectedFrame: null
});

const emit = defineEmits<Emits>();

// 帧选择器状态
const frameCount = ref(10); // 默认显示10帧
const frameThumbnails = ref<Map<number, string>>(new Map());
const loadingFrames = ref<Set<number>>(new Set());
const selectedFrame = ref<number | null>(props.selectedFrame);

// 选择帧
const selectFrame = async (frameIndex: number) => {
  selectedFrame.value = frameIndex;
  emit('frameSelected', frameIndex);
  
  // 如果缩略图不存在，生成缩略图
  if (!frameThumbnails.value.has(frameIndex) && props.videoPath) {
    await generateThumbnail(frameIndex);
  }
};

// 生成缩略图
const generateThumbnail = async (frameIndex: number) => {
  if (!props.videoPath || loadingFrames.value.has(frameIndex)) {
    return;
  }
  
  loadingFrames.value.add(frameIndex);
  
  try {
    const thumbnail = await invoke('generate_single_frame', {
      videoPath: props.videoPath,
      frameIndex: frameIndex
    });
    
    frameThumbnails.value.set(frameIndex, thumbnail as string);
  } catch (error) {
    console.error(`Generate frame ${frameIndex} thumbnail failed:`, error);
  } finally {
    loadingFrames.value.delete(frameIndex);
  }
};

// 初始化缩略图
const initializeThumbnails = async () => {
  if (!props.videoPath) return;
  
  // 清理之前的数据
  frameThumbnails.value.clear();
  loadingFrames.value.clear();
  
  // 生成前几帧的缩略图
  for (let i = 0; i < Math.min(5, frameCount.value); i++) {
    await generateThumbnail(i);
  }
};

// 监听视频路径变化
watch(() => props.videoPath, (newPath) => {
  if (newPath) {
    initializeThumbnails();
  } else {
    frameThumbnails.value.clear();
    loadingFrames.value.clear();
    selectedFrame.value = null;
  }
}, { immediate: true });

// 监听外部选择的帧变化
watch(() => props.selectedFrame, (newFrame) => {
  selectedFrame.value = newFrame;
});

// 组件挂载时初始化
onMounted(() => {
  if (props.videoPath) {
    initializeThumbnails();
  }
});
</script>

<style scoped>
.frame-thumbnail {
  transition: all 0.2s ease-in-out;
}

.frame-thumbnail:hover {
  transform: translateY(-2px);
}

.frame-thumbnail.selected .w-16 {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.frame-thumbnail.loading .w-16 {
  border-color: #6b7280;
}

.frame-thumbnails-container {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.frame-thumbnails-container::-webkit-scrollbar {
  height: 6px;
}

.frame-thumbnails-container::-webkit-scrollbar-track {
  background: transparent;
}

.frame-thumbnails-container::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.frame-thumbnails-container::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>