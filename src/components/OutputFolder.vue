<template>
  <!-- Output Folder Settings (Expandable) -->
  <div class="output-folder-container">
    <transition 
      name="slide-down"
      enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 max-h-0 transform -translate-y-4"
      enter-to-class="opacity-100 max-h-32 transform translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 max-h-32 transform translate-y-0"
      leave-to-class="opacity-0 max-h-0 transform -translate-y-4"
    >
      <div 
        v-if="showOutputFolder"
        class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3 overflow-hidden"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg shadow-sm">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
              </div>
              <div>
                <label class="text-sm font-bold text-gray-800 dark:text-gray-100">
                  输出文件夹
                </label>
                <p class="text-xs text-orange-600 dark:text-orange-400 mt-0.5 font-medium">
                  设置保存视频的路径
                </p>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <div class="flex-1 relative">
              <input 
                v-model="outputPath"
                type="text" 
                class="w-full px-4 py-3 pr-12 border-2 border-orange-200 dark:border-orange-600/50 rounded-xl bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 shadow-sm backdrop-blur-sm placeholder-orange-400/60"
                placeholder="选择输出路径..."
                readonly
                :title="outputPath"
              >
              <div class="absolute right-2 top-1/2 transform -translate-y-1/2">
                 <button 
                   class="p-2 text-orange-500 hover:text-white hover:bg-gradient-to-r hover:from-orange-400 hover:to-amber-500 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg group"
                   @click="selectOutputFolder"
                   title="选择文件夹"
                 >
                   <svg class="w-4 h-4 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                   </svg>
                 </button>
               </div>
             </div>
           </div>
         </div>
       </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

// Props
interface Props {
  showOutputFolder: boolean;
}

defineProps<Props>();

// Emits
interface Emits {
  'update:outputPath': [path: string];
  'close': [];
}

const emit = defineEmits<Emits>();

// Reactive data
const outputPath = ref('');
const defaultOutputPath = ref('');
// 初始化默认输出路径
const initializeOutputPath = async () => {
  let path = '';
  try {
    path = await invoke<string>('get_desktop_path');
  } catch (error) {
    console.error('Failed to get default output path:', error);
  } finally {
    outputPath.value = path;
    defaultOutputPath.value = path;
    emit('update:outputPath', path);
  }
};

// 检查是否使用自定义路径
// const isCustomPath = computed(() => {
//   return outputPath.value !== defaultOutputPath.value;
// });

const selectOutputFolder = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择输出文件夹'
    });
    
    if (selected && typeof selected === 'string') {
      outputPath.value = selected;
      emit('update:outputPath', selected);
      emit('close');
    }
  } catch (error) {
    console.error('Failed to select folder:', error);
  }
};

// Watch for Tauri to be ready
onMounted(() => {
  initializeOutputPath();
});
</script>

<style scoped>
/* 输出文件夹展开动画 */
.output-folder-container {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform-origin: top;
}

.slide-down-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px) scaleY(0.8);
  margin-bottom: 0;
}

.slide-down-enter-to {
  opacity: 1;
  max-height: 200px;
  transform: translateY(0) scaleY(1);
  margin-bottom: 12px;
}

.slide-down-leave-from {
  opacity: 1;
  max-height: 200px;
  transform: translateY(0) scaleY(1);
  margin-bottom: 12px;
}

.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px) scaleY(0.8);
  margin-bottom: 0;
}
</style>