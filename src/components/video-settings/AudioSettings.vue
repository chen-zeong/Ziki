<template>
  <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg overflow-visible max-h-full min-h-[280px] flex flex-col">
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">音频格式</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded" style="background-color: #f3f4f6;">{{ formatAudioCodec(metadata.audioCodec) }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="audioCodec"
          :options="audioFormatOptions"
          placeholder="选择音频格式"
        />
      </div>
      
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">采样率</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded" style="background-color: #f3f4f6;">{{ metadata.sampleRate }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="sampleRate"
          :options="sampleRateOptions"
          placeholder="选择采样率"
        />
      </div>
      
      <!-- 画质设置 -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">画质</label>
          <!-- Tab 切换 -->
          <div class="relative flex bg-gray-100 dark:bg-gray-600 rounded-md p-1 h-8">
            <!-- 滑动背景 -->
            <div 
              class="absolute top-1 bottom-1 bg-amber-500 rounded-md transition-all duration-300 ease-out shadow-md"
              :style="{
                width: 'calc(50% - 4px)',
                left: qualityMode === 'crf' ? '4px' : 'calc(50% + 2px)',
                transform: qualityMode === 'crf' ? 'translateX(0)' : 'translateX(-2px)'
              }"
            ></div>
            
            <button
              type="button"
              class="flex-1 px-4 py-1 text-xs font-medium transition-all duration-300 ease-out rounded-md relative z-10 whitespace-nowrap"
              :class="qualityMode === 'crf' ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'"
              @click="qualityMode = 'crf'"
            >
              CRF
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-1 text-xs font-medium transition-all duration-300 ease-out rounded-md relative z-10 whitespace-nowrap"
              :class="qualityMode === 'bitrate' ? 'text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'"
              @click="qualityMode = 'bitrate'"
            >
              码率
            </button>
          </div>
        </div>
        
        <!-- Tab 内容 -->
        <div v-if="qualityMode === 'crf'" class="transition-all duration-200">
          <div class="flex items-center space-x-2">
            <div class="flex-1">
              <CustomNumberInput
                v-model="settings.crfValue"
                :min="0"
                :max="51"
                placeholder="CRF值 (0-51)"
              />
            </div>
            <span 
              class="px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap"
              :class="crfColorClass"
            >
              {{ crfQualityText }}
            </span>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            推荐值：18-28，数值越小质量越高
          </div>
        </div>
        
        <div v-if="qualityMode === 'bitrate'" class="transition-all duration-200">
          <div class="flex items-center space-x-2">
            <div class="flex-1">
              <CustomNumberInput
                v-model="bitrateValue"
                :min="100"
                :max="50000"
                placeholder="码率 (kbps)"
              />
            </div>
            <span class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              kbps
            </span>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            常用值：1080p 建议 5000-8000 kbps
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import { useVideoFormats } from '../../composables/useVideoFormats';
import type { CompressionSettings, VideoMetadata } from '../../types';

interface Props {
  modelValue: Partial<CompressionSettings>;
  metadata?: VideoMetadata;
}

interface Emits {
  'update:modelValue': [value: Partial<CompressionSettings>];
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
const audioCodec = computed({
  get() {
    return selectedAudioCodec.value || props.modelValue.audioCodec || 'AAC';
  },
  set(value) {
    selectedAudioCodec.value = value;
    emit('update:modelValue', { ...props.modelValue, audioCodec: value });
  }
});

const sampleRate = computed({
  get() {
    return props.modelValue.sampleRate || '44100';
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, sampleRate: value });
  }
});

const qualityMode = computed({
  get() {
    return settings.value.qualityType || 'crf';
  },
  set(newMode) {
    const newSettings = { ...settings.value, qualityType: newMode };
    if (newMode === 'crf') {
      delete newSettings.bitrate;
      newSettings.crfValue = newSettings.crfValue || 23;
    } else {
      delete newSettings.crfValue;
      newSettings.bitrate = newSettings.bitrate || '5000k';
    }
    settings.value = newSettings;
  }
});

const bitrateValue = computed({
  get() {
    return parseInt(settings.value.bitrate || '5000', 10);
  },
  set(newValue) {
    settings.value = { ...settings.value, bitrate: `${newValue}k` };
  }
});

// 使用视频格式配置
const {
  supportedAudioCodecs,
  selectedFormat,
  selectedAudioCodec
} = useVideoFormats();

// 音频格式选项（根据当前选择的视频格式动态更新）
const audioFormatOptions = computed(() => {
  const baseOptions = [{ value: 'copy', label: '保持原格式' }];
  
  // 如果没有选择格式或选择保持原格式，显示所有常用音频编码
  if (!selectedFormat.value || selectedFormat.value === 'original') {
    return [
      ...baseOptions,
      { value: 'AAC', label: 'AAC' },
      { value: 'MP3', label: 'MP3' },
      { value: 'Vorbis', label: 'Vorbis' },
      { value: 'FLAC', label: 'FLAC' },
      { value: 'Opus', label: 'Opus' }
    ];
  }
  
  // 根据选择的视频格式返回支持的音频编码
  const supportedOptions = supportedAudioCodecs.value.map(codec => ({
    value: codec,
    label: codec
  }));
  
  return [...baseOptions, ...supportedOptions];
});

const sampleRateOptions = [
  { value: 'original', label: '原始采样率' },
  { value: '22050', label: '22.05 kHz' },
  { value: '44100', label: '44.1 kHz' },
  { value: '48000', label: '48 kHz' },
  { value: '96000', label: '96 kHz' }
];

const crfColorClass = computed(() => {
  const crf = settings.value.crfValue || 23;
  if (crf >= 18 && crf <= 28) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  } else {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  }
});

const crfQualityText = computed(() => {
  const crf = settings.value.crfValue || 23;
  if (crf <= 17) return '极高质量';
  if (crf <= 23) return '高质量';
  if (crf <= 28) return '中等质量';
  if (crf <= 35) return '低质量';
  return '极低质量';
});

// 监听视频格式变化，自动调整音频编码选项
watch(selectedFormat, (newFormat) => {
  if (newFormat && newFormat !== 'original') {
    // 检查当前音频编码是否兼容新格式
    const supportedCodecs = supportedAudioCodecs.value;
    if (supportedCodecs.length > 0 && !supportedCodecs.includes(audioCodec.value) && audioCodec.value !== 'copy') {
      // 如果当前编码不兼容，选择第一个支持的编码
      audioCodec.value = supportedCodecs[0];
    }
  }
});

// 监听selectedAudioCodec变化，同步到settings
watch(selectedAudioCodec, (newCodec) => {
  if (newCodec && newCodec !== audioCodec.value) {
    emit('update:modelValue', { ...props.modelValue, audioCodec: newCodec });
  }
});

// 格式化音频编码显示
const formatAudioCodec = (codec: string) => {
  const codecMap: Record<string, string> = {
    'aac': 'AAC',
    'mp3': 'MP3',
    'vorbis': 'Vorbis',
    'flac': 'FLAC',
    'opus': 'Opus',
    'ac3': 'AC-3',
    'eac3': 'E-AC-3',
    'dts': 'DTS'
  };
  return codecMap[codec?.toLowerCase()] || codec?.toUpperCase() || '未知';
};
</script>