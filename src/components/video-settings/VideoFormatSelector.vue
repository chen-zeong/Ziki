<template>
  <div class="video-format-selector space-y-6">
    <!-- 视频格式选择 -->
    <div class="format-section">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        输出格式
      </label>
      <select 
        v-model="selectedFormat" 
        @change="onFormatChange"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
      >
        <optgroup label="推荐格式">
          <option 
            v-for="option in recommendedFormatOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </optgroup>
        <optgroup label="其他格式">
          <option 
            v-for="option in otherFormatOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </optgroup>
      </select>
    </div>

    <!-- 视频编码选择 -->
    <div class="codec-section">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        视频编码
      </label>
      <div class="grid grid-cols-1 gap-2">
        <div 
          v-for="option in videoCodecOptions" 
          :key="option.value"
          class="relative"
        >
          <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                 :class="{
                   'border-blue-500 bg-blue-50 dark:bg-blue-900/20': selectedVideoCodec === option.value,
                   'border-gray-300 dark:border-gray-600': selectedVideoCodec !== option.value
                 }">
            <input 
              type="radio" 
              :value="option.value" 
              v-model="selectedVideoCodec"
              class="sr-only"
            >
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-900 dark:text-white">{{ option.label }}</span>
                <div class="flex items-center space-x-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        :class="getQualityBadgeClass(option.quality)">
                    {{ getQualityText(option.quality) }}
                  </span>
                  <span v-if="option.hardwareSupport" 
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    硬件加速
                  </span>
                </div>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ option.description }}</p>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- 音频编码选择 -->
    <div class="codec-section">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        音频编码
      </label>
      <div class="grid grid-cols-1 gap-2">
        <div 
          v-for="option in audioCodecOptions" 
          :key="option.value"
          class="relative"
        >
          <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                 :class="{
                   'border-blue-500 bg-blue-50 dark:bg-blue-900/20': selectedAudioCodec === option.value,
                   'border-gray-300 dark:border-gray-600': selectedAudioCodec !== option.value
                 }">
            <input 
              type="radio" 
              :value="option.value" 
              v-model="selectedAudioCodec"
              class="sr-only"
            >
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-900 dark:text-white">{{ option.label }}</span>
                <div class="flex items-center space-x-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        :class="getQualityBadgeClass(option.quality)">
                    {{ getQualityText(option.quality) }}
                  </span>
                  <span v-if="option.recommendedBitrate" 
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {{ option.recommendedBitrate }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ option.description }}</p>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- 兼容性提示 -->
    <div v-if="!isCurrentCombinationValid" 
         class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
            编码组合不兼容
          </h3>
          <p class="mt-1 text-sm text-red-700 dark:text-red-300">
            当前选择的视频编码和音频编码与输出格式不兼容，请重新选择。
          </p>
        </div>
      </div>
    </div>

    <!-- 当前配置摘要 -->
    <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-2">当前配置</h3>
      <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <p><span class="font-medium">格式:</span> {{ currentFormatInfo?.name }} ({{ currentFormatInfo?.extension }})</p>
        <p><span class="font-medium">视频编码:</span> {{ videoCodecInfo?.name || selectedVideoCodec }}</p>
        <p><span class="font-medium">音频编码:</span> {{ audioCodecInfo?.name || selectedAudioCodec }}</p>
        <p v-if="videoCodecInfo?.hardwareSupport" class="text-green-600 dark:text-green-400">
          <span class="font-medium">✓</span> 支持硬件加速
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useVideoFormats } from '../../composables/useVideoFormats';

// 使用视频格式配置
const {
  selectedFormat,
  selectedVideoCodec,
  selectedAudioCodec,
  currentFormatInfo,
  videoCodecInfo,
  audioCodecInfo,
  isCurrentCombinationValid,
  formatOptions,
  videoCodecOptions,
  audioCodecOptions,
  setFormat
} = useVideoFormats();

// 分离推荐和其他格式
const recommendedFormatOptions = computed(() => 
  formatOptions.value.filter(option => option.recommended)
);

const otherFormatOptions = computed(() => 
  formatOptions.value.filter(option => !option.recommended)
);

// 格式变化处理
const onFormatChange = () => {
  setFormat(selectedFormat.value);
};

// 质量等级样式
const getQualityBadgeClass = (quality: string) => {
  const classes = {
    'poor': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'fair': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'good': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'excellent': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'lossless': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };
  return classes[quality as keyof typeof classes] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
};

// 质量等级文本
const getQualityText = (quality: string) => {
  const texts = {
    'poor': '较低',
    'fair': '一般',
    'good': '良好',
    'excellent': '优秀',
    'lossless': '无损'
  };
  return texts[quality as keyof typeof texts] || quality;
};
</script>

<style scoped>
.video-format-selector {
  max-width: 600px;
}

.format-section,
.codec-section {
  @apply space-y-2;
}

/* 自定义单选按钮样式 */
input[type="radio"]:checked + div {
  @apply ring-2 ring-blue-500;
}
</style>