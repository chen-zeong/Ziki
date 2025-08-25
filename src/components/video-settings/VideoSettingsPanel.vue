<template>
  <div class="h-full flex flex-col">
    <!-- 参数设置内容 -->
    <div class="flex-grow overflow-hidden text-sm">
      <div class="h-full">
        <!-- 基础设置内容 -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-4 h-full">
          <div class="space-y-4">
            <VideoFormatSettings v-model="formatSettings" :metadata="currentVideoMetadata" :quality-settings="qualitySettings" @update:quality-settings="handleQualitySettingsUpdate" :hide-quality="true" />
          </div>
          <div class="space-y-4">
            <!-- 画质设置 -->
            <QualitySettings 
              v-model="qualitySettings" 
              :resolution="formatSettings.resolution"
            />
            <!-- 硬件加速设置 -->
            <HardwareAccelerationSettings 
              v-model="hardwareSettings" 
              :current-video-codec="formatSettings.videoCodec"
            />
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
import { useTheme } from '../../composables/useTheme';
import type { CompressionSettings, VideoFile } from '../../types';

// 主题
const { isDark } = useTheme();

// 注入来自父组件的“当前任务设置”和“更新方法”
const injectedTaskSettings = inject<{ value: CompressionSettings | null }>('currentTaskSettings');
const updateCurrentTaskSettings = inject<((updates: Partial<CompressionSettings>) => void) | null>('updateCurrentTaskSettings', null);

// 注入当前文件信息
const currentFile = inject<{ value: VideoFile | null }>('currentFile');

// 计算当前视频的元数据
const currentVideoMetadata = computed(() => {
  return currentFile?.value?.metadata;
});

interface Props {
  isProcessing?: boolean;
  videoPath?: string;
}

interface Emits {
  compress: [settings: CompressionSettings];
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false
});

const emit = defineEmits<Emits>();

// 使用shallowRef避免深度响应式导致的循环更新
const formatSettings = shallowRef<Partial<CompressionSettings>>({
  format: 'mp4',
  videoCodec: 'libx264',
  resolution: 'original'
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

const isTimeValid = ref(true);

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
    videoCodec: s.videoCodec ?? 'libx264',
    resolution: s.resolution ?? 'original',
    customResolution: s.customResolution
  };
  // 画质相关
  qualitySettings.value = {
    qualityType: s.qualityType ?? 'crf',
    crfValue: s.crfValue ?? 23,
    bitrate: s.bitrate,
    encodingPreset: s.encodingPreset
  };
  // 硬件加速
  const accel = s.hardwareAcceleration ?? (platform.value === 'macos' ? 'gpu' : 'cpu');
  hardwareSettings.value = accel === 'gpu' 
    ? { value: 'gpu', name: platform.value === 'macos' ? '显卡加速' : 'GPU加速' }
    : { value: 'cpu', name: 'CPU编码' };
};

// 重置所有设置
const resetAllSettings = () => {
  formatSettings.value = {
    format: 'mp4',
    videoCodec: 'libx264',
    resolution: 'original'
  };
  qualitySettings.value = {
    qualityType: 'crf',
    crfValue: 23
  };

  // macOS下默认开启硬件加速，其他平台默认CPU编码
  if (platform.value === 'macos') {
    hardwareSettings.value = {
      value: 'gpu',
      name: '显卡加速'
    };
  } else {
    hardwareSettings.value = {
      value: 'cpu',
      name: 'CPU编码'
    };
  }
};

// 防止递归更新的标志
const isUpdatingFromTask = ref(false);

// 当 videoPath 或任务设置变化时，同步面板UI
watch(
  [() => props.videoPath, () => injectedTaskSettings?.value],
  ([, newSettings]) => {
    // 当切换到不同文件时或任务设置变更时，优先使用任务设置；没有则使用默认
    isUpdatingFromTask.value = true;
    applySettingsFromTask(newSettings as CompressionSettings | null | undefined);
    // 使用nextTick确保更新完成后再重置标志
    nextTick(() => {
      isUpdatingFromTask.value = false;
    });
  },
  { immediate: true, deep: true }
);

// 将面板中的更改持久化到当前任务设置
watch(
  [formatSettings, qualitySettings, hardwareSettings],
  () => {
    // 如果正在从任务设置更新UI，则跳过
    if (isUpdatingFromTask.value || !updateCurrentTaskSettings) return;
    updateCurrentTaskSettings({
      ...(formatSettings.value as Partial<CompressionSettings>),
      ...(qualitySettings.value as Partial<CompressionSettings>),
      hardwareAcceleration: hardwareSettings.value.value as 'cpu' | 'gpu'
    });
  },
  { deep: true }
);

// 开始压缩
const startCompression = () => {
  // 添加调试日志
  console.log('Hardware settings:', hardwareSettings.value);
  console.log('Hardware acceleration value:', hardwareSettings.value.value);
  
  // 合并所有设置
  const compressionSettings: CompressionSettings = {
    ...formatSettings.value,
    ...qualitySettings.value,
    // 时间段信息由App.vue中的自定义时间段功能提供
    timeRange: undefined,
    // 添加硬件加速信息
    hardwareAcceleration: hardwareSettings.value.value as 'cpu' | 'gpu',
    videoPath: props.videoPath
  } as CompressionSettings;
  
  console.log('Final compression settings:', compressionSettings);
  
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