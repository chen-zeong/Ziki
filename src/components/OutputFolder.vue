<template>
  <!-- Output Folder Settings (Expandable) -->
  <div class="output-folder-container">
    <transition 
      name="slide-down"
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-48"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-48"
      leave-to-class="opacity-0 max-h-0"
    >
      <div 
        v-if="showOutputFolder"
        class="bg-white dark:bg-dark-panel border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 mb-3 overflow-hidden"
      >
        <div class="space-y-4">

          <!-- 删除记录时同步删除压缩文件开关 -->
          <div>
            <label class="flex items-center justify-between cursor-pointer group">
              <div class="flex-1">
                <div class="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                  {{ $t('outputFolder.deleteCompressedFileOnTaskDelete') }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ $t('outputFolder.deleteCompressedFileOnTaskDeleteDesc') }}
                </div>
              </div>
              <div class="relative ml-4">
                <input
                  type="checkbox"
                  :checked="globalSettings.deleteCompressedFileOnTaskDelete"
                  @change="globalSettings.setDeleteCompressedFileOnTaskDelete(($event.target as HTMLInputElement).checked)"
                  class="sr-only"
                />
                <div
                  :class="[
                    'w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
                    globalSettings.deleteCompressedFileOnTaskDelete
                      ? 'bg-[#558ee1]'
                      : 'bg-gray-300 dark:bg-gray-600'
                  ]"
                >
                  <div
                    :class="[
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out',
                      globalSettings.deleteCompressedFileOnTaskDelete ? 'translate-x-5' : 'translate-x-0'
                    ]"
                  ></div>
                </div>
              </div>
            </label>
          </div>
          
          <!-- 输出文件名格式 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('outputFolder.fileNameFormat') }}
            </label>
            <div class="flex space-x-2">
              <button
                v-for="option in globalSettings.fileNameFormatOptions"
                :key="option.value"
                @click="setOutputFormat(option.value)"
                :class="[
                  'flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] whitespace-pre-line text-center',
                  globalSettings.outputFileNameFormat === option.value
                    ? 'bg-[#558ee1] text-white border-[#558ee1] shadow-md shadow-[#558ee1]/25'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                ]"
                :title="option.description"
              >
                {{ option.label }}
              </button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ currentFormatDescription }}
            </p>
          </div>
          
          <!-- 输出文件夹路径 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {{ $t('outputFolder.title') || '输出文件夹' }}
            </label>
            <div class="flex items-center space-x-2">
              <div class="flex-1 relative">
                <input 
                  v-model="globalSettings.outputPath"
                  type="text" 
                   class="w-full px-3 py-2 pr-12 border rounded-md bg-white dark:bg-[#222221] text-gray-900 dark:text-gray-100 text-sm border-gray-300 dark:border-gray-600 focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500"
                   :placeholder="$t('outputFolder.selectFolder') || '选择输出路径...'"
                   readonly
                 />
                 <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                   <button 
                     class="p-2 rounded-md transition-colors group text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                     @click="selectOutputFolder"
                     :title="$t('outputFolder.selectFolder') || '选择文件夹'"
                   >
                     <FolderPen class="w-4 h-4 group-hover:animate-pulse" />
                   </button>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderPen, Folder } from 'lucide-vue-next';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import { useI18n } from 'vue-i18n';
import type { OutputFileNameFormat } from '../stores/useGlobalSettingsStore';

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

// 使用全局设置store
const globalSettings = useGlobalSettingsStore();

const { t } = useI18n();

// 当前格式描述
const currentFormatDescription = computed(() => {
  const option = globalSettings.fileNameFormatOptions.find(
    opt => opt.value === globalSettings.outputFileNameFormat
  );
  return option?.description || '';
});

// 包装设置函数，确保模板类型安全
const setOutputFormat = (val: OutputFileNameFormat) => {
  globalSettings.setOutputFileNameFormat(val);
};

// 选择输出文件夹
const selectOutputFolder = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t('outputFolder.selectFolder')
    });
    
    if (selected && typeof selected === 'string') {
      globalSettings.setOutputPath(selected);
      emit('update:outputPath', selected);
    }
  } catch (error) {
    console.error('Failed to select folder:', error);
  }
};

// 监听输出路径变化，同步给父组件
watch(
  () => globalSettings.outputPath,
  (newPath) => {
    emit('update:outputPath', newPath);
  }
);

// 初始化
onMounted(async () => {
  await globalSettings.initialize();
  // 初始化后立即同步路径给父组件
  emit('update:outputPath', globalSettings.outputPath);
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