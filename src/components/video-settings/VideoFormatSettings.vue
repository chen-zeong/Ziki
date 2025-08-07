<template>
  <div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg overflow-visible max-h-full min-h-[280px] flex flex-col">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">输出格式</label>
        <CustomSelect 
          v-model="format"
          :options="formatOptions"
          placeholder="选择输出格式"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">视频编码器</label>
        <CustomSelect 
          v-model="codec"
          :options="videoCodecOptions"
          placeholder="选择编码器"
        />
      </div>
      
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">分辨率</label>
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
          <div v-if="isCustomResolution" class="flex gap-2">
            <CustomNumberInput
              v-model="customResolution.width"
              :min="1"
              :max="7680"
              placeholder="宽度"
            />
            <CustomNumberInput
              v-model="customResolution.height"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import CustomSelect from '../common/CustomSelect.vue';
import CustomNumberInput from '../common/CustomNumberInput.vue';
import type { CompressionSettings } from '../../types';

interface Props {
  modelValue: Partial<CompressionSettings>;
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
const format = computed({
  get() {
    return props.modelValue.format || 'mp4';
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, format: value });
  }
});

const codec = computed({
  get() {
    return props.modelValue.codec || 'libx264';
  },
  set(value) {
    emit('update:modelValue', { ...props.modelValue, codec: value });
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

const formatOptions = [
  { value: 'original', label: '保持原格式' },
  { value: 'mp4', label: 'MP4' },
  { value: 'webm', label: 'WebM' },
  { value: 'avi', label: 'AVI' },
  { value: 'mkv', label: 'MKV' },
  { value: 'mov', label: 'MOV' },
  { value: 'flv', label: 'FLV' },
  { value: 'wmv', label: 'WMV' },
  { value: 'avif', label: 'AVIF' }
];

const videoCodecOptions = [
  { value: 'libx264', label: 'H.264' },
  { value: 'libx265', label: 'H.265 (HEVC)' },
  { value: 'libvpx-vp9', label: 'VP9' },
  { value: 'libaom-av1', label: 'AV1' },
  { value: 'mpeg4', label: 'MPEG-4' },
  { value: 'libxvid', label: 'Xvid' }
];

const resolutionOptions = [
  { value: 'original', label: '原始分辨率' },
  { value: '1920x1080', label: '1920x1080 (1080p)' },
  { value: '1280x720', label: '1280x720 (720p)' },
  { value: '854x480', label: '854x480 (480p)' },
  { value: 'custom', label: '自定义分辨率' }
];

const toggleCustomResolution = () => {
  isCustomResolution.value = !isCustomResolution.value;
  const newSettings = { ...settings.value };
  if (isCustomResolution.value) {
    newSettings.resolution = 'custom';
  } else {
    newSettings.resolution = '1920x1080';
    customResolution.value = { width: 1920, height: 1080 };
  }
  settings.value = newSettings;
};

// 监听自定义分辨率变化，并更新 settings
watch(customResolution, (newResolution) => {
  if (isCustomResolution.value) {
    settings.value = {
      ...settings.value,
      customResolution: newResolution
    };
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
</script>