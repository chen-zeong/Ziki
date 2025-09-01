<template>
  <div class="bg-gray-50 dark:bg-[#1e1e1e] p-3 rounded-lg overflow-visible max-h-full quality-slider-container">
    <div class="space-y-4">
      <!-- 标题和质量等级 -->
      <div class="flex justify-between items-center mb-4">
        <label class="font-medium text-sm text-slate-600 dark:text-dark-secondary">画质</label>
        <div class="text-right">
          <span class="font-medium text-gray-600 dark:text-dark-primary px-1.5 py-0.5 rounded text-xs" style="background-color: #f3f4f6;">{{ qualityText }}</span>
        </div>
      </div>

      <!-- 滑动条 -->
      <div class="relative mb-2">
        <!-- 滑动条轨道和自定义UI -->
        <div class="relative h-8 flex items-center">
          <!-- 轨道背景 -->
          <div class="absolute w-full h-3 bg-slate-300 dark:bg-slate-600 rounded-full shadow-inner"></div>
          
          <!-- 已填充的进度条 -->
          <div 
            class="absolute h-3 bg-gradient-to-r from-[#558ee1] to-[#4a7bc8] dark:from-[#4a7bc8] dark:to-[#3d6ba3] rounded-full shadow-sm"
            :style="{ width: qualityValue + '%' }"
          ></div>
          
          <!-- 自定义的滑块 -->
          <div 
             class="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-gray-100 rounded-full shadow-lg border-4 border-[#558ee1] dark:border-[#4a7bc8] cursor-pointer transition-transform duration-100 ease-out hover:scale-105"
             :class="{ 'scale-105': showTooltip }"
             :style="{ left: `calc(${qualityValue}% - 14px)`, willChange: 'transform' }"
           >
             <!-- 滑块内部高光效果 -->
             <div class="absolute inset-1 bg-gradient-to-br from-white to-gray-100 dark:from-gray-50 dark:to-gray-200 rounded-full opacity-60"></div>
           </div>
          
          <!-- 气泡提示框 -->
          <div 
            class="absolute bottom-full mb-2 pointer-events-none transform -translate-x-1/2 z-10 transition duration-150 ease-out"
            :class="{ 'opacity-100 translate-y-0 scale-100': showTooltip, 'opacity-0 -translate-y-1 scale-95': !showTooltip }"
            :style="{ left: qualityValue + '%', willChange: 'transform, opacity' }"
          >
            <div class="tooltip-bubble">
              {{ currentParamDisplay }}
            </div>
          </div>
        </div>

        <!-- 透明的 range input 处理逻辑 -->
        <input 
          type="range" 
          id="quality-slider" 
          v-model="qualityValue"
          min="0" 
          max="100" 
          step="1" 
          class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
          @input="updateQualityState"
          @mouseenter="showTooltip = true"
          @mouseleave="showTooltip = false"
          @mousedown="showTooltip = true"
          @mouseup="showTooltip = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, withDefaults, onMounted } from 'vue';
import type { CompressionSettings } from '../../types';
import { 
  getQualityLevelIndex, 
  getEncoderQualityParam, 
  getDefaultQualityParam,
  QUALITY_LEVELS 
} from '../../config/qualityMappings';

interface Props {
  modelValue: Partial<CompressionSettings>;
  resolution?: string;
  isHardwareAccelerated?: boolean;
  currentVideoCodec?: string;
}

interface Emits {
  'update:modelValue': [value: Partial<CompressionSettings>];
}

const props = withDefaults(defineProps<Props>(), {
  isHardwareAccelerated: false,
  currentVideoCodec: ''
});
const emit = defineEmits<Emits>();

// 质量滑动条值 (0-100)
const qualityValue = ref(80);

// 气泡提示框显示状态
const showTooltip = ref(false);

// 初始化设置
const initializeSettings = () => {
  const defaultParam = getDefaultQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false
  );
  
  const baseSettings: Partial<CompressionSettings> = {
    qualityType: defaultParam.paramType as 'crf' | 'qv' | 'profile'
  };
  
  // 根据参数类型设置对应的默认值
  if (defaultParam.paramType === 'crf') {
    baseSettings.crfValue = defaultParam.value as number;
  } else if (defaultParam.paramType === 'qv') {
    baseSettings.qvValue = defaultParam.value as number;
  } else if (defaultParam.paramType === 'profile') {
    baseSettings.profileValue = defaultParam.value as string;
  }
  
  return {
    ...baseSettings,
    ...props.modelValue
  };
};

const settings = ref<Partial<CompressionSettings>>(initializeSettings());

// 初始化滑动条值
const initializeQualityValue = () => {
  const defaultParam = getDefaultQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false
  );
  qualityValue.value = defaultParam.sliderValue;
};

// 初始化
initializeQualityValue();



// 将滑动条值映射到质量描述文本
const qualityText = computed(() => {
  const value = qualityValue.value;
  if (value <= 20) return '极低质量';
  if (value <= 40) return '低质量';
  if (value <= 60) return '中等质量';
  if (value <= 85) return '高质量';
  return '极高质量';
});

// 当前参数显示（用于气泡提示框）
const currentParamDisplay = computed(() => {
  const param = getEncoderQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false,
    qualityValue.value
  );
  
  if (param.paramType === 'crf') {
    return `CRF: ${param.value}`;
  } else if (param.paramType === 'qv') {
    return `-q:v ${param.value}`;
  } else if (param.paramType === 'profile') {
    return `Profile: ${param.value}`;
  }
  
  return `${param.paramType}: ${param.value}`;
});

// 质量提示信息
const qualityHint = computed(() => {
  const value = qualityValue.value;
  if (value <= 20) return '文件体积最小，质量较差，适合网络传输';
  if (value <= 40) return '文件体积较小，质量一般，适合快速分享';
  if (value <= 60) return '平衡文件大小和质量，适合大多数场景';
  if (value <= 85) return '高质量输出，文件体积较大，适合存档';
  return '最高质量，文件体积最大，适合专业用途';
});



// 更新质量状态
const updateQualityState = () => {
  // 更新滑动条填充百分比
  const percentage = qualityValue.value;
  const slider = document.getElementById('quality-slider') as HTMLInputElement;
  if (slider) {
    slider.style.setProperty('--value-percent', `${percentage}%`);
  }
  
  // 获取当前编码器的质量参数（连续调节）
  const param = getEncoderQualityParam(
    props.currentVideoCodec || 'h264',
    props.isHardwareAccelerated || false,
    qualityValue.value
  );
  
  // 调试日志
  console.log('Quality update:', {
    sliderValue: qualityValue.value,
    codec: props.currentVideoCodec || 'h264',
    isHardware: props.isHardwareAccelerated || false,
    param
  });
  
  // 更新设置
  const newSettings: Partial<CompressionSettings> = {
    ...settings.value,
    qualityType: param.paramType as 'crf' | 'qv' | 'profile'
  };
  
  // 根据参数类型设置对应的值
  if (param.paramType === 'crf') {
    newSettings.crfValue = param.value as number;
  } else if (param.paramType === 'qv') {
    newSettings.qvValue = param.value as number;
  } else if (param.paramType === 'profile') {
    newSettings.profileValue = param.value as string;
  }
  
  settings.value = newSettings;
  
  console.log('Updated settings:', settings.value);
  
  // 发送更新事件
  emit('update:modelValue', settings.value);
};

// 监听外部modelValue变化
watch(() => props.modelValue, (newVal) => {
  settings.value = { ...settings.value, ...newVal };
}, { deep: true, immediate: true });

// 监听编码器和硬件加速变化，重新初始化参数
watch([() => props.currentVideoCodec, () => props.isHardwareAccelerated], () => {
  // 重新初始化设置和滑动条值
  settings.value = initializeSettings();
  initializeQualityValue();
  updateQualityState();
}, { immediate: false });

// 监听质量值变化
watch(qualityValue, updateQualityState);

// 组件挂载时初始化滑动条状态
onMounted(() => {
  updateQualityState();
});



</script>

<style scoped>
/* 隐藏原生 range 输入框的滑块 */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none; 
  width: 0;
  height: 0;
}

input[type="range"]::-moz-range-thumb {
  width: 0;
  height: 0;
  border: 0;
}
.tooltip-bubble {
  position: relative;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  color: white;
  font-size: 11px;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15);
  border: 1px solid rgba(148, 163, 184, 0.25);
  white-space: nowrap;
}
.tooltip-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(30, 41, 59, 0.96);
}
:deep(.dark) .tooltip-bubble {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
  border-color: rgba(100, 116, 139, 0.25);
}
:deep(.dark) .tooltip-bubble::after {
  border-top-color: rgba(15, 23, 42, 0.96);
}
</style>