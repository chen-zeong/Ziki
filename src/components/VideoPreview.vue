<template>
  <div class="w-full h-full flex flex-col">
    <!-- 视频预览功能 -->
    <div 
      ref="sliderRef"
      class="comparison-slider w-full h-full bg-gray-200 dark:bg-[#1e1e1e] relative overflow-hidden rounded-2xl border-4 border-blue-300 dark:border-slate-700 bg-clip-padding backdrop-blur-sm"
      :style="{ '--position': `${sliderPosition}%` }"
    >
      <!-- 压缩前（左侧） -->
      <img 
         ref="beforeImgRef"
         :alt="$t('videoComparison.original')" 
         class="before-image w-full h-full object-cover"
       >
       
       <!-- 压缩后（右侧） -->
       <div v-if="hasAfter" class="after-image">
         <img 
           ref="afterImgRef"
           :alt="$t('videoComparison.compressed')" 
           class="w-full h-full object-cover"
         >
       </div>
       
       <!-- 文字标签 - 只在任务完成时显示 -->
       <div v-if="props.taskStatus === 'completed'" class="absolute top-4 left-4 backdrop-blur-md bg-white/20 text-white px-2 py-1 rounded text-sm z-20 ">
         {{ $t('videoComparison.original') }}
       </div>
       <div v-if="props.taskStatus === 'completed'" class="absolute top-4 right-4 backdrop-blur-md bg-white/20 text-white px-2 py-1 rounded text-sm z-20">
         {{ $t('videoComparison.compressed') }}
       </div>
       


       <!-- 放大镜图标 -->
       <button 
          @click="toggleFullscreen"
          class="absolute bottom-4 right-4 backdrop-blur-md bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all duration-200"
          title="全屏查看"
          style="z-index: 50; pointer-events: auto;"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
        </button>
       
      <div v-if="props.taskStatus === 'completed'" class="slider" @mousedown="startDragging">
        <div class="slider-handle">
          <svg class="w-4 h-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <svg class="w-4 h-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </div>
    
    <Transition name="modal" appear>
      <div 
        v-if="isFullscreen" 
        class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 bg-transparent dark:bg-transparent"
        @click="closeFullscreen"
      >
        
        <div 
          ref="modalContentRef"
          class="modal-content relative w-full h-full overflow-hidden"
          @click.stop
        >
          
          <button 
            @click="closeFullscreen" 
            class="absolute top-2 right-2 z-50 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-gray-900/20 border border-blue-300 dark:border-white/30 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:rotate-90 hover:bg-blue-200 dark:hover:bg-white/30"
            title="关闭全屏 (ESC)"
          >
            <svg class="w-4 h-4 text-blue-500 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div class="relative w-full h-full p-3 flex items-center justify-center">
            
            <div 
               ref="fullscreenSliderRef"
               class="comparison-slider fullscreen-slider w-full h-full bg-gray-200 dark:bg-gray-900 relative rounded-2xl overflow-hidden border-4 border-blue-300 dark:border-slate-700 bg-clip-padding backdrop-blur-sm"
               :style="{ '--position': `${sliderPosition}%` }"
               @click.stop
            >
              <!-- 压缩前（左侧） -->
              <img 
                :src="fullscreenBeforeSrc"
                :alt="$t('videoComparison.original')" 
                class="before-image w-full h-full object-contain"
              >
              
              <!-- 压缩后（右侧） -->
              <div v-if="hasAfter" class="after-image">
                <img 
                  :src="fullscreenAfterSrc"
                  :alt="$t('videoComparison.compressed')" 
                  class="w-full h-full object-contain"
                >
              </div>
              
              
              <div v-if="props.taskStatus === 'completed'" class="absolute top-4 left-4 backdrop-blur-md bg-white/20 text-white px-3 py-2 rounded text-base z-20">
                {{ $t('videoComparison.original') }}
              </div>
              <div v-if="props.taskStatus === 'completed'" class="absolute top-4 right-4 backdrop-blur-md bg-white/20 text-white px-3 py-2 rounded text-base z-20">
                {{ $t('videoComparison.compressed') }}
              </div>
              
              
               <div v-if="props.videoPath" class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30" style="pointer-events: auto;">
                 <div class="frame-selector flex justify-center">
                   <div class="flex items-center gap-2 backdrop-blur-md bg-white/20 px-3 py-2 rounded-full border border-white/30">
                     <div 
                       v-for="index in 10" 
                       :key="index"
                       class="w-6 h-1.5 rounded-full cursor-pointer transition-all duration-200"
                       :class="{
                         'bg-gray-300 hover:bg-gray-200': selectedFrameIndex !== index - 1
                       }"
                       :style="{
                         backgroundColor: selectedFrameIndex === index - 1 ? '#faa539' : ''
                       }"
                       @click="selectFrame(index - 1)"
                       :title="`第 ${index} 帧`"
                       style="pointer-events: auto;"
                     >
                     </div>
                   </div>
                 </div>
               </div>
               
              
              <div v-if="props.taskStatus === 'completed'" class="fullscreen-slider-line" @mousedown="startFullscreenDragging">
                <div class="fullscreen-slider-handle">
                  <svg class="w-6 h-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <svg class="w-6 h-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useComparison } from '../composables/useComparison';
import { invoke } from '@tauri-apps/api/core';
import { useVideoPreviewStore } from '../stores/useVideoPreviewStore';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface Props {
  title?: string;
  beforeImage: string;
  afterImage: string;
  videoPath?: string;
  compressedVideoPath?: string;
  compressedVideoFilePath?: string;
  taskStatus?: string;
  taskId?: string; // 新增：任务ID用于缓存隔离
  timeRange?: {
    start: number;
    end: number;
  };
  deferInitialPreview?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '视频预览',
  taskStatus: 'pending',
  deferInitialPreview: true
});

const emit = defineEmits<{
  reset: [];
  updateImages: [{ beforeImage?: string; afterImage?: string }];
}>();

const { sliderPosition, sliderRef, startDragging } = useComparison();
const videoPreviewStore = useVideoPreviewStore();

// 从store获取状态
const selectedFrameIndex = computed(() => videoPreviewStore.selectedFrameIndex);
const loadingFrames = computed(() => videoPreviewStore.loadingFrames);

// 获取当前任务ID
const getCurrentTaskId = () => {
  return props.taskId || props.videoPath || 'default';
};

// 获取当前任务的帧缓存
const getFrameCache = () => {
  return videoPreviewStore.getFrameCache(
    getCurrentTaskId(),
    props.timeRange,
    props.videoPath,
    props.compressedVideoFilePath
  );
};

// 获取当前任务的视频时长缓存
const getVideoDurationCache = () => {
  return videoPreviewStore.getVideoDurationCache(
    getCurrentTaskId(),
    props.timeRange,
    props.videoPath,
    props.compressedVideoFilePath
  );
};

const beforeImgRef = ref<HTMLImageElement | null>(null);
const afterImgRef = ref<HTMLImageElement | null>(null);

// 从store获取全屏相关状态
const fullscreenBeforeSrc = computed(() => videoPreviewStore.fullscreenBeforeSrc);
const fullscreenAfterSrc = computed(() => videoPreviewStore.fullscreenAfterSrc);
const isFullscreen = computed(() => videoPreviewStore.isFullscreen);
const isDraggingFullscreen = computed(() => videoPreviewStore.isDraggingFullscreen);

// 是否存在右侧图像（用于隐藏图片任务未压缩时的覆盖层）
const hasAfter = computed(() => !!props.afterImage);

const fullscreenSliderRef = ref<HTMLElement | null>(null);
const modalContentRef = ref<HTMLElement | null>(null);

// 判断是否运行在 Tauri 环境
const isTauriEnv = () => typeof (window as any).__TAURI__ !== 'undefined';

// requestIdleCallback 兼容封装与任务ID
const requestIdle = (cb: () => void, timeout = 500) => {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(cb, { timeout });
  }
  return window.setTimeout(cb, Math.min(timeout, 200));
};
let initialPreviewIdleId: number | null = null;

// 新增：选择帧的防抖定时器
let selectFrameDebounceTimer: number | null = null;

// 新增：全屏和滑块交互相关方法（使用浏览器官方全屏 API）
const toggleFullscreen = async () => {
  // 先显示应用内全屏模态，避免先放大主窗口导致视觉突变
  videoPreviewStore.toggleFullscreen();
  await nextTick();

  if (isTauriEnv()) {
    try {
      const appWindow = getCurrentWindow();
      // 放到下一轮事件循环，确保模态已完成展示再切主窗口全屏
      setTimeout(() => {
        appWindow.setFullscreen(true).catch(() => {});
      }, 0);
      return;
    } catch {}
  }
  // 非 Tauri 环境：回退为浏览器元素全屏（仅模态内容）
  const el: any = modalContentRef.value || fullscreenSliderRef.value;
  if (el) {
    try {
      const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      if (typeof req === 'function') await req.call(el);
    } catch {}
  }
};

const closeFullscreen = async () => {
  if (isTauriEnv()) {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setFullscreen(false);
    } catch {}
  } else {
    try {
      const exit =
        (document as any).exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).msExitFullscreen;
      if (document.fullscreenElement && typeof exit === 'function') {
        await exit.call(document);
      }
    } catch {}
  }
  videoPreviewStore.closeFullscreen();
};

// 当用户用系统手势或ESC退出浏览器全屏时，同步关闭覆盖层
const handleFullscreenChange = () => {
  if (!document.fullscreenElement && isFullscreen.value) {
    videoPreviewStore.closeFullscreen();
  }
};

const updateFullscreenSliderPosition = (e: MouseEvent) => {
  const el = (fullscreenSliderRef.value as HTMLElement) || (sliderRef.value as HTMLElement);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
  const percent = (x / rect.width) * 100;
  sliderPosition.value = Math.min(100, Math.max(0, percent));
};

const startFullscreenDragging = (e: MouseEvent) => {
  videoPreviewStore.setFullscreenDragging(true);
  updateFullscreenSliderPosition(e);
};

const handleFullscreenMouseMove = (e: MouseEvent) => {
  if (!isDraggingFullscreen.value) return;
  updateFullscreenSliderPosition(e);
};

const stopFullscreenDragging = () => {
  videoPreviewStore.setFullscreenDragging(false);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (!isFullscreen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeFullscreen();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    sliderPosition.value = Math.max(0, sliderPosition.value - 2);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    sliderPosition.value = Math.min(100, sliderPosition.value + 2);
  }
};

// 新增：复位帧相关本地状态，供父组件和监听器调用
const resetFrameData = () => {
  videoPreviewStore.resetFrameData(
    getCurrentTaskId(),
    props.timeRange,
    props.videoPath,
    props.compressedVideoFilePath
  );
  if (beforeImgRef.value) beforeImgRef.value.src = '';
  if (afterImgRef.value) afterImgRef.value.src = '';
};

// 清除指定帧的缓存
const clearFrameCache = (frameIndex: number) => {
  videoPreviewStore.clearFrameCache(
    getCurrentTaskId(),
    frameIndex,
    props.timeRange,
    props.videoPath,
    props.compressedVideoFilePath
  );
};

// 清除指定任务的所有缓存
const clearTaskCache = (videoPath?: string) => {
  videoPreviewStore.clearTaskCache(videoPath);
};

// 新增：选择帧（异步、带缓存、防抖）
const selectFrame = async (index: number) => {
  // 严格检查：图片模式下不应该调用此函数
  if (videoPreviewStore.isFrameLoading(index) || !props.videoPath || props.videoPath === undefined || props.videoPath === '') {
    console.log('selectFrame skipped:', { index, videoPath: props.videoPath, hasVideoPath: !!props.videoPath });
    return;
  }

  videoPreviewStore.setSelectedFrameIndex(index);

  // 优先从缓存读取
  const cached = videoPreviewStore.getFrameCacheData(
    getCurrentTaskId(),
    index,
    props.timeRange,
    props.videoPath,
    props.compressedVideoFilePath
  );
  if (cached) {
    if (cached.original && beforeImgRef.value) beforeImgRef.value.src = cached.original;
    if (cached.compressed && afterImgRef.value) afterImgRef.value.src = cached.compressed;
    videoPreviewStore.setFullscreenImages(cached.original || '', cached.compressed || '');
    if (cached.original && (cached.compressed || !props.compressedVideoFilePath)) {
      return;
    }
  }

  videoPreviewStore.addLoadingFrame(index);

  try {
    const videoPath = props.videoPath;
    const compressedPath = props.compressedVideoFilePath;

    // 获取原视频时长（带缓存）
    const videoDurationCache = getVideoDurationCache();
    let duration = videoDurationCache.get(videoPath);
    if (!duration) {
      duration = await invoke('get_video_duration', { videoPath: videoPath });
      if (duration) videoDurationCache.set(videoPath, duration);
    }
    if (!duration || duration <= 0) {
      console.error('无法获取视频时长或时长无效:', videoPath);
      return;
    }

    // 计算原视频的时间段（如未启用自定义时间段，则为整段）
    const { start = 0, end = duration } = props.timeRange || {};
    const originalStart = Math.max(0, start);
    const originalEnd = Math.max(originalStart + 0.1, Math.min(end, duration));

    // 并行生成原始帧和压缩帧以提升性能
    const existingCache = videoPreviewStore.getFrameCacheData(
      getCurrentTaskId(),
      index,
      props.timeRange,
      props.videoPath,
      props.compressedVideoFilePath
    );
    const cache = existingCache || {};
    const promises: Promise<void>[] = [];

    // --- 生成原始视频的帧（按时间段第 index 帧） ---
    if (!cache.original) {
      const originalPromise = invoke<string>('generate_single_frame_with_time_range', {
         videoPath,
         frameIndex: index,
         timeRangeStart: originalStart,
         timeRangeEnd: originalEnd
       }).then((originalFrame) => {
        if (originalFrame) {
          if (beforeImgRef.value) beforeImgRef.value.src = originalFrame;
          cache.original = originalFrame;
          videoPreviewStore.setFrameCache(
            getCurrentTaskId(),
            index,
            cache,
            props.timeRange,
            props.videoPath,
            props.compressedVideoFilePath
          );
          videoPreviewStore.setFullscreenImages(originalFrame, fullscreenAfterSrc.value);
        }
      }).catch(error => {
        console.error(`生成原始帧 ${index} 失败:`, error);
      });
      promises.push(originalPromise);
    }

    // --- 如果有压缩视频，则在映射后的时间段内生成帧 ---
    if (compressedPath && !cache.compressed) {
      // 异步获取压缩视频时长，不阻塞原始帧生成
      const compressedPromise = (async () => {
        let compressedDuration = videoDurationCache.get(compressedPath);
        if (!compressedDuration) {
          try {
            compressedDuration = await invoke('get_video_duration', { videoPath: compressedPath });
            if (compressedDuration) videoDurationCache.set(compressedPath, compressedDuration);
          } catch (e) {
            console.warn(`无法获取压缩视频时长: ${compressedPath}`, e);
            return;
          }
        }

        // 压缩后的视频是基于 -ss/-t 裁剪的，时间轴从 0 开始
        let mappedStart = 0;
        const rangeLen = Math.max(0.1, originalEnd - originalStart);
        let mappedEnd = rangeLen;
        if (compressedDuration && compressedDuration > 0) {
          mappedEnd = Math.min(rangeLen, compressedDuration);
        }

        try {
          const compressedFrame = await invoke<string>('generate_single_frame_with_time_range', {
             videoPath: compressedPath,
             frameIndex: index,
             timeRangeStart: mappedStart,
             timeRangeEnd: mappedEnd
           });

          if (compressedFrame) {
            if (afterImgRef.value) afterImgRef.value.src = compressedFrame;
            cache.compressed = compressedFrame;
            videoPreviewStore.setFrameCache(
              getCurrentTaskId(),
              index,
              cache,
              props.timeRange,
              props.videoPath,
              props.compressedVideoFilePath
            );
            videoPreviewStore.setFullscreenImages(fullscreenBeforeSrc.value, compressedFrame);
          }
        } catch (error) {
          console.error(`生成压缩帧 ${index} 失败:`, error);
        }
      })();
      promises.push(compressedPromise);
    }

    // 等待所有帧生成完成
    await Promise.all(promises);
  } catch (error) {
    console.error(`生成帧 ${index} 失败:`, error);
  } finally {
    loadingFrames.value.delete(index);
  }
};

// 组件挂载时的初始化逻辑
onMounted(() => {
  console.log('VideoPreview mounted:', { videoPath: props.videoPath, beforeImage: !!props.beforeImage, afterImage: !!props.afterImage });
  
  // 初次挂载时，如有视频路径则选中第1帧
  if (props.videoPath) {
    console.log('Video mode: calling selectFrame(0)');
    selectFrame(0);
  } else {
    console.log('Image mode: setting images directly');
    // 图片模式：直接显示传入的图片
    if (props.beforeImage && beforeImgRef.value) {
      beforeImgRef.value.src = props.beforeImage;
      videoPreviewStore.setFullscreenImages(props.beforeImage, fullscreenAfterSrc.value);
    }
    if (props.afterImage) {
      if (afterImgRef.value) {
        afterImgRef.value.src = props.afterImage;
        videoPreviewStore.setFullscreenImages(fullscreenBeforeSrc.value, props.afterImage);
      } else {
        // 由于 after 区域使用 v-if 渲染，首次出现时 ref 可能尚未就绪，延迟到 nextTick 设置
        nextTick(() => {
          if (afterImgRef.value) {
            afterImgRef.value.src = props.afterImage as string;
          } else {
            console.warn('[VideoPreview] afterImgRef not available on nextTick during mount');
          }
          videoPreviewStore.setFullscreenImages(fullscreenBeforeSrc.value, props.afterImage as string);
        });
      }
    }
  }
  // 监听浏览器全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

// 根据全屏状态动态绑定/解绑全局事件，避免非全屏阶段阻断点击
watch(isFullscreen, (val) => {
  const onMove = handleFullscreenMouseMove as EventListener;
  const onUp = stopFullscreenDragging as EventListener;
  const onKey = handleKeydown as EventListener;
  if (val) {
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
  } else {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('keydown', onKey);
    videoPreviewStore.setFullscreenDragging(false);
  }
});

// 监听beforeImage和afterImage变化（图片模式）
watch(() => [props.beforeImage, props.afterImage], ([newBefore, newAfter]) => {
  console.log('[VideoPreview] Image props changed:', {
    videoPath: props.videoPath,
    beforeImage: newBefore,
    afterImage: newAfter,
    isImageMode: !props.videoPath
  });
  
  if (!props.videoPath) {
    // 图片模式：直接更新图片显示
    console.log('[VideoPreview] Image mode: updating images');
    if (newBefore && beforeImgRef.value) {
      console.log('[VideoPreview] Setting before image:', newBefore);
      beforeImgRef.value.src = newBefore;
      videoPreviewStore.setFullscreenImages(newBefore, fullscreenAfterSrc.value);
    }
    if (newAfter) {
      if (afterImgRef.value) {
        console.log('[VideoPreview] Setting after image:', newAfter);
        afterImgRef.value.src = newAfter;
        videoPreviewStore.setFullscreenImages(fullscreenBeforeSrc.value, newAfter);
      } else {
        console.log('[VideoPreview] afterImgRef not ready, scheduling on nextTick');
        nextTick(() => {
          if (afterImgRef.value) {
            console.log('[VideoPreview] Setting after image (nextTick):', newAfter);
            afterImgRef.value.src = newAfter;
          } else {
            console.warn('[VideoPreview] afterImgRef still not available after nextTick');
          }
          videoPreviewStore.setFullscreenImages(fullscreenBeforeSrc.value, newAfter);
        });
      }
    } else {
      console.log('[VideoPreview] No after image provided');
    }
  }
});

// 监听videoPath变化：被选中任务变化或导入新任务时，自动加载第1帧（索引0）
watch(() => props.videoPath, (newPath, oldPath) => {
  if (!newPath) {
    resetFrameData();
    // 图片模式：显示传入的图片
    if (props.beforeImage && beforeImgRef.value) {
      beforeImgRef.value.src = props.beforeImage;
      videoPreviewStore.setFullscreenImages(props.beforeImage, fullscreenAfterSrc.value);
    }
    if (props.afterImage && afterImgRef.value) {
      afterImgRef.value.src = props.afterImage;
      videoPreviewStore.setFullscreenImages(fullscreenBeforeSrc.value, props.afterImage);
    }
  } else {
    // 当视频源发生变化时，清除该路径对应的时长缓存，避免复用上一个任务的时长
    try {
      const videoDurationCache = getVideoDurationCache();
      if (oldPath) videoDurationCache.delete(oldPath);
      if (newPath) videoDurationCache.delete(newPath);
    } catch {}
    // 清理缓存并自动选择第一帧
    videoPreviewStore.resetFrameData(
      getCurrentTaskId(),
      props.timeRange,
      newPath,
      props.compressedVideoFilePath
    );
    videoPreviewStore.setSelectedFrameIndex(0);
    // 延迟执行首帧选择，优先让UI可交互
    if (props.deferInitialPreview) {
      if (initialPreviewIdleId) {
        // 取消之前的空闲任务
        const w = window as any;
        if (typeof w.cancelIdleCallback === 'function') {
          w.cancelIdleCallback(initialPreviewIdleId);
        } else {
          clearTimeout(initialPreviewIdleId);
        }
        initialPreviewIdleId = null;
      }
      initialPreviewIdleId = requestIdle(() => {
        nextTick(() => selectFrame(0)); // 使用防抖
      }, 800) as unknown as number;
    } else {
      nextTick(() => {
        selectFrame(0); // 使用防抖机制
      });
    }
  }
}); // 移除 immediate: true

// 监听compressedVideoFilePath变化：压缩完成或路径变化时，刷新当前选中帧（若未选中则取第1帧）
watch(() => props.compressedVideoFilePath, (newPath, oldPath) => {
  // 若无视频路径（图片任务），则不进行任何帧操作
  if (!props.videoPath) return;
  // 每次压缩视频文件路径变化时，清除对应路径（以及旧路径）的时长缓存，
  // 防止由于同名覆盖（如 *_compressed.mp4）导致读取到上一次的缓存时长（例如1分钟）。
  try {
    const videoDurationCache = getVideoDurationCache();
    if (oldPath) videoDurationCache.delete(oldPath);
    if (newPath) videoDurationCache.delete(newPath);
  } catch {}
  // 完全清理帧缓存，确保重新生成所有帧
  getFrameCache().clear();
  loadingFrames.value.clear();
  const index = selectedFrameIndex.value ?? 0;
  // 使用 nextTick 延迟执行，避免阻塞主线程，使用防抖
   nextTick(() => {
     selectFrame(index); // 使用防抖机制
   });
});

// 监听任务状态变化：当进入处理或完成态时，清理缓存，避免同一路径覆盖导致的旧时长被复用
watch(() => props.taskStatus, (newStatus) => {
  if (newStatus === 'processing' || newStatus === 'completed') {
    try {
      if (props.compressedVideoFilePath) {
        getVideoDurationCache().delete(props.compressedVideoFilePath);
      }
    } catch {}
    getFrameCache().clear();
    loadingFrames.value.clear();
    const index = selectedFrameIndex.value ?? 0;
    if (props.videoPath) {
      // 使用 nextTick 延迟执行，避免阻塞主线程，使用防抖
       nextTick(() => {
         selectFrame(index); // 使用防抖机制
       });
    }
  }
});

// 如果自定义时间范围变化，也刷新当前帧
watch(() => props.timeRange, () => {
  if (props.videoPath) {
    const index = selectedFrameIndex.value ?? 0;
    // 不清空所有缓存，只清除当前帧以便重算
    getFrameCache().delete(index);
    selectFrame(index);
  }
});

// 组件卸载时移除所有事件监听
onUnmounted(() => {
  // 清理动态绑定的全局事件
  document.removeEventListener('keydown', handleKeydown as EventListener);
  document.removeEventListener('mousemove', handleFullscreenMouseMove as EventListener);
  document.removeEventListener('mouseup', stopFullscreenDragging as EventListener);
  // 监听器解绑
  document.removeEventListener('fullscreenchange', handleFullscreenChange as EventListener);
  // 清理防抖定时器
  if (selectFrameDebounceTimer) {
    clearTimeout(selectFrameDebounceTimer);
    selectFrameDebounceTimer = null;
  }
  // 取消空闲回调
  if (initialPreviewIdleId) {
    const w = window as any;
    if (typeof w.cancelIdleCallback === 'function') {
      w.cancelIdleCallback(initialPreviewIdleId);
    } else {
      clearTimeout(initialPreviewIdleId);
    }
    initialPreviewIdleId = null;
  }
});

// 暴露selectFrame方法供父组件调用
defineExpose({
  selectFrame,
  resetFrameData,
  clearFrameCache,
  clearTaskCache
});
</script>
<style scoped>
/* 模态框动画 */
.modal-enter-active {
  transition: all 0.3s ease-out;
}

.modal-leave-active {
  transition: all 0.2s ease-in;
}

.modal-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.modal-enter-active .modal-content {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-content {
  transition: all 0.2s ease-in;
}

.modal-enter-from .modal-content {
  transform: scale(0.8) translateY(-20px);
  opacity: 0;
}

.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(10px);
  opacity: 0;
}

/* 全屏模态框样式 */
.fixed.inset-0 {
  backdrop-filter: blur(12px);
}

/* 按钮样式 */
.comparison-slider button {
  backdrop-filter: blur(4px);
}

/* 全屏预览样式 */
.comparison-slider img {
  max-width: 100%;
  max-height: 100%;
}

/* 非全屏模式下的滑块样式 */
.comparison-slider .slider {
  position: absolute;
  top: 0;
  left: var(--position);
  transform: translateX(-50%);
  width: 4px;
  height: 100%;
  background: white;
  cursor: ew-resize;
  z-index: 15;
  border-radius: 2px;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.comparison-slider .slider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 0 3px rgba(255,255,255,0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1.5px solid rgba(255,255,255,0.25);
}

.comparison-slider .slider:hover .slider-handle {
  transform: translate(-50%, -50%) scale(1.15);
  box-shadow: 0 10px 30px rgba(0,0,0,0.35), 0 0 0 5px rgba(255,255,255,0.25);
}

.comparison-slider .slider-handle svg {
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.25));
}

/* 全屏模式下的滑块样式 */
.fullscreen-slider .fullscreen-slider-line {
  position: absolute;
  top: 0;
  left: var(--position);
  transform: translateX(-50%);
  width: 6px;
  height: 100%;
  background: white;
  cursor: ew-resize;
  z-index: 15;
  border-radius: 3px;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.fullscreen-slider .fullscreen-slider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 25px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid rgba(255,255,255,0.3);
}

.fullscreen-slider .fullscreen-slider-line:hover .fullscreen-slider-handle {
  transform: translate(-50%, -50%) scale(1.15);
  box-shadow: 0 12px 35px rgba(0,0,0,0.4), 0 0 0 6px rgba(255,255,255,0.3);
}

.fullscreen-slider .fullscreen-slider-handle svg {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

/* 全屏模式下的图片样式 */
.fullscreen-slider .after-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.fullscreen-slider .after-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  clip-path: polygon(var(--position) 0, 100% 0, 100% 100%, var(--position) 100%);
}
</style>
