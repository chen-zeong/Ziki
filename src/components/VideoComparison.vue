<template>
  <div class="flex h-full flex-col overflow-hidden" :class="videoPath ? 'gap-4' : 'gap-6'">
    <!-- 预览窗口 -->
    <div
      class="relative w-full aspect-[25/16] rounded-xl bg-white dark:bg-[#181b23] flex items-center justify-center overflow-hidden transition-all duration-300 flex-none"
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
    <div v-if="videoPath" class="flex items-center justify-center w-full gap-3.5 flex-none">
      <div class="relative flex-shrink-0">
        <button
          type="button"
          class="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/15 bg-white dark:bg-[#1b2130] text-slate-600 dark:text-slate-200 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-[#222a3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50"
          :aria-pressed="showTimeRange"
          :aria-label="t('videoComparison.timeRange') || 'Time range'"
          @click.stop="toggleTimeRange"
          ref="timeRangeButtonRef"
        >
          <Scissors class="w-4 h-4" />
        </button>
        <Transition name="time-range-pop">
          <div
            v-if="showTimeRange"
            class="time-range-dropdown absolute left-full top-0 ml-3 z-30 w-[min(22rem,calc(100vw-4rem))] origin-left rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#222221] px-4 py-3 shadow-[0_24px_45px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.65)]"
            @click.stop
            ref="timeRangeDropdownRef"
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
      <div class="flex-1 flex justify-center items-center py-0">
        <FrameSelector
          :video-path="videoPath"
          :selected-frame="selectedFrame"
          :time-range="timeRange"
          :task-id="taskId"
          :compressed-video-path="compressedVideoFilePath"
          @frame-selected="handleFrameSelected"
        />
      </div>
    </div>
    
    <!-- 设置区域 -->
    <div
      class="flex-1 min-h-0 flex flex-col gap-4 transition-all duration-300 overflow-auto"
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
  </div>
</template>
<script setup lang="ts">
import { ref, watch, computed, inject, onMounted, onBeforeUnmount } from 'vue';
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
const timeRangeButtonRef = ref<HTMLButtonElement | null>(null);
const timeRangeDropdownRef = ref<HTMLElement | null>(null);

const currentFile = inject<{ value: VideoFile | null }>('currentFile', { value: null });
const currentVideoMetadata = computed(() => currentFile?.value?.metadata);

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

const handleDocumentClick = (event: MouseEvent) => {
  if (!showTimeRange.value) return;
  const target = event.target as Node | null;
  if (timeRangeButtonRef.value && timeRangeButtonRef.value.contains(target)) return;
  if (timeRangeDropdownRef.value && timeRangeDropdownRef.value.contains(target)) return;
  showTimeRange.value = false;
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

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
.time-range-dropdown {
  transform-origin: 0% 12px;
}
.time-range-dropdown::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 18px;
  width: 10px;
  height: 10px;
  background: inherit;
  border-left: inherit;
  border-top: inherit;
  transform: rotate(45deg);
  border-bottom: none;
  border-right: none;
  box-shadow: -6px 6px 12px rgba(15, 23, 42, 0.08);
}
.dark .time-range-dropdown::before {
  box-shadow: -6px 6px 12px rgba(0, 0, 0, 0.45);
}
.time-range-pop-enter-active,
.time-range-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.time-range-pop-enter-from,
.time-range-pop-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.94);
}
</style>
