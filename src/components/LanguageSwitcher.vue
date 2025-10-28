<template>
  <div class="relative" ref="rootRef">
    <button 
      :class="['header-icon-button', 'language-trigger', { 'is-active': showDropdown }]"
      @click="toggleDropdown"
      :title="$t('language.switch')"
      data-tauri-drag-region="false"
    >
      <Languages class="w-4 h-4" />
    </button>
    
    <Transition name="lang-pop">
      <div 
        v-if="showDropdown" 
        class="language-dropdown"
        @click.stop
      >
        <div class="language-dropdown__list">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="language-item"
            :class="currentLocale === lang.code ? 'language-item--active' : ''"
            @click="switchLang(lang.code)"
          >
            <span class="language-item__name">{{ lang.name }}</span>
            <MotionCheck
              v-if="currentLocale === lang.code"
              class="language-item__check"
              :initial="{ opacity: 0, scale: 0.7 }"
              :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.18, ease: 'easeOut' }"
            >
              <Check class="w-4 h-4" />
            </MotionCheck>
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
import { motion } from 'motion-v';

const globalSettings = useGlobalSettingsStore();

const showDropdown = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const MotionCheck = motion.div;

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
  const target = event.target as Node;
  if (rootRef.value && !rootRef.value.contains(target)) {
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

<style scoped>
.language-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 180px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 20px 38px -18px rgba(15, 23, 42, 0.24);
  backdrop-filter: blur(10px);
  overflow: hidden;
  z-index: 1200;
}
.dark .language-dropdown {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(22, 27, 39, 0.95);
  box-shadow: 0 24px 52px -18px rgba(0, 0, 0, 0.55);
}
.language-dropdown__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}
.language-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: #1e293b;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}
.language-item:hover {
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.08);
}
.language-item--active {
  border-color: rgba(99, 102, 241, 0.35);
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
}
.dark .language-item {
  color: #e2e8f0;
}
.dark .language-item:hover {
  border-color: rgba(129, 140, 248, 0.32);
  background: rgba(129, 140, 248, 0.12);
}
.dark .language-item--active {
  border-color: rgba(129, 140, 248, 0.45);
  background: rgba(129, 140, 248, 0.18);
  color: #cbd5f5;
}
.language-item__name {
  font-size: 12px;
  font-weight: 600;
}
.language-item__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.16);
  color: rgba(79, 70, 229, 0.95);
}
.dark .language-item__check {
  background: rgba(129, 140, 248, 0.16);
  color: rgba(129, 140, 248, 0.9);
}
.lang-pop-enter-active,
.lang-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
  transform-origin: top right;
}
.lang-pop-enter-from,
.lang-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.96);
}
</style>
