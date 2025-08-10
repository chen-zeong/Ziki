<template>
  <div class="relative hardware-dropdown">
    <button
      type="button"
      class="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      :class="hardwareAcceleration.value !== 'cpu' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'"
      @click="showHardwareModal = !showHardwareModal"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
      </svg>
      <span class="text-sm">{{ hardwareAcceleration.name }}</span>
      <span v-if="supportedCodecs.length > 0" class="text-xs px-2 py-0.5 rounded" :class="hardwareAcceleration.value === 'gpu' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'">{{ supportedCodecs.length }}个格式</span>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    
    <!-- 硬件加速下拉菜单 -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-2"
    >
      <div v-if="showHardwareModal" class="absolute bottom-full left-0 mb-2 w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 z-50">
        <!-- 硬件加速选项 -->
        <div class="p-3 space-y-2">
          <div 
            v-for="option in hardwareOptions" 
            :key="option.value"
            class="flex items-center p-3 rounded-lg transition-all"
            :class="[
              option.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              hardwareAcceleration.value === option.value ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-500' : option.available ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''
            ]"
            @click="option.available && selectHardware(option); showHardwareModal = false"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" :class="hardwareAcceleration.value === option.value ? 'text-amber-500' : option.available ? 'text-gray-400' : 'text-gray-300'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="option.icon"></path>
                </svg>
                <span class="font-medium" :class="option.available ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'">{{ option.name }}</span>
                <span v-if="option.reason" class="text-xs px-2 py-0.5 rounded" :class="option.available ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'">{{ option.reason }}</span>
              </div>
              <p class="text-xs mt-1 ml-6" :class="option.available ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'">{{ option.description }}</p>
            </div>
            <div v-if="hardwareAcceleration.value === option.value" class="ml-3">
              <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
          
          <!-- 支持的硬件编码格式列表 -->
          <div v-if="supportedCodecs.length > 0" class="border-t border-gray-200 dark:border-gray-700 p-3">
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">支持的硬件编码格式</h4>
            <div class="space-y-1">
              <div v-for="codec in supportedCodecs" :key="codec.name" class="flex items-center justify-between text-xs">
                <span class="text-gray-600 dark:text-gray-400">{{ codec.name }}</span>
                <span class="text-gray-500 dark:text-gray-500">{{ codec.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface HardwareOption {
  value: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  reason?: string;
}

interface Codec {
  name: string;
  codec_type: string;
  media_type: string;
  description: string;
  hardware_type?: string;
}

interface Props {
  modelValue: {
    value: string;
    name: string;
  };
  currentVideoCodec?: string;
}

interface Emits {
  'update:modelValue': [value: { value: string; name: string }];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showHardwareModal = ref(false);
const codecs = ref<Codec[]>([]);
const isDetecting = ref(false);
const platform = ref<'macos' | 'windows' | 'linux'>('macos');

const hardwareAcceleration = computed({
  get() {
    return props.modelValue;
  },
  set(newValue) {
    emit('update:modelValue', newValue);
  }
});

// 检测编解码器支持
const detectCodecs = async () => {
  if (isDetecting.value) return;
  
  isDetecting.value = true;
  try {
    const result = await invoke<Codec[]>('detect_codecs');
    codecs.value = result;
  } catch (error) {
    console.error('Failed to detect codecs:', error);
    codecs.value = [];
  } finally {
    isDetecting.value = false;
  }
};

// 检测平台
const detectPlatform = async () => {
  try {
    const result = await invoke<string>('get_platform');
    platform.value = result as 'macos' | 'windows' | 'linux';
  } catch (error) {
    console.error('Failed to detect platform:', error);
  }
};

// 检查编码格式是否支持硬件加速
const checkHardwareSupport = (codecName: string): boolean => {
  if (!codecName || !codecs.value.length) return false;
  
  // 根据平台检查支持的硬件编码格式
  if (platform.value === 'macos') {
    // macOS 使用 videotoolbox
    const supportedCodecs = ['h264_videotoolbox', 'hevc_videotoolbox', 'prores_videotoolbox'];
    const normalizedCodec = codecName.toLowerCase();
    
    if (normalizedCodec.includes('h264') || normalizedCodec.includes('h.264')) {
      return codecs.value.some(codec => codec.name === 'h264_videotoolbox');
    }
    if (normalizedCodec.includes('hevc') || normalizedCodec.includes('h265') || normalizedCodec.includes('h.265')) {
      return codecs.value.some(codec => codec.name === 'hevc_videotoolbox');
    }
    if (normalizedCodec.includes('prores')) {
      return codecs.value.some(codec => codec.name === 'prores_videotoolbox');
    }
  }
  
  return false;
};

// 获取支持的硬件编码格式列表
const supportedCodecs = computed(() => {
  if (!codecs.value.length) return [];
  
  if (platform.value === 'macos') {
    return codecs.value.filter(codec => 
      codec.name.includes('videotoolbox') && 
      codec.codec_type === 'encoder' &&
      codec.media_type === 'video'
    );
  }
  
  // 其他平台的支持可以在这里添加
  return [];
});

// 硬件加速选项
const hardwareOptions = computed<HardwareOption[]>(() => {
  const isHardwareSupported = props.currentVideoCodec ? checkHardwareSupport(props.currentVideoCodec) : false;
  
  return [
    {
      value: 'cpu',
      name: 'CPU编码',
      description: '兼容性最高，适用于所有设备，速度较慢',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      available: true
    },
    {
      value: 'gpu',
      name: '显卡加速',
      description: isHardwareSupported ? '当前编码格式支持硬件加速，速度更快' : '当前编码格式不支持硬件加速',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      available: isHardwareSupported,
      reason: isHardwareSupported ? '可用' : '不可用'
    }
  ];
});

// 选择硬件加速
const selectHardware = (option: HardwareOption) => {
  hardwareAcceleration.value = {
    value: option.value,
    name: option.name
  };
};

// 点击外部关闭硬件加速下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.hardware-dropdown')) {
    showHardwareModal.value = false;
  }
};

// 监听点击事件
watch(showHardwareModal, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', handleClickOutside);
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});



// 监听当前视频编码格式变化
watch(() => props.currentVideoCodec, async (newCodec) => {
  if (newCodec && codecs.value.length === 0) {
    await detectCodecs();
  }
  
  // 如果当前选择的是显卡加速但新编码格式不支持，自动切换到CPU编码
  if (hardwareAcceleration.value.value === 'gpu' && newCodec && !checkHardwareSupport(newCodec)) {
    selectHardware({
      value: 'cpu',
      name: 'CPU编码',
      description: '兼容性最高，适用于所有设备，速度较慢',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      available: true
    });
  }
});

// 组件挂载时初始化
onMounted(async () => {
  await detectPlatform();
  await detectCodecs();
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>