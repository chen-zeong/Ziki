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
            class="flex items-center p-3 rounded-lg cursor-pointer transition-all"
            :class="hardwareAcceleration.value === option.value ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'"
            @click="selectHardware(option); showHardwareModal = false"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" :class="hardwareAcceleration.value === option.value ? 'text-amber-500' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="option.icon"></path>
                </svg>
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ option.name }}</span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">{{ option.description }}</p>
            </div>
            <div v-if="hardwareAcceleration.value === option.value" class="ml-3">
              <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

interface HardwareOption {
  value: string;
  name: string;
  description: string;
  icon: string;
}

interface Props {
  modelValue: {
    value: string;
    name: string;
  };
}

interface Emits {
  'update:modelValue': [value: { value: string; name: string }];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showHardwareModal = ref(false);

const hardwareAcceleration = computed({
  get() {
    return props.modelValue;
  },
  set(newValue) {
    emit('update:modelValue', newValue);
  }
});

// 硬件加速选项
const hardwareOptions: HardwareOption[] = [
  {
    value: 'cpu',
    name: 'CPU编码',
    description: '兼容性最高，适用于所有设备，速度较慢',
    icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
  },
  {
    value: 'intel',
    name: '核心显卡',
    description: 'Intel集成显卡加速，速度快，功耗低',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-2 2V7H5v10h14v-1.586l2 2V20a1 1 0 01-1 1H4a1 1 0 01-1-1V4z'
  },
  {
    value: 'nvidia',
    name: '独立显卡',
    description: 'NVIDIA显卡加速，速度最快，适合高质量编码',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
];

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



// 组件挂载时添加事件监听
onMounted(() => {
  // 初始化时不需要添加监听器
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>