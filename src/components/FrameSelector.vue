<template>
  <div v-if="props.videoPath" class="frame-selector flex justify-center">
    <div class="flex items-center gap-2 px-3 py-1">
      <div 
        v-for="index in 10" 
        :key="index"
        class="w-8 h-1.5 rounded-full cursor-pointer transition-all duration-200"
        :class="{
          'bg-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500': selectedFrame !== index - 1
        }"
        :style="{
          backgroundColor: selectedFrame === index - 1 ? '#faa539' : ''
        }"
        @click="selectFrame(index - 1)"
        :title="`第 ${index} 帧`"
      >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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
const selectedFrame = ref<number | null>(props.selectedFrame ?? 0);

// 选择帧
const selectFrame = (frameIndex: number) => {
  selectedFrame.value = frameIndex;
  emit('frameSelected', frameIndex);
};

// 监听视频路径变化
watch(() => props.videoPath, (newPath) => {
  if (!newPath) {
    selectedFrame.value = null;
  } else {
    // 默认选中第一帧
    selectedFrame.value = 0;
    emit('frameSelected', 0);
  }
}, { immediate: true });

// 监听外部选择的帧变化
watch(() => props.selectedFrame, (newFrame) => {
  selectedFrame.value = newFrame;
});
</script>

<style scoped>
.frame-selector {
  /* 简化的帧选择器样式 */
}
</style>