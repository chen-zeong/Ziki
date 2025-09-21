<template>
  <div class="bg-gray-50 dark:bg-[#1e1e1e] p-3 rounded-lg overflow-visible max-h-full min-h-[280px] flex flex-col">
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">{{ $t('videoSettings.format') }}</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-dark-secondary">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600">{{ metadata.format.toUpperCase() }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="format"
          :options="formatOptions"
          :placeholder="t('videoSettings.selectOutputFormat')"
          dropdown-direction="down"
          :teleport-to-body="true"
          strict-direction
          :max-visible-options="4"
        />
      </div>
      
      <!-- 视频编码选择 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">{{ $t('videoSettings.videoCodec') }}</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-dark-secondary">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600">{{ metadata.videoCodec?.toUpperCase() || t('common.unknown') }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="videoCodec"
          :options="videoCodecOptions"
          :placeholder="t('videoSettings.selectVideoCodec')"
          dropdown-direction="down"
          strict-direction
          :teleport-to-body="true"
          :max-visible-options="4"
        />
      </div>
      
      <!-- 分辨率选择 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">{{ $t('videoSettings.resolution') }}</label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-dark-secondary">{{ t('videoSettings.custom') }}</span>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              :style="{ backgroundColor: isCustomResolution ? '#5492dc' : '' }"
              :class="isCustomResolution ? '' : 'bg-gray-200 dark:bg-dark-border'"
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
              :placeholder="t('videoSettings.width')"
            />
            <button
              type="button"
              class="flex-shrink-0 p-2 text-gray-500 hover:text-orange-500 transition-colors duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-dark-border"
              :class="{ 'hover:bg-blue-50': isAspectRatioLocked }"
              :style="{ color: isAspectRatioLocked ? '#5492dc' : '' }"
              @click="toggleAspectRatioLock"
              :title="t('videoSettings.lockAspectRatio')"
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
              :placeholder="t('videoSettings.height')"
            />
          </div>
          <CustomSelect 
            v-if="!isCustomResolution"
            v-model="resolution"
            :options="resolutionOptionsNoCustom"
            :placeholder="metadata?.resolution ? `${metadata.resolution}` : t('videoSettings.selectResolution')"
            dropdown-direction="up"
            strict-direction
            :teleport-to-body="true"
            :max-visible-options="4"
          />
        </div>
      </div>
      
      <!-- 画质设置 -->
      <div v-if="!hideQuality">
        <QualitySettings 
          :model-value="qualitySettings || {}"
          :resolution="resolution"
          @update:model-value="$emit('update:quality-settings', $event)"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import QualitySettings from './QualitySettings.vue';
import { useVideoFormats } from '../../composables/useVideoFormats';
import type { CompressionSettings, VideoMetadata } from '../../types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  modelValue: Partial<CompressionSettings>;
  metadata?: VideoMetadata;
  qualitySettings?: Partial<CompressionSettings>;
  hideQuality?: boolean;
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
    // 当未设置或为 'original' 时，UI 显示原始分辨率的实际字符串值，确保下拉选中高亮
    if (!props.modelValue.resolution || props.modelValue.resolution === 'original') {
      if (props.metadata?.resolution) return props.metadata.resolution as any;
      return '1920x1080';
    }
    return props.modelValue.resolution;
  },
  set(value: 'original' | '1920x1080' | '1280x720' | '854x480' | 'custom') {
    emit('update:modelValue', { ...props.modelValue, resolution: value });
  }
});

const customResolution = ref({ width: 1920, height: 1080 });
const isCustomResolution = ref(false);
const isAspectRatioLocked = ref(true);

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

// 格式选项（移除“保持原格式”选项）
const formatOptions = computed(() => [
  ...videoFormatOptions.value
]);

// 视频编码选项（根据当前选择的格式动态更新）
const videoCodecOptions = computed(() => {
  // 根据选择的格式返回支持的编码
  setFormat(format.value);
  return supportedVideoCodecs.value.map(codec => ({
    value: codec,
    label: codec,
    tags: getVideoCodecTags(codec)
  }));
});

// 获取视频编码标签
const getVideoCodecTags = (codec: string): string[] => {
  const c = (codec || '').toUpperCase();
  if (c.includes('H.264') || c === 'H264') return [t('videoSettings.tagHighCompatibility'), t('videoSettings.tagPopular')];
  if (c.includes('H.265') || c.includes('HEVC') || c === 'H265') return [t('videoSettings.tagHighEfficiency'), t('videoSettings.tagTenBitSupport')];
  if (c.includes('AV1')) return [t('videoSettings.tagMoreEfficient'), t('videoSettings.tagComplexEncoding')];
  if (c.includes('VP9')) return ['Web', 'Google'];
  if (c.includes('VP8')) return ['Web', t('videoSettings.tagLegacy')];
  if (c.includes('PRORES')) return [t('videoSettings.tagProfessional'), t('videoSettings.tagApple')];
  if (c.includes('MPEG-4') || c.includes('MPEG4') || c.includes('XVID')) return [t('videoSettings.tagLegacy')];
  if (c.includes('MPEG-2') || c.includes('MPEG2')) return [t('videoSettings.tagLegacy')];
  if (c.includes('WMV')) return [t('videoSettings.tagWindows')];
  if (c.includes('THEORA')) return [t('videoSettings.tagOpenSource'), t('videoSettings.tagLegacy')];
  return [];
};

// 获取分辨率标签
const getResolutionTags = (resolution: string): string[] => {
  if (resolution.includes('1080')) return ['1080p'];
  if (resolution.includes('720')) return ['720p'];
  if (resolution.includes('480')) return ['480p'];
  if (resolution.includes('360')) return ['360p'];
  if (resolution.includes('240')) return ['240p'];
  if (resolution.includes('2160')) return ['4K'];
  if (resolution.includes('1440')) return ['2K'];
  if (resolution === 'original' || resolution.includes('原始')) return [t('videoSettings.original')];
  return [];
};

// 计算等比例缩放分辨率
const calculateScaledResolutions = (originalResolution: string) => {
  const [width, height] = originalResolution.split('x').map(Number);
  if (!width || !height) return [];
  
  const aspectRatio = width / height;
  const resolutions = [] as { value: string; label: string; tags?: string[] }[];
  
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
      tags: getResolutionTags(`${evenWidth}x${targetHeight}`)
    });
  }
  
  return resolutions;
};

const resolutionOptions = computed(() => {
  const options: { value: string; label: string; tags?: string[] }[] = [];
  
  // 如果有metadata，首先添加原始分辨率选项
  if (props.metadata) {
    // 添加原始分辨率选项
    options.push({
      value: 'original',
      label: `${props.metadata.resolution} (${t('videoSettings.original')})`,
      tags: [t('videoSettings.original')]
    });
    
    // 添加等比例缩放的分辨率选项
    const scaledResolutions = calculateScaledResolutions(props.metadata.resolution);
    options.push(...scaledResolutions);
  } else {
    // 没有metadata时，添加常规分辨率选项
    options.push(
      { value: '1920x1080', label: '1920x1080', tags: ['1080p'] },
      { value: '1280x720', label: '1280x720', tags: ['720p'] },
      { value: '854x480', label: '854x480', tags: ['480p'] }
    );
  }
  
  // 添加自定义分辨率选项
  options.push({ value: 'custom', label: t('videoSettings.customResolution') });
  
  return options;
});

const resolutionOptionsNoCustom = computed(() => {
  return resolutionOptions.value.filter(opt => opt.value !== 'custom');
});

const toggleCustomResolution = () => {
  isCustomResolution.value = !isCustomResolution.value;
  const newSettings: Partial<CompressionSettings> = { ...props.modelValue };

  if (isCustomResolution.value) {
    newSettings.resolution = 'custom';
    if (props.metadata) {
      const [width, height] = props.metadata.resolution.split('x').map(Number);
      if (width && height) {
        originalAspectRatio.value = width / height;
        const newRes = { width, height };
        customResolution.value = newRes;
        newSettings.customResolution = newRes;
      }
    }
  } else {
    newSettings.resolution = props.metadata ? 'original' : '1920x1080';
    customResolution.value = { width: 1920, height: 1080 };
    originalAspectRatio.value = 16/9;
    delete newSettings.customResolution;
  }

  if (!newSettings.format) {
    newSettings.format = format.value;
  }

  emit('update:modelValue', newSettings);
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

// 根据色彩深度自动选择编码格式
const getRecommendedCodec = () => {
  if (props.metadata?.colorDepth) {
    const colorDepth = props.metadata.colorDepth;
    // 如果是10bit或更高，推荐使用H.265
    if (colorDepth.includes('10') || colorDepth.includes('12') || colorDepth.includes('16')) {
      return 'H.265';
    }
  }
  // 默认使用H.264
  return 'H.264';
};

// 监听格式变化，自动调整编码选项
watch(format, (newFormat) => {
  setFormat(newFormat);
  // 仅当当前编码不存在或与当前格式不兼容时，才使用推荐编码
  const current = videoCodec.value;
  const supported = supportedVideoCodecs.value;
  if (!current || !supported.includes(current)) {
    const recommendedCodec = getRecommendedCodec();
    emit('update:modelValue', { ...props.modelValue, videoCodec: recommendedCodec });
  }
});

// 监听metadata变化，自动调整编码选项和分辨率
watch(() => props.metadata, (newMetadata) => {
  if (newMetadata) {
    const recommendedCodec = getRecommendedCodec();
    const updates: Partial<CompressionSettings> = { ...props.modelValue };

    const current = videoCodec.value;
    const supported = supportedVideoCodecs.value;
    // 只有在未设置或与当前格式不兼容时，才更新编码为推荐值
    if (!current || !supported.includes(current)) {
      updates.videoCodec = recommendedCodec;
    }

    // 如果没有设置分辨率，自动设置为原始分辨率（使用 'original' 哨兵值）
    if (!props.modelValue.resolution) {
      updates.resolution = 'original';
    }

    emit('update:modelValue', updates);
  }
}, { immediate: true });

// 全局metadata更新事件监听
const handleMetadataUpdate = (event: CustomEvent) => {
  const { metadata } = event.detail;
  if (metadata) {
    console.log('VideoFormatSettings: 收到metadata更新事件', metadata);
    // 自动设置推荐的编码格式（仅在未设置或不兼容时）
    const recommendedCodec = metadata.colorDepth && 
      (metadata.colorDepth.includes('10') || metadata.colorDepth.includes('12') || metadata.colorDepth.includes('16'))
      ? 'H.265' : 'H.264';

    const current = videoCodec.value;
    const supported = supportedVideoCodecs.value;

    // 自动设置分辨率为原始分辨率（使用 'original' 哨兵值）
    const payload: Partial<CompressionSettings> = { 
      ...props.modelValue,
      ...( !props.modelValue.resolution ? { resolution: 'original' } : {} )
    };

    if (!current || !supported.includes(current)) {
      payload.videoCodec = recommendedCodec;
    }

    emit('update:modelValue', payload);
  }
};

onMounted(() => {
  window.addEventListener('video-metadata-updated', handleMetadataUpdate as EventListener);
  
  // 初始化时如果有metadata且没有设置分辨率，自动设置为原始分辨率（使用 'original' 哨兵值）
  if (props.metadata?.resolution && !props.modelValue.resolution) {
    const recommendedCodec = getRecommendedCodec();
    emit('update:modelValue', {
      ...props.modelValue,
      resolution: 'original',
      videoCodec: recommendedCodec
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('video-metadata-updated', handleMetadataUpdate as EventListener);
});
</script>