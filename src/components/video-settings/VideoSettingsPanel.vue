<template>
  <div class="flex flex-col transition-all duration-300">
    <!-- 参数设置内容 -->
    <div class="text-sm">
      <div class="relative">
        <!-- 已完成任务时的交互遮罩 -->
        <div v-if="isSettingsLocked" class="absolute inset-0 z-10 cursor-not-allowed" style="background: transparent;"></div>
        <!-- 基础设置内容 -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-4 content-start" :class="{ 'opacity-50': isSettingsLocked }">
          <div class="space-y-4">
            <VideoFormatSettings v-model="formatSettings" :metadata="currentVideoMetadata" :quality-settings="qualitySettings" @update:quality-settings="handleQualitySettingsUpdate" :hide-quality="true" />
          </div>
          <div class="space-y-4">
            <div class="rounded-xl bg-white dark:bg-[#222221] border border-slate-200/70 dark:border-white/10 p-4 transition-all duration-300 space-y-6">
              <!-- 画质设置 -->
              <QualitySettings 
                v-model="qualitySettings" 
                :resolution="formatSettings.resolution"
                :is-hardware-accelerated="hardwareSettings.value === 'gpu'"
                :current-video-codec="formatSettings.videoCodec"
                :with-card-shell="false"
              />
              <div class="space-y-5">
                <!-- 硬件加速设置 -->
                <HardwareAccelerationSettings 
                  v-model="hardwareSettings" 
                  :current-video-codec="formatSettings.videoCodec"
                  :with-card-shell="false"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, computed, inject, onMounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';

import VideoFormatSettings from './VideoFormatSettings.vue';
import HardwareAccelerationSettings from './HardwareAccelerationSettings.vue';
import QualitySettings from './QualitySettings.vue';
import { useGlobalSettingsStore } from '../../stores/useGlobalSettingsStore';
import { useTaskSettingsStore } from '../../stores/useTaskSettingsStore';
import type { CompressionSettings, VideoFile } from '../../types';

// 主题
const globalSettings = useGlobalSettingsStore();

// 使用任务设置store
const taskSettingsStore = useTaskSettingsStore();

// 注入来自父组件的"当前任务设置"和"更新方法"（保持兼容性）
const injectedTaskSettings = inject<{ value: CompressionSettings | null }>('currentTaskSettings');
const updateCurrentTaskSettings = inject<((updates: Partial<CompressionSettings>) => void) | null>('updateCurrentTaskSettings', null);

// 注入当前文件信息
const currentFile = inject<{ value: VideoFile | null }>('currentFile');

// 注入当前任务ID
const currentTaskId = inject<{ value: string | null }>('currentTaskId', { value: null });

// 计算当前视频的元数据
const currentVideoMetadata = computed(() => {
  return currentFile?.value?.metadata;
});

interface Props {
  isProcessing?: boolean;
  videoPath?: string;
  taskStatus?: string;
  isProcessingBatch?: boolean;
  // 新增：时间段设置
  timeRangeSettings?: any;
}

interface Emits {
  compress: [settings: CompressionSettings];
  // 新增：向父组件透传时间段设置与校验状态
  'update:timeRangeSettings': [settings: any];
  'time-validation-change': [isValid: boolean];
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  isProcessingBatch: false,
  taskStatus: 'pending'
});

const emit = defineEmits<Emits>();

// 是否锁定设置（仅在任务为 排队/压缩中/完成 状态时）
const isSettingsLocked = computed(() => {
  const status = props.taskStatus;
  return status === 'queued' || status === 'processing' || status === 'completed';
});

// 获取当前任务设置
const getCurrentSettings = (): CompressionSettings => {
  if (currentTaskId.value) {
    return taskSettingsStore.getTaskSettings(currentTaskId.value, 'video');
  }
  return taskSettingsStore.getDefaultVideoSettings();
};

// 使用shallowRef避免深度响应式导致的循环更新
const formatSettings = shallowRef<Partial<CompressionSettings>>({
  format: 'mp4',
  videoCodec: 'H.264',
  resolution: 'original' as any,
  customResolution: undefined as any
});

const qualitySettings = shallowRef<Partial<CompressionSettings>>({
  qualityType: 'crf',
  crfValue: 23
});

const hardwareSettings = shallowRef({
  value: 'cpu',
  name: 'CPU编码'
});

// 平台信息
const platform = ref<'macos' | 'windows' | 'linux'>('macos');

// 检测平台
const detectPlatform = async () => {
  try {
    const result = await invoke<string>('get_platform');
    platform.value = result as 'macos' | 'windows' | 'linux';
  } catch (error) {
    console.error('Failed to detect platform:', error);
  }
};

// 处理画质设置更新，避免循环依赖
const handleQualitySettingsUpdate = (newQualitySettings: Partial<CompressionSettings>) => {
  // 使用Object.assign来更新，避免直接赋值
  Object.assign(qualitySettings.value, newQualitySettings);
};

// 根据任务设置应用到本地UI
const applySettingsFromTask = (s: CompressionSettings | null | undefined) => {
  if (!s) {
    resetAllSettings();
    return;
  }
  // 基础格式相关
  formatSettings.value = {
    format: s.format ?? 'mp4',
    videoCodec: s.videoCodec ?? 'H.264',
    resolution: s.resolution ?? undefined as any,
    customResolution: s.customResolution
  };
  // 画质相关
  qualitySettings.value = {
    qualityType: s.qualityType ?? 'crf',
    crfValue: s.crfValue ?? 23,
    qvValue: s.qvValue,
    profileValue: s.profileValue,
    bitDepth: s.bitDepth
  };
  // 硬件加速
  const accel = s.hardwareAcceleration ?? 'cpu';
  hardwareSettings.value = accel === 'gpu' 
    ? { value: 'gpu', name: platform.value === 'macos' ? '显卡' : 'GPU加速' }
    : { value: 'cpu', name: 'CPU编码' };
};

// 重置所有设置
const resetAllSettings = () => {
  const defaults = taskSettingsStore.getDefaultVideoSettings();
  formatSettings.value = {
    format: defaults.format,
    videoCodec: defaults.videoCodec,
    resolution: defaults.resolution,
    customResolution: defaults.customResolution
  };
  qualitySettings.value = {
    qualityType: defaults.qualityType,
    crfValue: defaults.crfValue,
    qvValue: defaults.qvValue,
    profileValue: defaults.profileValue,
    bitDepth: defaults.bitDepth
  };
  hardwareSettings.value = {
    value: defaults.hardwareAcceleration || 'cpu',
    name: defaults.hardwareAcceleration === 'gpu' ? 'GPU编码' : 'CPU编码'
  };
};

// 防止递归更新的标志
const isUpdatingFromTask = ref(false);

// 初始化设置从store加载
const initializeSettings = () => {
  if (currentTaskId.value) {
    const settings = taskSettingsStore.getTaskSettings(currentTaskId.value, 'video');
    isUpdatingFromTask.value = true;
    applySettingsFromTask(settings);
    nextTick(() => {
      isUpdatingFromTask.value = false;
    });
  } else {
    resetAllSettings();
  }
};

// 监听任务ID变化，重新加载设置
watch(() => currentTaskId.value, () => {
  initializeSettings();
}, { immediate: true });

// 监听注入的任务设置变化，应用到本地UI（保持兼容性）
watch(() => injectedTaskSettings?.value, (newSettings) => {
  if (!newSettings) {
    resetAllSettings();
    return;
  }
  isUpdatingFromTask.value = true;
  applySettingsFromTask(newSettings);
  nextTick(() => {
    isUpdatingFromTask.value = false;
  });
}, { deep: true });

// 当 videoPath 变化时，同步面板UI
watch(
  () => props.videoPath,
  () => {
    // 当切换到不同文件时，重新初始化设置
    initializeSettings();
  }
);

// 将面板中的更改持久化到当前任务设置
watch(
  [formatSettings, qualitySettings, hardwareSettings],
  () => {
    // 如果正在从任务设置更新UI，则跳过
    if (isUpdatingFromTask.value) return;
    
    const updates = {
      ...(formatSettings.value as Partial<CompressionSettings>),
      ...(qualitySettings.value as Partial<CompressionSettings>),
      hardwareAcceleration: hardwareSettings.value.value as 'cpu' | 'gpu'
    };
    
    // 更新到store
    if (currentTaskId.value) {
      taskSettingsStore.updateTaskSettings(currentTaskId.value, updates);
    }
    
    // 保持与父组件的兼容性
    if (updateCurrentTaskSettings) {
      updateCurrentTaskSettings(updates);
    }
  },
  { deep: true }
);

// 根据元数据解析位深，提供兜底
const deriveBitDepthFromMetadata = (): 8 | 10 | 12 => {
  const depth = currentVideoMetadata.value?.colorDepth || '';
  if (/12|16/.test(depth)) return 12;
  if (/10/.test(depth)) return 10;
  return 8;
};

// 开始压缩
const startCompression = () => {
  // 添加调试日志
  console.log('Hardware settings:', hardwareSettings.value);
  console.log('Hardware acceleration value:', hardwareSettings.value.value);
  console.log('Format settings:', formatSettings.value);
  console.log('Quality settings:', qualitySettings.value);
  console.log('Quality settings bitDepth:', qualitySettings.value.bitDepth);

  // 计算位深兜底，避免为 undefined
  const finalBitDepth = (qualitySettings.value.bitDepth as 8 | 10 | 12 | undefined) ?? deriveBitDepthFromMetadata();
  console.log('Final bitDepth to emit:', finalBitDepth);
  
  // 合并所有设置
  const compressionSettings: CompressionSettings = {
    ...formatSettings.value,
    ...qualitySettings.value,
    // 确保包含位深
    bitDepth: finalBitDepth,
    // 时间段信息由App.vue中的自定义时间段功能提供
    timeRange: undefined,
    // 添加硬件加速信息
    hardwareAcceleration: hardwareSettings.value.value as 'cpu' | 'gpu',
    videoPath: props.videoPath
  } as CompressionSettings;
  
  console.log('Final compression settings:', compressionSettings);
  console.log('Final compression settings bitDepth:', compressionSettings.bitDepth);
  
  emit('compress', compressionSettings);
};

// 组件挂载时初始化
onMounted(async () => {
  await detectPlatform();
});

// 暴露方法供父组件调用
defineExpose({
  startCompression
});
</script>
