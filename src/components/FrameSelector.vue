<template>
  <div v-if="props.videoPath" class="frame-selector flex items-center justify-center">
    <div class="frame-selector__pill">
      <button
        v-for="index in 10"
        :key="index"
        :title="`第 ${index} 帧`"
        type="button"
        class="frame-selector__tick"
        :class="{
          'is-active': selectedFrame === index - 1,
          'is-hover': hoveredIndicator === index - 1 && selectedFrame !== index - 1
        }"
        @mouseenter="handleHover(index - 1)"
        @mouseleave="handleHover(null)"
        @click="selectFrame(index - 1)"
      >
        <span class="frame-selector__bar"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  videoPath?: string;
  selectedFrame?: number | null;
  taskId?: string;
  compressedVideoPath?: string;
  timeRange?: {
    start: number;
    end: number;
  };
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
const hoveredIndicator = ref<number | null>(null);

// 选择帧
const selectFrame = (frameIndex: number) => {
  selectedFrame.value = frameIndex;
  
  // 计算当前帧对应的时间（假设10帧均匀分布在时间范围内）
  let frameTime = 0;
  if (props.timeRange && props.timeRange.start !== null && props.timeRange.end !== null) {
    const duration = props.timeRange.end - props.timeRange.start;
    frameTime = props.timeRange.start + (frameIndex / 9) * duration; // 9个间隔分布10帧
  } else {
    // 如果没有时间范围，假设视频总长度为100秒，均匀分布
    frameTime = (frameIndex / 9) * 100;
  }
  
  // 控制台输出调试信息
  console.log('=== 帧选择器点击信息 ===');
  console.log('任务ID:', props.taskId || '未知');
  console.log('原视频路径:', props.videoPath || '未知');
  console.log('压缩视频路径:', props.compressedVideoPath || '未知');
  console.log('当前帧索引:', frameIndex);
  console.log('当前帧时间:', frameTime.toFixed(2) + '秒');
  if (props.timeRange) {
    console.log('时间范围:', `${props.timeRange.start}秒 - ${props.timeRange.end}秒`);
  }
  console.log('========================');
  
  emit('frameSelected', frameIndex);
};

const handleHover = (frameIndex: number | null) => {
  hoveredIndicator.value = frameIndex;
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
  padding: 6px 4px;
}
.frame-selector__pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 4px 8px;
  border-radius: 999px;
}

.frame-selector__tick {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  background: none;
  border: none;
  cursor: pointer;
  appearance: none;
  transition: transform 0.22s ease, filter 0.22s ease;
}

.frame-selector__tick:focus-visible {
  outline: 2px solid rgba(99, 102, 241, 0.4);
  outline-offset: 2px;
}

.frame-selector__tick.is-hover,
.frame-selector__tick:hover {
  transform: none;
}

.frame-selector__bar {
  display: block;
  width: 26px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.55);
  transition: background 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.frame-selector__tick.is-hover .frame-selector__bar,
.frame-selector__tick:hover .frame-selector__bar {
  background: rgba(148, 163, 184, 0.85);
}

.frame-selector__tick.is-active .frame-selector__bar {
  background: rgba(99, 102, 241, 0.95);
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.32);
  transform: scaleX(1.05);
}

:global(.dark) .frame-selector__bar {
  background: rgba(148, 163, 184, 0.55);
}

:global(.dark) .frame-selector__tick.is-hover .frame-selector__bar,
:global(.dark) .frame-selector__tick:hover .frame-selector__bar {
  background: rgba(226, 232, 240, 0.8);
}

:global(.dark) .frame-selector__tick.is-active .frame-selector__bar {
  background: rgba(129, 140, 248, 0.92);
  box-shadow: 0 14px 26px rgba(129, 140, 248, 0.38);
}
</style>
