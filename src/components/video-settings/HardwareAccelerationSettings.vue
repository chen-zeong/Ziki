<template>
  <div class="hardware-acceleration-settings">
    <div class="space-y-4 bg-gray-50 dark:bg-[#1e1e1e] p-4 rounded-lg">
      
        <!-- 显卡加速开关 -->
         <div class="flex items-center justify-between">
           <div class="flex items-center gap-3">
             <h3 class="text-sm font-medium text-gray-700 dark:text-dark-text">显卡加速</h3>
             <div v-if="isHardwareAvailable" class="px-2 py-1 bg-green-100 dark:bg-dark-success/20 text-green-700 dark:text-dark-success text-xs rounded-full font-medium flex items-center space-x-1">
               <Zap class="w-3 h-3" />
               <span>可用</span>
             </div>
             <div v-else class="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium flex items-center space-x-1">
               <Ban class="w-3 h-3" />
               <span>不可用</span>
             </div>
           </div>
          
          <!-- 可用时显示开关 -->
          <div v-if="isHardwareAvailable" class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-dark-secondary">{{ hardwareAcceleration.value === 'gpu' ? '已启用' : '已关闭' }}</span>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="hardwareAcceleration.value === 'gpu' ? '' : 'bg-gray-200 dark:bg-dark-border'"
              :style="{
                backgroundColor: hardwareAcceleration.value === 'gpu' ? '#5492dc' : '',
                '--tw-ring-color': '#5492dc'
              }"
              @click="toggleHardwareAcceleration"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="hardwareAcceleration.value === 'gpu' ? 'translate-x-6' : 'translate-x-1'"
              ></span>
            </button>
          </div>
          
          <!-- 不可用时显示查看支持列表按钮 -->
          <div v-else class="relative flex items-center gap-2 h-6">
            <button
              @click="showSupportedFormats = !showSupportedFormats"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style="color: #9150e1; background-color: rgba(145, 80, 225, 0.1);"
              @mouseover="($event.target as HTMLElement).style.color = '#7c3aed'"
              @mouseleave="($event.target as HTMLElement).style.color = '#9150e1'"
            >
              查看支持列表
            </button>
            
            <!-- 向上弹出的支持格式列表 -->
             <div v-if="showSupportedFormats" class="absolute bottom-full right-0 mb-3 w-80 p-5 bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl backdrop-blur-md z-50 animate-in slide-in-from-bottom-2 duration-300">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-800 dark:text-dark-text flex items-center space-x-2">
                  <CheckCircle class="w-4 h-4 text-blue-500" />
                  <span>支持的硬件编码格式</span>
                </h4>
                <button @click="showSupportedFormats = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-border transition-colors">
                  <X class="w-4 h-4" />
                </button>
              </div>
              <div v-if="supportedCodecs.length === 0" class="text-sm text-gray-500 dark:text-dark-secondary bg-gray-50 dark:bg-dark-border/50 p-3 rounded-lg text-center">
                <AlertTriangle class="w-6 h-6 mx-auto mb-2 text-gray-400" />
                当前系统不支持任何硬件编码格式
              </div>
              <div v-else class="space-y-2 max-h-48 overflow-y-auto">
                 <div v-for="(codec, index) in supportedCodecs" :key="index" class="text-sm text-gray-700 dark:text-dark-text bg-gray-50 dark:bg-dark-border/50 p-2 rounded-lg flex items-center space-x-2">
                   <Check class="w-3 h-3 text-dark-success flex-shrink-0" />
                   <span>{{ codec.name || codec.codec_type || codec }}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
    </div>
    

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle, X, AlertTriangle, Check, Zap, Ban } from 'lucide-vue-next';

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

// 监听硬件加速设置变化
watch(() => props.modelValue, () => {
  // 硬件加速设置变化时的处理逻辑
}, { deep: true });
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
    const result = await invoke<Codec[]>('detect_all_codecs');
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

// 硬件加速是否可用
const isHardwareAvailable = computed(() => {
  return props.currentVideoCodec ? checkHardwareSupport(props.currentVideoCodec) : false;
});

// 不可用原因
const unavailableReason = computed(() => {
  if (!props.currentVideoCodec) {
    return '请先选择视频编码格式';
  }
  if (!isHardwareAvailable.value) {
    return '当前编码格式不支持硬件加速';
  }
  return '';
});

// 选择硬件加速
const selectHardware = (option: HardwareOption) => {
  hardwareAcceleration.value = {
    value: option.value,
    name: option.name
  };
  
  // 为显卡加速添加实际功能
  if (option.value === 'gpu') {
    handleGpuAcceleration();
  } else {
    handleCpuEncoding();
  }
};

// 处理显卡加速功能
const handleGpuAcceleration = () => {
  if (platform.value === 'macos') {
    console.log('macOS 显卡加速已启用');
    console.log('使用 VideoToolbox 硬件编码器');
    console.log('当前编码格式:', props.currentVideoCodec);
    console.log('支持的硬件编码器:', supportedCodecs.value.map(c => c.name).join(', '));
    
    // 检查具体的编码器支持
    const codecName = props.currentVideoCodec?.toLowerCase() || '';
    if (codecName.includes('h264') || codecName.includes('h.264')) {
      console.log('将使用 h264_videotoolbox 编码器');
    } else if (codecName.includes('hevc') || codecName.includes('h265') || codecName.includes('h.265')) {
      console.log('将使用 hevc_videotoolbox 编码器');
    } else if (codecName.includes('prores')) {
      console.log('将使用 prores_videotoolbox 编码器');
    }
  } else if (platform.value === 'windows') {
    console.log('Windows 显卡加速功能暂未实现');
    // Windows 系统暂时留空，后续可以添加 NVENC、QuickSync 等支持
  } else {
    console.log('当前平台不支持显卡加速');
  }
};

// 处理CPU编码
const handleCpuEncoding = () => {
  console.log('使用 CPU 编码模式');
  console.log('当前编码格式:', props.currentVideoCodec);
};

const showSupportedFormats = ref(false);

const toggleHardwareAcceleration = () => {
  if (hardwareAcceleration.value.value === 'gpu') {
    hardwareAcceleration.value = { value: 'cpu', name: 'CPU编码' };
    handleCpuEncoding();
  } else {
    hardwareAcceleration.value = { value: 'gpu', name: '显卡加速' };
    handleGpuAcceleration();
  }
};





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


</script>