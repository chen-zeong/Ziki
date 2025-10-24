import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import i18n from '../i18n'

// 输出文件名格式类型
export type OutputFileNameFormat = 'original' | 'with-time' | 'with-random'

// 语言类型
export type Language = 'zh' | 'en'

// 主题类型
export type Theme = 'light' | 'dark' | 'auto'

export const useGlobalSettingsStore = defineStore('globalSettings', () => {
  // 状态
  const outputPath = ref('')
  const outputFileNameFormat = ref<OutputFileNameFormat>('with-time')
  const theme = ref<Theme>('auto')
  // 默认语言与 i18n 的默认语言保持一致（根据系统语言自动判定）
  const language = ref<Language>(i18n.global.locale.value as Language)
  const isInitialized = ref(false)

  const { t } = i18n.global

  // 计算属性
  const isDarkMode = computed(() => {
    if (theme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })

  // 文件名格式选项（已接入 i18n，且 value 类型严格为 OutputFileNameFormat）
  const fileNameFormatOptions = computed<{ value: OutputFileNameFormat; label: string; description: string }[]>(() => [
    { value: 'original', label: t('outputFolder.optionOriginal'), description: t('outputFolder.descOriginal') },
    { value: 'with-time', label: t('outputFolder.optionWithTime'), description: t('outputFolder.descWithTime') },
    { value: 'with-random', label: t('outputFolder.optionWithRandom'), description: t('outputFolder.descWithRandom') }
  ])

  const setOutputPath = (path: string) => {
    outputPath.value = path
    saveSettings()
  }

  const setOutputFileNameFormat = (format: OutputFileNameFormat) => {
    outputFileNameFormat.value = format
    saveSettings()
  }

  const setTheme = (value: Theme) => {
    theme.value = value
    updateThemeClass()
    saveSettings()
  }

  const setLanguage = (lang: Language) => {
    language.value = lang
    saveSettings()
  }

  const toggleTheme = () => {
    // 只在 light 和 dark 之间切换，不包含 auto
    if (theme.value === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  // 更新主题类名
  const updateThemeClass = () => {
    const html = document.documentElement
    if (isDarkMode.value) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  // 生成输出文件名
  const generateOutputFileName = (originalName: string, extension: string): string => {
    const baseName = originalName.replace(/\.[^/.]+$/, '') // 移除扩展名
    
    switch (outputFileNameFormat.value) {
      case 'with-time': {
        const now = new Date()
        const yyyy = now.getFullYear()
        const MM = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const HH = String(now.getHours()).padStart(2, '0')
        const mm = String(now.getMinutes()).padStart(2, '0')
        const ss = String(now.getSeconds()).padStart(2, '0')
        const ms = String(now.getMilliseconds()).padStart(3, '0')
        const timeStr = `${yyyy}${MM}${dd}_${HH}${mm}${ss}${ms}`
        return `${baseName}_${timeStr}.${extension}`
      }
      case 'with-random': {
        const randomStr = Math.random().toString(36).substring(2, 8)
        return `${baseName}_${randomStr}.${extension}`
      }
      case 'original':
      default:
        return `${baseName}.${extension}`
    }
  }

  // 初始化默认输出路径
  const initializeOutputPath = async () => {
    if (outputPath.value) return // 已有路径则不重新初始化
    
    try {
      if (window.__TAURI__) {
        const desktopPath = await invoke<string>('get_desktop_path')
        outputPath.value = desktopPath
      } else {
        // 非Tauri环境的默认路径
        outputPath.value = '~/Desktop'
      }
    } catch (error) {
      console.error('Failed to get default output path:', error)
      outputPath.value = '~/Desktop'
    }
  }

  // 保存设置到localStorage
  const saveSettings = () => {
    const settings = {
      outputPath: outputPath.value,
      outputFileNameFormat: outputFileNameFormat.value,
      theme: theme.value,
      language: language.value
    }
    localStorage.setItem('globalSettings', JSON.stringify(settings))
  }

  // 从localStorage加载设置
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('globalSettings')
      if (saved) {
        const settings = JSON.parse(saved)
        outputPath.value = settings.outputPath || ''
        outputFileNameFormat.value = settings.outputFileNameFormat || 'original'
        theme.value = settings.theme || 'auto'
        // 未保存语言时，回退到按系统自动判定的 i18n 默认语言
        language.value = settings.language || (i18n.global.locale.value as Language)
      } else {
        // 没有任何保存记录时，使用 i18n 的默认语言（系统语言）
        language.value = i18n.global.locale.value as Language
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      // 兜底：保持 i18n 默认语言
      language.value = i18n.global.locale.value as Language
    }
  }

  // 初始化设置
  const initialize = async () => {
    if (isInitialized.value) return
    
    loadSettings()
    await initializeOutputPath()
    updateThemeClass()
    
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (theme.value === 'auto') {
          updateThemeClass()
        }
      })
    }
    
    isInitialized.value = true
  }

  // 重置所有设置
  const resetSettings = async () => {
    outputFileNameFormat.value = 'original'
    theme.value = 'auto'
    // 重置为系统语言（与 i18n 默认一致）
    language.value = i18n.global.locale.value as Language
    await initializeOutputPath()
    updateThemeClass()
    saveSettings()
  }

  return {
    // 状态
    outputPath,
    outputFileNameFormat,
    theme,
    language,
    isInitialized,
    
    // 计算属性
    isDarkMode,
    fileNameFormatOptions,
    
    // 动作
    setOutputPath,
    setOutputFileNameFormat,
    setTheme,
    setLanguage,
    toggleTheme,
    generateOutputFileName,
    initialize,
    resetSettings
  }
})
