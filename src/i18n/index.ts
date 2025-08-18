import { createI18n } from 'vue-i18n';
import zh from '../locales/zh';
import en from '../locales/en';

// 检测用户的系统语言
function getDefaultLocale(): string {
  // 优先使用localStorage中保存的语言设置
  const savedLocale = localStorage.getItem('app-locale');
  if (savedLocale && ['zh', 'en'].includes(savedLocale)) {
    return savedLocale;
  }

  // 检测浏览器语言
  const browserLang = navigator.language.toLowerCase();
  
  // 如果是中文相关的语言代码，返回中文
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  
  // 其他情况默认使用英文
  return 'en';
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    zh,
    en
  }
});

export default i18n;

// 导出切换语言的函数
export function switchLanguage(locale: 'zh' | 'en') {
  i18n.global.locale.value = locale;
  localStorage.setItem('app-locale', locale);
}

// 导出获取当前语言的函数
export function getCurrentLocale(): string {
  return i18n.global.locale.value;
}