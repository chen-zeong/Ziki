<template>
  <div class="relative">
    <button 
      class="h-6 w-6 flex items-center justify-center text-gray-600 dark:text-dark-secondary rounded-md transition-colors hover:bg-gray-200/80 dark:hover:bg-dark-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50"
      @click="toggleDropdown"
      :title="$t('language.switch')"
      data-tauri-drag-region="false"
    >
      <Languages class="w-4 h-4" />
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
        class="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-[#161b24] rounded-xl shadow-[0_16px_38px_rgba(15,23,42,0.15)] dark:shadow-[0_18px_34px_rgba(5,10,24,0.55)] border border-slate-200/70 dark:border-slate-700/60 z-50"
        @click.stop
      >
        <div class="py-1.5">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="w-full px-4 py-2 text-left text-sm transition-all duration-150 flex items-center justify-between"
            :class="currentLocale === lang.code
              ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium rounded-lg'
              : 'text-slate-600 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-700/40 rounded-lg'"
            @click="switchLang(lang.code)"
          >
            <span>{{ lang.name }}</span>
            <Check 
              v-if="currentLocale === lang.code"
              class="w-4 h-4 text-[var(--brand-primary)]"
            />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { switchLanguage } from '../i18n';
import { useGlobalSettingsStore } from '../stores/useGlobalSettingsStore';
import type { Language } from '../stores/useGlobalSettingsStore';
import { Languages, Check } from 'lucide-vue-next';

const globalSettings = useGlobalSettingsStore();

const showDropdown = ref(false);

const languages = [
  { code: 'zh' as Language, name: '简体中文' },
  { code: 'en' as Language, name: 'English' }
];

const currentLocale = computed(() => globalSettings.language);

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
