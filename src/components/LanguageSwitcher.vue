<template>
  <div class="relative">
    <button 
      class="h-6 px-2 rounded-md text-xs text-gray-600 dark:text-dark-secondary bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-panel focus:outline-none transition-colors flex items-center space-x-1"
      @click="toggleDropdown"
      :title="$t('language.switch')"
      data-tauri-drag-region="false"
    >
      <span>{{ currentLanguageName }}</span>
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
    
    <!-- 下拉菜单 -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="showDropdown" 
        class="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-dark-panel rounded-lg shadow-lg border border-gray-200 dark:border-dark-border z-50"
        @click.stop
      >
        <div class="py-1">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-border transition-colors flex items-center justify-between"
            :class="{
              'text-amber-600 dark:text-dark-accent bg-amber-50 dark:bg-dark-accent/20': currentLocale === lang.code,
              'text-gray-700 dark:text-dark-text': currentLocale !== lang.code
            }"
            @click="switchLang(lang.code)"
          >
            <span>{{ lang.name }}</span>
            <svg 
              v-if="currentLocale === lang.code" 
              class="w-4 h-4 text-amber-600 dark:text-dark-accent" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { switchLanguage, getCurrentLocale } from '../i18n';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import type { Language } from '../stores/useGlobalSettingsStore';

const { locale } = useI18n();
const globalSettings = useGlobalSettingsStore();

const showDropdown = ref(false);

const languages = [
  { code: 'zh' as Language, name: '简体中文' },
  { code: 'en' as Language, name: 'English' }
];

const currentLocale = computed(() => globalSettings.language);

const currentLanguageName = computed(() => {
  const lang = languages.find(l => l.code === currentLocale.value);
  return lang ? lang.name : 'English';
});

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const switchLang = (langCode: Language) => {
  globalSettings.setLanguage(langCode);
  switchLanguage(langCode);
  showDropdown.value = false;
};

// 监听全局设置中的语言变化，同步到i18n
watch(
  () => globalSettings.language,
  (newLang) => {
    switchLanguage(newLang);
  }
);

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
    showDropdown.value = false;
  }
};

onMounted(async () => {
  await globalSettings.initialize();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>