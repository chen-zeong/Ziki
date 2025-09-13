import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CompressionSettings, TaskType } from '../types'

// 默认设置
const getDefaultVideoSettings = (): CompressionSettings => ({
  format: 'mp4',
  videoCodec: 'H.264',
  resolution: 'original',
  qualityType: 'crf',
  crfValue: 23,
  hardwareAcceleration: 'cpu',
  bitDepth: 8
})

const getDefaultImageSettings = (): CompressionSettings => ({
  format: 'jpeg',
  videoCodec: 'image',
  resolution: 'original',
  qualityType: 'crf',
  crfValue: 80
})

export const useTaskSettingsStore = defineStore('taskSettings', () => {
  // 存储每个任务的设置
  const taskSettings = ref<Record<string, CompressionSettings>>({})
  
  // 获取任务设置
  const getTaskSettings = (taskId: string, taskType: TaskType): CompressionSettings => {
    if (!taskSettings.value[taskId]) {
      // 如果没有设置，使用默认值
      taskSettings.value[taskId] = taskType === 'video' 
        ? getDefaultVideoSettings()
        : getDefaultImageSettings()
    }
    return taskSettings.value[taskId]
  }
  
  // 更新任务设置
  const updateTaskSettings = (taskId: string, updates: Partial<CompressionSettings>) => {
    if (!taskSettings.value[taskId]) {
      taskSettings.value[taskId] = {} as CompressionSettings
    }
    taskSettings.value[taskId] = {
      ...taskSettings.value[taskId],
      ...updates
    }
  }
  
  // 设置完整的任务设置
  const setTaskSettings = (taskId: string, settings: CompressionSettings) => {
    taskSettings.value[taskId] = { ...settings }
  }
  
  // 删除任务设置
  const deleteTaskSettings = (taskId: string) => {
    delete taskSettings.value[taskId]
  }
  
  // 清空所有设置
  const clearAllSettings = () => {
    taskSettings.value = {}
  }
  
  // 重置任务设置为默认值
  const resetTaskSettings = (taskId: string, taskType: TaskType) => {
    taskSettings.value[taskId] = taskType === 'video' 
      ? getDefaultVideoSettings()
      : getDefaultImageSettings()
  }
  
  // 检查任务是否有自定义设置
  const hasCustomSettings = (taskId: string, taskType: TaskType): boolean => {
    if (!taskSettings.value[taskId]) return false
    
    const current = taskSettings.value[taskId]
    const defaults = taskType === 'video' ? getDefaultVideoSettings() : getDefaultImageSettings()
    
    // 比较关键设置是否与默认值不同
    return (
      current.format !== defaults.format ||
      current.videoCodec !== defaults.videoCodec ||
      current.resolution !== defaults.resolution ||
      current.qualityType !== defaults.qualityType ||
      current.crfValue !== defaults.crfValue ||
      (taskType === 'video' && (
        current.hardwareAcceleration !== defaults.hardwareAcceleration ||
        current.bitDepth !== defaults.bitDepth
      ))
    )
  }
  
  // 获取所有任务设置（用于调试）
  const getAllSettings = computed(() => taskSettings.value)
  
  return {
    // 状态
    taskSettings,
    getAllSettings,
    
    // 方法
    getTaskSettings,
    updateTaskSettings,
    setTaskSettings,
    deleteTaskSettings,
    clearAllSettings,
    resetTaskSettings,
    hasCustomSettings,
    
    // 默认设置工厂函数
    getDefaultVideoSettings,
    getDefaultImageSettings
  }
})