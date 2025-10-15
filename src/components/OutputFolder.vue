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
        class="bg-white/80 dark:bg-[#1a1c25]/85 border border-white/70 dark:border-white/10 rounded-2xl shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-md px-5 py-4 mb-4 overflow-hidden transition-all duration-300"
      >
        <div class="space-y-4">

          <!-- 删除记录时同步删除压缩文件开关 -->
          <div>
            <label class="flex items-center justify-between cursor-pointer group">
              <div class="flex-1">
                <div class="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {{ $t('outputFolder.deleteCompressedFileOnTaskDelete') }}
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                <span
                  class="relative flex items-center h-7 w-12 rounded-full transition-all duration-300"
                  :class="globalSettings.deleteCompressedFileOnTaskDelete ? 'bg-[var(--brand-primary)] shadow-[0_8px_20px_rgba(81,98,255,0.35)]' : 'bg-slate-200 dark:bg-white/15'"
                >
                  <span
                    class="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white dark:bg-[#1f2230] shadow-md transition-all duration-300"
                    :class="globalSettings.deleteCompressedFileOnTaskDelete ? 'translate-x-5' : ''"
                  ></span>
                </span>
              </div>
            </label>
          </div>
          
          <!-- 输出文件名格式 -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {{ $t('outputFolder.fileNameFormat') }}
            </label>
            <div class="flex space-x-2">
              <button
                v-for="option in globalSettings.fileNameFormatOptions"
                :key="option.value"
                @click="setOutputFormat(option.value)"
                :class="[
                  'flex-1 px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-250 whitespace-pre-line text-center hover:-translate-y-[1px]',
                  globalSettings.outputFileNameFormat === option.value
                    ? 'bg-[var(--brand-primary)] text-white border-transparent shadow-[0_12px_24px_rgba(81,98,255,0.28)]'
                    : 'bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-white/60 dark:border-white/10 hover:bg-white/85 dark:hover:bg-white/10'
                ]"
                :title="option.description"
              >
                {{ option.label }}
              </button>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {{ currentFormatDescription }}
            </p>
          </div>
          
          <!-- 输出文件夹路径 -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              {{ $t('outputFolder.title') || '输出文件夹' }}
            </label>
            <div class="flex items-center gap-3">
              <div class="flex-1">
                <div class="px-4 py-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/70 dark:border-white/10 text-sm text-slate-600 dark:text-slate-200 flex items-center justify-between hover:bg-white/75 dark:hover:bg-white/8 transition-all duration-200">
                  <span class="truncate">{{ globalSettings.outputPath || ($t('outputFolder.selectFolder') || '选择输出路径...') }}</span>
                  <button 
                    class="ml-3 h-8 w-8 flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_10px_20px_rgba(81,98,255,0.28)] hover:scale-105 transition-all duration-200"
                    @click="selectOutputFolder"
                    :title="$t('outputFolder.selectFolder') || '选择文件夹'"
                  >
                    <FolderPen class="w-4 h-4" />
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
