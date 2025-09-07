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
                backgroundColor: hardwareAcceleration.value === 'gpu' ? '#558ee1' : '',
                '--tw-ring-color': '#558ee1'
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
              ref="supportBtnRef"
              @click="toggleSupportedFormats"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style="color: #9150e1; background-color: rgba(145, 80, 225, 0.1);"
              @mouseover="($event.target as HTMLElement).style.color = '#7c3aed'"
              @mouseleave="($event.target as HTMLElement).style.color = '#9150e1'"
            >
              查看支持列表
            </button>
            
            <!-- 使用 Teleport 将弹出框放到 body，避免被父容器裁剪或遮挡 -->
            <Teleport to="body">
              <transition name="fade-up">
                <div
                  v-if="showSupportedFormats"
                  ref="supportPopupRef"
                  class="fixed w-96 p-5 bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-600 rounded-2xl shadow-lg z-[10000]"
                  :style="{ top: popupPosition.top + 'px', left: popupPosition.left + 'px' }"
                >
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
                       <span>{{ codec }}</span>
                     </div>
                   </div>
  
                   <!-- 分割线 -->
                   <div class="border-t border-gray-100 dark:border-dark-border my-4"></div>
  
                   <!-- 检测信息与操作 -->
                   <div class="flex items-center justify-between">
                     <div class="flex items-center text-xs text-gray-500 dark:text-dark-secondary">
                       <Clock class="w-3 h-3 mr-1 opacity-70" />
                       <span>上次检测时间：{{ hardwareSupport ? formatTime(hardwareSupport.tested_at) : '—' }}</span>
                     </div>
                     <button
                       class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md text-white bg-[#5492dc] hover:bg-[#4a82c6] disabled:opacity-50 disabled:cursor-not-allowed transition"
                       @click="refreshHardware"
                       :disabled="isDetectingHardwareEncoders"
                     >
                       <Loader2 v-if="isDetectingHardwareEncoders" class="w-3 h-3 animate-spin" />
                       <RefreshCw v-else class="w-3 h-3" />
                       <span>{{ isDetectingHardwareEncoders ? '检测中…' : '重新检测' }}</span>
                     </button>
                   </div>
                </div>
              </transition>
            </Teleport>
          </div>
        </div>

        <!-- 移除外部的检测状态与重新检测行，内容已移动到弹出框内 -->
        
    </div>
    

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle, X, AlertTriangle, Check, Zap, Ban, Clock, RefreshCw, Loader2 } from 'lucide-vue-next';

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

// 新增：与后端Rust结构对齐
interface EncoderSupport {
  name: string;     // ffmpeg encoder name, e.g. "h264_videotoolbox", "h264_nvenc"
  codec: 'h264' | 'hevc' | 'av1' | 'vp9' | 'prores';
  vendor: string;   // Apple VT | NVIDIA | Intel | AMD
  supported: boolean;
  error_message?: string | null;
}

interface HardwareSupport {
  platform: 'macos' | 'windows' | 'linux' | 'unknown';
  tested_at: number; // unix seconds
  encoders: EncoderSupport[];
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

// 新增：硬件编码器支持与检测状态
const hardwareSupport = ref<HardwareSupport | null>(null);
const isDetectingHardwareEncoders = ref(false);
const detectHint = ref('');

const hardwareAcceleration = computed({
  get() {
    return props.modelValue;
  },
  set(newValue) {
    emit('update:modelValue', newValue);
  }
});

// 旧：检测编解码器支持（保留作为回退）
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

// 新：加载硬件编码器支持（使用缓存）
const loadHardwareSupport = async () => {
  if (isDetectingHardwareEncoders.value) return;
  isDetectingHardwareEncoders.value = true;
  detectHint.value = '正在检测硬件编码器，请稍候...';
  try {
    const result = await invoke<HardwareSupport>('get_hardware_encoder_support');
    hardwareSupport.value = result;
  } catch (error) {
    console.error('Failed to get hardware encoder support:', error);
    hardwareSupport.value = { platform: platform.value, tested_at: Math.floor(Date.now()/1000), encoders: [] } as HardwareSupport;
  } finally {
    isDetectingHardwareEncoders.value = false;
    detectHint.value = '';
  }
};

// 新：刷新硬件编码器支持（忽略缓存）
const refreshHardware = async () => {
  if (isDetectingHardwareEncoders.value) return;
  isDetectingHardwareEncoders.value = true;
  detectHint.value = '正在重新检测硬件编码器，请稍候...';
  try {
    const result = await invoke<HardwareSupport>('refresh_hardware_encoder_support');
    hardwareSupport.value = result;
  } catch (error) {
    console.error('Failed to refresh hardware encoder support:', error);
  } finally {
    isDetectingHardwareEncoders.value = false;
    detectHint.value = '';
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

// 工具：格式化时间
const formatTime = (sec: number) => {
  const d = new Date(sec * 1000);
  return d.toLocaleString();
};

// 名称归一化为逻辑codec
const normalizeTargetCodec = (codecName: string): EncoderSupport['codec'] | null => {
  const n = (codecName || '').toLowerCase();
  if (n.includes('h264') || n.includes('h.264') || n.includes('avc')) return 'h264';
  if (n.includes('hevc') || n.includes('h265') || n.includes('h.265')) return 'hevc';
  if (n.includes('av1')) return 'av1';
  if (n.includes('vp9')) return 'vp9';
  if (n.includes('prores')) return 'prores';
  return null;
};

// 检查编码格式是否支持硬件加速（使用新数据）
const checkHardwareSupport = (codecName: string): boolean => {
  const target = normalizeTargetCodec(codecName);
  if (!target) return false;
  const list = hardwareSupport.value?.encoders || [];
  return list.some(e => e.codec === target && e.supported);
};

// 获取支持的硬件编码格式列表（使用新数据）
const supportedCodecs = computed(() => {
  const list = hardwareSupport.value?.encoders || [];
  const supported = list.filter(e => e.supported);
  if (supported.length === 0) return [] as string[];
  // 展示人性化名称：H.264 (Apple VT) 等
  const nameMap: Record<EncoderSupport['codec'], string> = {
    h264: 'H.264', hevc: 'H.265/HEVC', av1: 'AV1', vp9: 'VP9', prores: 'ProRes'
  };
  return supported.map(e => `${nameMap[e.codec]} (${e.vendor})`);
});

// 硬件加速选项
const hardwareOptions = computed<HardwareOption[]>(() => {
  const isHardwareSupported = props.currentVideoCodec ? checkHardwareSupport(props.currentVideoCodec) : false;
  
  return [
    {
      value: 'cpu',
      name: 'CPU编码',
      description: '兼容性最高，适用于所有设备，速度较慢',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9Vz',
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
    console.log('支持的硬件编码器:', supportedCodecs.value.join(', '));
    
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
    console.log('Windows 显卡加速：根据检测结果选择 NVENC/QSV/AMF');
  } else {
    console.log('当前平台不支持显卡加速');
  }
};

// 处理CPU编码
const handleCpuEncoding = () => {
  console.log('使用 CPU 编码模式');
  console.log('当前编码格式:', props.currentVideoCodec);
};

// 恢复：硬件加速开关切换
const toggleHardwareAcceleration = () => {
  if (hardwareAcceleration.value.value === 'gpu') {
    hardwareAcceleration.value = { value: 'cpu', name: 'CPU编码' };
    handleCpuEncoding();
  } else {
    hardwareAcceleration.value = { value: 'gpu', name: '显卡加速' };
    handleGpuAcceleration();
  }
};

const showSupportedFormats = ref(false);

const supportBtnRef = ref<HTMLElement | null>(null);
const supportPopupRef = ref<HTMLElement | null>(null);
const popupPosition = ref({ top: 0, left: 0 });

const calcPopupPosition = () => {
  if (!supportBtnRef.value) return;
  const btnRect = supportBtnRef.value.getBoundingClientRect();
  const width = supportPopupRef.value?.offsetWidth ?? 384; // 24rem
  const height = supportPopupRef.value?.offsetHeight ?? 0;
  // 右对齐到按钮，向上展开
  let left = btnRect.right + window.scrollX - width;
  left = Math.min(left, window.scrollX + window.innerWidth - width - 8);
  left = Math.max(left, window.scrollX + 8);
  let top = btnRect.top + window.scrollY - height - 12; // 位于按钮上方 12px
  top = Math.max(top, window.scrollY + 8); // 不要超出视口顶部
  popupPosition.value = { top, left };
};

// 点击外部关闭弹出层
const onDocClick = (e: MouseEvent) => {
  if (!showSupportedFormats.value) return;
  const target = e.target as Node;
  if (supportBtnRef.value && (target === supportBtnRef.value || supportBtnRef.value.contains(target))) return;
  if (supportPopupRef.value && supportPopupRef.value.contains(target)) return;
  showSupportedFormats.value = false;
};

const toggleSupportedFormats = async () => {
  showSupportedFormats.value = !showSupportedFormats.value;
  await nextTick();
  if (showSupportedFormats.value) {
    calcPopupPosition();
  }
};

// 监听当前视频编码格式变化
watch(() => props.currentVideoCodec, async (newCodec) => {
  if (!hardwareSupport.value) {
    await loadHardwareSupport();
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
  await loadHardwareSupport();
  window.addEventListener('resize', calcPopupPosition);
  window.addEventListener('scroll', calcPopupPosition, true);
  document.addEventListener('click', onDocClick);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcPopupPosition);
  window.removeEventListener('scroll', calcPopupPosition, true);
  document.removeEventListener('click', onDocClick);
});
</script>

<style scoped>
.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.fade-up-enter-to,
.fade-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>