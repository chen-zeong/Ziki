<template>
  <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg overflow-visible max-h-full flex flex-col">
    <div class="space-y-4">
      <div :class="{ 'opacity-50': isMuted }">
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">{{ $t('videoSettings.audioCodec') }}</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded" style="background-color: #f3f4f6;">{{ formatAudioCodec(metadata.audioCodec) }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="audioCodec"
          :options="audioFormatOptions"
          placeholder="选择音频格式"
          :disabled="isMuted"
        />
      </div>
      
      <div :class="{ 'opacity-50': isMuted }">
        <div class="flex items-center justify-between mb-2">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">{{ $t('videoSettings.audioSampleRate') }}</label>
          <div v-if="metadata" class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded" style="background-color: #f3f4f6;">{{ metadata.sampleRate }}</span>
          </div>
        </div>
        <CustomSelect 
          v-model="sampleRate"
          :options="sampleRateOptions"
          placeholder="选择采样率"
          :disabled="isMuted"
        />
      </div>
      
      <!-- 静音和仅保留音频开关 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">仅保留音频</label>
          <button
            type="button"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            :class="isAudioOnly ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600'"
            @click="toggleAudioOnly"
          >
            <span
              class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              :class="isAudioOnly ? 'translate-x-5' : 'translate-x-1'"
            ></span>
          </button>
        </div>
        
        <div class="flex items-center gap-3">
          <label class="font-medium text-sm text-slate-600 dark:text-slate-300">静音</label>
          <button
            type="button"
            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            :class="isMuted ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600'"
            @click="toggleMute"
          >
            <span
              class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"
              :class="isMuted ? 'translate-x-5' : 'translate-x-1'"
            ></span>
          </button>
        </div>
      </div>
      

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
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

// 静音相关的computed属性和方法
const isMuted = computed({
  get() {
    return props.modelValue.muted || false;
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, muted: value });
  }
});

const toggleMute = () => {
  isMuted.value = !isMuted.value;
};

// 仅保留音频相关的computed属性和方法
const isAudioOnly = computed({
  get() {
    return props.modelValue.audioOnly || false;
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, audioOnly: value });
  }
});

const toggleAudioOnly = () => {
  isAudioOnly.value = !isAudioOnly.value;
};



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