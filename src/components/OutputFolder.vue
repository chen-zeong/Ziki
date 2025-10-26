<template>
  <div>
    <div
      class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      v-if="isPopupVisible"
      @click="closePopup"
    ></div>

    <div
      v-if="isPopupVisible"
      class="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-gray-200/50 dark:border-gray-700/60">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ $t('outputFolder.title') || '输出文件夹设置' }}</h2>
          <button
            @click="closePopup"
            class="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-white/80 transition"
            title="关闭"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="px-4 py-3 rounded-2xl bg-white dark:bg-white/10 border border-gray-200/70 dark:border-white/15 shadow-sm flex items-center justify-between hover:bg-white/90 transition overflow-hidden">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-blue-50 text-blue-500 dark:bg-white/5 dark:text-blue-300">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-700 dark:text-white/80">{{ $t('outputFolder.location') || '设置输出文件夹位置' }}</div>
                <div class="text-sm text-gray-500 dark:text-white/60">
                  <span class="truncate min-w-0" :title="globalSettings.outputPath">{{ globalSettings.outputPath || ($t('outputFolder.selectFolder') || '选择输出路径...') }}</span>
                </div>
              </div>
            </div>
            <div class="flex-shrink-0">
              <button
                @click="openFolderDialog"
                class="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition"
                title="选择文件夹"
              >
                {{ $t('outputFolder.choose') || '选择' }}
              </button>
            </div>
          </div>

          <div class="px-4 py-3 rounded-2xl bg-white dark:bg-white/10 border border-gray-200/70 dark:border-white/15 shadow-sm">
            <label class="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">{{ $t('outputFolder.format') || '输出文件格式' }}</label>
            <select
              class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/15 text-gray-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-300/40"
              v-model="format"
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="avi">AVI</option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              @click="saveSettings"
              class="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition"
              title="保存设置"
            >
              {{ $t('outputFolder.save') || '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore'

const globalSettings = useGlobalSettingsStore()

const isPopupVisible = ref(false)
const format = ref('mp4')

watch(() => globalSettings.outputPath, (newPath) => {
  // 可在此处扩展：路径变更时的校验或提示
})

function openDialog() {
  isPopupVisible.value = true
}

function closePopup() {
  isPopupVisible.value = false
}

function openFolderDialog() {
  // 模拟选择文件夹逻辑
  // 实际项目中应接入系统文件选择器
  const examplePath = 'C:/Users/VeryLongUserName/Documents/Projects/Super/Deep/Nested/Path/That/Is/Really/Long/Output'
  globalSettings.setOutputPath(examplePath)
}

function saveSettings() {
  isPopupVisible.value = false
}

// 暴露方法供外部调用
// @ts-ignore
defineExpose({ openDialog })
</script>

<style scoped>
/* 可在此添加额外样式 */
</style>
