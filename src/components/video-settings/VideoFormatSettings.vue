<template>
  <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg overflow-visible max-h-full min-h-[280px] flex flex-col">
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">{{ $t('videoSettings.format') }}</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded" style="background-color: #f3f4f6;">{{ metadata.format.toUpperCase() }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="format"
          :options="formatOptions"
          placeholder="选择输出格式"
        />
      </div>
      
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">{{ $t('videoSettings.videoCodec') }}</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded" style="background-color: #f3f4f6;">{{ formatVideoCodec(metadata.videoCodec) }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="videoCodec"
          :options="videoCodecOptions"
          placeholder="选择编码器"
        />
      </div>
      
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">{{ $t('videoSettings.resolution') }}</label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">自定义</span>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              :class="isCustomResolution ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600'"
              @click="toggleCustomResolution"
            >
              <span
                class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
                :class="isCustomResolution ? 'translate-x-5' : 'translate-x-1'"
              ></span>
            </button>
          </div>
        </div>
        <div class="space-y-2">
          <div v-if="isCustomResolution" class="flex gap-1 items-center">
            <CustomNumberInput
              v-model="customWidth"
              :min="1"
              :max="7680"
              placeholder="宽度"
            />
            <button
              type="button"
              class="flex-shrink-0 p-2 text-gray-500 hover:text-orange-500 transition-colors duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              :class="{ 'text-orange-500 hover:bg-orange-50': isAspectRatioLocked }"
              @click="toggleAspectRatioLock"
              title="等比例缩放"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <CustomNumberInput
              v-model="customHeight"
              :min="1"
              :max="4320"
              placeholder="高度"
            />
          </div>
          <CustomSelect 
            v-if="!isCustomResolution"
            v-model="resolution"
            :options="resolutionOptions.filter(opt => opt.value !== 'custom')"
            placeholder="选择分辨率"
          />
        </div>
      </div>
      
      <!-- 画质设置 -->
      <QualitySettings 
        v-model="qualitySettings" 
        :resolution="isCustomResolution ? `${customResolution.width}x${customResolution.height}` : resolution"
        @update:modelValue="emit('update:quality-settings', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import QualitySettings from './QualitySettings.vue';
import { useVideoFormats } from '../../composables/useVideoFormats';
import type { CompressionSettings, VideoMetadata } from '../../types';

interface Props {
  modelValue: Partial<CompressionSettings>;
  metadata?: VideoMetadata;
  qualitySettings?: Partial<CompressionSettings>;
}

interface Emits {
  'update:modelValue': [value: Partial<CompressionSettings>];
  'update:quality-settings': [value: Partial<CompressionSettings>];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const settings = computed({
  get() {
    return props.modelValue;
  },
  set(newValue) {
    emit('update:modelValue', newValue);
  }
});

// 为每个字段创建独立的computed属性以确保响应式更新
const format = computed({
  get() {
    return props.modelValue.format || 'mp4';
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, format: value });
  }
});

const videoCodec = computed({
  get() {
    return props.modelValue.videoCodec || 'H.264';
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, videoCodec: value });
  }
});

const resolution = computed({
  get() {
    return props.modelValue.resolution || '1920x1080';
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, resolution: value });
  }
});

const customResolution = ref({ width: 1920, height: 1080 });
const isCustomResolution = ref(false);
const isAspectRatioLocked = ref(false);

// 质量设置现在通过props传递给QualitySettings组件
const qualitySettings = computed({
  get() {
    return props.qualitySettings || {};
  },
  set(value) {
    emit('update:quality-settings', value);
  }
});
const originalAspectRatio = ref(16/9); // 默认16:9比例

// 为宽度和高度创建computed属性
const customWidth = computed({
  get: () => customResolution.value.width,
  set: (value: number) => {
    customResolution.value = { ...customResolution.value, width: value };
  }
});

const customHeight = computed({
  get: () => customResolution.value.height,
  set: (value: number) => {
    customResolution.value = { ...customResolution.value, height: value };
  }
});

// 使用视频格式配置
const {
  formatOptions: videoFormatOptions,
  supportedVideoCodecs,
  setFormat
} = useVideoFormats();

// 格式选项（添加保持原格式选项）
const formatOptions = computed(() => [
  { value: 'original', label: '保持原格式', description: '不改变原始文件格式' },
  ...videoFormatOptions.value
]);

// 视频编码选项（根据当前选择的格式动态更新）
const videoCodecOptions = computed(() => {
  if (format.value === 'original') {
    // 如果选择保持原格式，显示所有编码选项
    return [
      { value: 'H.264', label: 'H.264' },
      { value: 'H.265', label: 'H.265 (HEVC)' },
      { value: 'VP9', label: 'VP9' },
      { value: 'AV1', label: 'AV1' },
      { value: 'MPEG-4', label: 'MPEG-4' },
      { value: 'Xvid', label: 'Xvid' }
    ];
  }
  
  // 根据选择的格式返回支持的编码
  setFormat(format.value);
  return supportedVideoCodecs.value.map(codec => ({
    value: codec,
    label: codec
  }));
});

// 计算等比例缩放分辨率
const calculateScaledResolutions = (originalResolution: string) => {
  const [width, height] = originalResolution.split('x').map(Number);
  if (!width || !height) return [];
  
  const aspectRatio = width / height;
  const resolutions = [];
  
  // 定义目标高度（从高到低）
  const targetHeights = [1080, 720, 480, 360, 240];
  
  for (const targetHeight of targetHeights) {
    if (targetHeight >= height) continue; // 跳过大于等于原始高度的分辨率
    
    const scaledWidth = Math.round(targetHeight * aspectRatio);
    // 确保宽度是偶数（视频编码要求）
    const evenWidth = scaledWidth % 2 === 0 ? scaledWidth : scaledWidth - 1;
    
    resolutions.push({
      value: `${evenWidth}x${targetHeight}`,
      label: `${evenWidth}x${targetHeight}`,
      description: `等比例缩放至${targetHeight}p`
    });
  }
  
  return resolutions;
};

const resolutionOptions = computed(() => {
  const options = [];
  
  // 如果有metadata，显示实际的原始分辨率
  if (props.metadata) {
    options.push({
      value: 'original',
      label: `${props.metadata.resolution} (原始)`,
      description: '保持原始分辨率'
    });
    
    // 添加等比例缩放的分辨率选项
    const scaledResolutions = calculateScaledResolutions(props.metadata.resolution);
    options.push(...scaledResolutions);
  } else {
    options.push({ value: 'original', label: '原始分辨率' });
    
    // 没有metadata时，添加常规分辨率选项
    options.push(
      { value: '1920x1080', label: '1920x1080 (1080p)' },
      { value: '1280x720', label: '1280x720 (720p)' },
      { value: '854x480', label: '854x480 (480p)' }
    );
  }
  
  // 添加自定义分辨率选项
  options.push({ value: 'custom', label: '自定义分辨率' });
  
  return options;
});

const toggleCustomResolution = () => {
  isCustomResolution.value = !isCustomResolution.value;
  const newSettings = { ...settings.value };
  if (isCustomResolution.value) {
    newSettings.resolution = 'custom';
    // 如果有原始分辨率，使用原始比例
    if (props.metadata) {
      const [width, height] = props.metadata.resolution.split('x').map(Number);
      if (width && height) {
        originalAspectRatio.value = width / height;
        customResolution.value = { width, height };
      }
    }
  } else {
    newSettings.resolution = '1920x1080';
    customResolution.value = { width: 1920, height: 1080 };
    originalAspectRatio.value = 16/9;
  }
  settings.value = newSettings;
};

const toggleAspectRatioLock = () => {
  isAspectRatioLocked.value = !isAspectRatioLocked.value;
  if (isAspectRatioLocked.value) {
    // 激活时，根据当前宽高计算比例
    if (customResolution.value.width && customResolution.value.height) {
      originalAspectRatio.value = customResolution.value.width / customResolution.value.height;
    }
  }
};

// 监听自定义分辨率变化，并更新 settings
watch(customResolution, (newResolution, oldResolution) => {
  if (isCustomResolution.value) {
    // 如果启用了等比例缩放
    if (isAspectRatioLocked.value && oldResolution) {
      // 如果没有有效的原始宽高比，使用当前的宽高比
      if (originalAspectRatio.value <= 0) {
        originalAspectRatio.value = oldResolution.width / oldResolution.height;
      }
      
      // 检查是宽度还是高度发生了变化
      if (newResolution.width !== oldResolution.width && newResolution.width > 0) {
        // 宽度变化，按比例调整高度
        const newHeight = Math.round(newResolution.width / originalAspectRatio.value);
        if (newHeight !== newResolution.height) {
          customResolution.value = { width: newResolution.width, height: newHeight };
          return; // 避免无限循环
        }
      } else if (newResolution.height !== oldResolution.height && newResolution.height > 0) {
        // 高度变化，按比例调整宽度
        const newWidth = Math.round(newResolution.height * originalAspectRatio.value);
        if (newWidth !== newResolution.width) {
          customResolution.value = { width: newWidth, height: newResolution.height };
          return; // 避免无限循环
        }
      }
    }
    
    // 更新settings
    emit('update:modelValue', {
      ...props.modelValue,
      customResolution: newResolution
    });
  }
}, { deep: true });

// 监听分辨率切换，并更新 settings
watch(isCustomResolution, (isCustom) => {
  const newSettings = { ...settings.value };
  if (isCustom) {
    newSettings.resolution = 'custom';
    newSettings.customResolution = customResolution.value;
  } else {
    newSettings.resolution = '1920x1080'; // 或者其他默认值
    delete newSettings.customResolution;
  }
  settings.value = newSettings;
});

// 格式化视频编码名称
const formatVideoCodec = (codec: string): string => {
  const codecMap: Record<string, string> = {
    'H264': 'H.264',
    'H265': 'H.265',
    'HEVC': 'H.265/HEVC',
    'AV1': 'AV1',
    'VP8': 'VP8',
    'VP9': 'VP9',
    'MPEG4': 'MPEG-4',
    'MPEG2VIDEO': 'MPEG-2'
  };
  return codecMap[codec?.toUpperCase()] || codec || '未知';
};

// 监听格式变化，自动调整编码选项
watch(format, (newFormat) => {
  if (newFormat !== 'original') {
    setFormat(newFormat);
    // 检查当前视频编码是否兼容新格式
    const supportedCodecs = supportedVideoCodecs.value;
    if (supportedCodecs.length > 0 && !supportedCodecs.includes(videoCodec.value)) {
      // 如果当前编码不兼容，选择第一个支持的编码
      videoCodec.value = supportedCodecs[0];
    }
  }
});
</script>