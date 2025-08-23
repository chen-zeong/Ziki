<template>
  <!-- Output Folder Settings (Expandable) -->
  <div class="output-folder-container">
    <transition 
      name="slide-down"
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-32"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-32"
      leave-to-class="opacity-0 max-h-0"
    >
      <div 
        v-if="showOutputFolder"
        class="bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 mb-3 overflow-hidden"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="p-2 rounded-lg shadow-sm bg-gray-800 dark:bg-gray-200">
                <Folder class="w-4 h-4 text-white dark:text-gray-800" />
              </div>
              <div>
                <label class="text-sm font-bold text-gray-800 dark:text-gray-100">
                  输出文件夹
                </label>
                <p class="text-xs mt-0.5 font-medium text-gray-600 dark:text-gray-400">
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
                 class="w-full px-3 py-2 pr-12 border rounded-md bg-white dark:bg-[#222221] text-gray-900 dark:text-gray-100 text-sm border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                 placeholder="选择输出路径..."
                 readonly
               />
               <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                 <button 
                   class="p-2 rounded-md transition-colors group text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                   @click="selectOutputFolder"
                   title="选择文件夹"
                 >
                   <FolderPen class="w-4 h-4 group-hover:animate-pulse" />
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
import { FolderPen, FolderCog, Folder } from 'lucide-vue-next';

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
    }
  } catch (error) {
    console.error('Failed to select folder:', error);
  }
};

// Watch for Tauri to be ready
onMounted(async () => {
  await initializeOutputPath();
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