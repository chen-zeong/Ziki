<template>
  <div class="relative">
    <button 
      class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
      @click="toggleDropdown"
      :title="$t('language.switch')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
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
        class="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
        @click.stop
      >
        <div class="py-1">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
            :class="{
              'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20': currentLocale === lang.code,
              'text-gray-700 dark:text-gray-300': currentLocale !== lang.code
            }"
            @click="switchLang(lang.code)"
          >
            <span>{{ lang.name }}</span>
            <svg 
              v-if="currentLocale === lang.code" 
              class="w-4 h-4 text-amber-600 dark:text-amber-400" 
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { switchLanguage, getCurrentLocale } from '../i18n';

const { locale } = useI18n();

const showDropdown = ref(false);

const languages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
];

const currentLocale = computed(() => getCurrentLocale());

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const switchLang = (langCode: string) => {
  if (langCode === 'zh' || langCode === 'en') {
    switchLanguage(langCode as 'zh' | 'en');
  }
  showDropdown.value = false;
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
    showDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>