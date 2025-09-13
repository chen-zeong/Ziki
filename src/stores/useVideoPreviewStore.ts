import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface TaskCacheData {
  frameCache: Map<number, { original?: string; compressed?: string }>
  videoDurationCache: Map<string, number> // videoPath -> duration
  taskParams?: {
    timeRange?: { start: number; end: number }
    videoPath?: string
    compressedVideoPath?: string
  }
}

export const useVideoPreviewStore = defineStore('videoPreview', () => {
  // 全局任务缓存
  const globalTaskCache = ref<Map<string, TaskCacheData>>(new Map())
  
  // 当前加载中的帧
  const loadingFrames = ref<Set<number>>(new Set())
  
  // 全屏状态
  const isFullscreen = ref<boolean>(false)
  
  // 当前选中的帧索引
  const selectedFrameIndex = ref<number | null>(null)
  
  // 滑块拖拽状态
  const isDraggingFullscreen = ref(false)
  
  // 全屏图片源
  const fullscreenBeforeSrc = ref<string>('')
  const fullscreenAfterSrc = ref<string>('')
  
  // 获取当前任务的缓存数据
  const getTaskCache = (taskId: string, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string): TaskCacheData => {
    if (!globalTaskCache.value.has(taskId)) {
      globalTaskCache.value.set(taskId, {
        frameCache: new Map(),
        videoDurationCache: new Map(),
        taskParams: {
          timeRange,
          videoPath,
          compressedVideoPath
        }
      })
    }
    
    // 更新任务参数（可能发生变化）
    const cache = globalTaskCache.value.get(taskId)!
    cache.taskParams = {
      timeRange,
      videoPath,
      compressedVideoPath
    }
    
    return cache
  }
  
  // 获取当前任务的帧缓存
  const getFrameCache = (taskId: string, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string) => {
    return getTaskCache(taskId, timeRange, videoPath, compressedVideoPath).frameCache
  }
  
  // 获取当前任务的视频时长缓存
  const getVideoDurationCache = (taskId: string, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string) => {
    return getTaskCache(taskId, timeRange, videoPath, compressedVideoPath).videoDurationCache
  }
  
  // 设置帧缓存
  const setFrameCache = (taskId: string, frameIndex: number, data: { original?: string; compressed?: string }, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string) => {
    const cache = getFrameCache(taskId, timeRange, videoPath, compressedVideoPath)
    cache.set(frameIndex, data)
  }
  
  // 获取帧缓存
  const getFrameCacheData = (taskId: string, frameIndex: number, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string) => {
    const cache = getFrameCache(taskId, timeRange, videoPath, compressedVideoPath)
    return cache.get(frameIndex)
  }
  
  // 设置视频时长缓存
  const setVideoDuration = (taskId: string, videoPath: string, duration: number, timeRange?: { start: number; end: number }, compressedVideoPath?: string) => {
    const cache = getVideoDurationCache(taskId, timeRange, videoPath, compressedVideoPath)
    cache.set(videoPath, duration)
  }
  
  // 获取视频时长缓存
  const getVideoDuration = (taskId: string, videoPath: string, timeRange?: { start: number; end: number }, compressedVideoPath?: string) => {
    const cache = getVideoDurationCache(taskId, timeRange, videoPath, compressedVideoPath)
    return cache.get(videoPath)
  }
  
  // 添加加载中的帧
  const addLoadingFrame = (frameIndex: number) => {
    loadingFrames.value.add(frameIndex)
  }
  
  // 移除加载中的帧
  const removeLoadingFrame = (frameIndex: number) => {
    loadingFrames.value.delete(frameIndex)
  }
  
  // 检查帧是否正在加载
  const isFrameLoading = (frameIndex: number) => {
    return loadingFrames.value.has(frameIndex)
  }
  
  // 清除指定帧的缓存
  const clearFrameCache = (taskId: string, frameIndex: number, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string) => {
    const cache = getFrameCache(taskId, timeRange, videoPath, compressedVideoPath)
    cache.delete(frameIndex)
  }
  
  // 清除指定任务的所有缓存
  const clearTaskCache = (videoPath?: string) => {
    if (videoPath) {
      // 根据传入的视频路径匹配对应的任务缓存并清理
      const toDelete: string[] = []
      for (const [id, cache] of globalTaskCache.value.entries()) {
        const params = cache.taskParams
        if (params?.videoPath === videoPath || params?.compressedVideoPath === videoPath) {
          toDelete.push(id)
        }
      }
      toDelete.forEach(id => globalTaskCache.value.delete(id))
      if (toDelete.length > 0) {
        console.log('Cleared cache by videoPath for tasks:', toDelete.join(', '))
      }
      return
    }
  }
  
  // 清除所有缓存
  const clearAllCache = () => {
    globalTaskCache.value.clear()
    loadingFrames.value.clear()
    selectedFrameIndex.value = null
    fullscreenBeforeSrc.value = ''
    fullscreenAfterSrc.value = ''
  }
  
  // 重置帧数据
  const resetFrameData = (taskId: string, timeRange?: { start: number; end: number }, videoPath?: string, compressedVideoPath?: string) => {
    const frameCache = getFrameCache(taskId, timeRange, videoPath, compressedVideoPath)
    const videoDurationCache = getVideoDurationCache(taskId, timeRange, videoPath, compressedVideoPath)
    frameCache.clear()
    videoDurationCache.clear()
    selectedFrameIndex.value = 0
    fullscreenBeforeSrc.value = ''
    fullscreenAfterSrc.value = ''
  }
  
  // 切换全屏状态
  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
  }
  
  // 关闭全屏
  const closeFullscreen = () => {
    isFullscreen.value = false
  }
  
  // 设置全屏拖拽状态
  const setFullscreenDragging = (dragging: boolean) => {
    isDraggingFullscreen.value = dragging
  }
  
  // 设置选中的帧索引
  const setSelectedFrameIndex = (index: number | null) => {
    selectedFrameIndex.value = index
  }
  
  // 设置全屏图片源
  const setFullscreenImages = (beforeSrc: string, afterSrc: string) => {
    fullscreenBeforeSrc.value = beforeSrc
    fullscreenAfterSrc.value = afterSrc
  }
  
  return {
    // 状态
    globalTaskCache: computed(() => globalTaskCache.value),
    loadingFrames: computed(() => loadingFrames.value),
    isFullscreen: computed(() => isFullscreen.value),
    selectedFrameIndex: computed(() => selectedFrameIndex.value),
    isDraggingFullscreen: computed(() => isDraggingFullscreen.value),
    fullscreenBeforeSrc: computed(() => fullscreenBeforeSrc.value),
    fullscreenAfterSrc: computed(() => fullscreenAfterSrc.value),
    
    // 方法
    getTaskCache,
    getFrameCache,
    getVideoDurationCache,
    setFrameCache,
    getFrameCacheData,
    setVideoDuration,
    getVideoDuration,
    addLoadingFrame,
    removeLoadingFrame,
    isFrameLoading,
    clearFrameCache,
    clearTaskCache,
    clearAllCache,
    resetFrameData,
    toggleFullscreen,
    closeFullscreen,
    setFullscreenDragging,
    setSelectedFrameIndex,
    setFullscreenImages
  }
})