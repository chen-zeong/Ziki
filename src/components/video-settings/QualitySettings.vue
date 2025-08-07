<template>
  <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg overflow-visible max-h-full">
    <div class="space-y-4">
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
import { ref, computed, watch } from 'vue';
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

const settings = ref<Partial<CompressionSettings>>({
  qualityType: 'crf',
  crfValue: 23,
  ...props.modelValue
});

const qualityMode = ref('crf');
const bitrateValue = ref(5000);

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

// 标记是否正在更新，避免循环
const isUpdating = ref(false);

// 监听质量模式变化
watch(qualityMode, (newMode) => {
  if (isUpdating.value) return;
  settings.value.qualityType = newMode as 'crf' | 'bitrate';
  emitUpdate();
});

// 监听设置变化
watch(settings, () => {
  if (isUpdating.value) return;
  emitUpdate();
}, { deep: true });

// 监听码率变化
watch(bitrateValue, () => {
  if (isUpdating.value) return;
  emitUpdate();
});

const emitUpdate = () => {
  if (isUpdating.value) return;
  
  const updatedSettings = {
    ...settings.value,
    bitrate: settings.value.qualityType === 'bitrate' ? `${bitrateValue.value}k` : undefined
  };
  emit('update:modelValue', updatedSettings);
};

// 监听父组件传入的值变化
watch(() => props.modelValue, (newValue) => {
  isUpdating.value = true;
  settings.value = { ...settings.value, ...newValue };
  if (newValue.qualityType) {
    qualityMode.value = newValue.qualityType;
  }
  isUpdating.value = false;
}, { deep: true });
</script>