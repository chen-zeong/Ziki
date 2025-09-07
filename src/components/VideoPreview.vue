<template>
  <div class="w-full h-full flex flex-col">


    
    <div 
      ref="sliderRef"
      class="comparison-slider w-full h-full bg-gray-200 dark:bg-[#1e1e1e] relative overflow-hidden"
      :style="{ '--position': `${sliderPosition}%` }"
    >
      <!-- 压缩前（左侧） -->
       <img 
         :src="localBeforeImage || beforeImage" 
         alt="压缩前" 
         class="before-image w-full h-full object-cover"
       >
       
       <!-- 压缩后（右侧） -->
       <div class="after-image">
         <img 
           :src="localAfterImage || afterImage" 
           alt="压缩后" 
           class="w-full h-full object-cover"
         >
       </div>
       
       <!-- 文字标签 - 只在任务完成时显示 -->
       <div v-if="props.taskStatus === 'completed'" class="absolute top-4 left-4 backdrop-blur-md bg-white/20 text-white px-2 py-1 rounded text-sm z-20 ">
         压缩前
       </div>
       <div v-if="props.taskStatus === 'completed'" class="absolute top-4 right-4 backdrop-blur-md bg-white/20 text-white px-2 py-1 rounded text-sm z-20">
         压缩后
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
       
      <!-- 滑块 - 只在任务完成时显示 -->
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
    
    <!-- 全屏模态框 -->
    <Transition name="modal" appear>
      <div 
        v-if="isFullscreen" 
        class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        style="background-color: #f5f5f5;"
        @click="closeFullscreen"
      >
        <!-- 模态框内容容器 -->
        <div 
          class="modal-content relative w-full max-w-7xl h-full max-h-[95vh] overflow-hidden"
          @click.stop
        >
          <!-- 关闭按钮 -->
          <button 
            @click="closeFullscreen" 
            class="absolute top-2 right-2 z-50 w-8 h-8 rounded-full bg-white flex items-center justify-center transition-all duration-300 hover:scale-110"
            style="box-shadow: 0 0 0 2px rgba(160,160,160,0.2); background-color: #ffffff; background-image: none; border: none; outline: none;"
            title="关闭全屏 (ESC)"
          >
            <svg class="w-4 h-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div class="relative w-full h-full p-3 flex items-center justify-center">
            <!-- 全屏预览内容 -->
            <div 
              ref="fullscreenSliderRef"
              class="comparison-slider fullscreen-slider w-full h-full bg-gray-200 dark:bg-gray-800 relative rounded-lg overflow-hidden"
              :style="{ '--position': `${sliderPosition}%` }"
              @click.stop
            >
              <!-- 压缩前（左侧） -->
              <img 
                :src="localBeforeImage || beforeImage" 
                alt="压缩前" 
                class="before-image w-full h-full object-contain"
              >
              
              <!-- 压缩后（右侧） -->
              <div class="after-image">
                <img 
                  :src="localAfterImage || afterImage" 
                  alt="压缩后" 
                  class="w-full h-full object-contain"
                >
              </div>
              
              <!-- 全屏模式下的文字标签 - 只在任务完成时显示 -->
              <div v-if="props.taskStatus === 'completed'" class="absolute top-4 left-4 backdrop-blur-md bg-white/20 text-white px-3 py-2 rounded text-base z-20">
                压缩前
              </div>
              <div v-if="props.taskStatus === 'completed'" class="absolute top-4 right-4 backdrop-blur-md bg-white/20 text-white px-3 py-2 rounded text-base z-20">
                压缩后
              </div>
              
              <!-- 全屏模式下的帧选择器 -->
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
              
              <!-- 全屏模式下的滑块 - 只在任务完成时显示 -->
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
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useComparison } from '../composables/useComparison';
import { invoke } from '@tauri-apps/api/core';


interface Props {
  title?: string;
  beforeImage: string;
  afterImage: string;
  videoPath?: string;
  compressedVideoPath?: string;
  compressedVideoFilePath?: string;
  taskStatus?: string;
  timeRange?: {
    start: number;
    end: number;
  };
}

const props = withDefaults(defineProps<Props>(), {
  title: '视频预览',
  taskStatus: 'pending'
});

const emit = defineEmits<{
  reset: [];
  updateImages: [{ beforeImage?: string; afterImage?: string }];
}>();

const { sliderPosition, sliderRef, startDragging } = useComparison();

// 帧画面相关数据
const selectedFrameIndex = ref<number | null>(null);
const frameCache = ref<Map<number, { original?: string; compressed?: string }>>(new Map());
const loadingFrames = ref<Set<number>>(new Set());

// 本地图片状态
const localBeforeImage = ref<string>('');
const localAfterImage = ref<string>('');

// 全屏状态
const isFullscreen = ref<boolean>(false);
const fullscreenSliderRef = ref<HTMLElement | null>(null);
const isDraggingFullscreen = ref(false);

// 全屏模式下的拖拽处理
const updateFullscreenSliderPosition = (event: MouseEvent) => {
  if (!fullscreenSliderRef.value || !isDraggingFullscreen.value) return;
  
  const rect = fullscreenSliderRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
  
  sliderPosition.value = percentage;
  fullscreenSliderRef.value.style.setProperty('--position', `${percentage}%`);
};

const startFullscreenDragging = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  isDraggingFullscreen.value = true;
  updateFullscreenSliderPosition(event);
};

const stopFullscreenDragging = () => {
  isDraggingFullscreen.value = false;
};

const handleFullscreenMouseMove = (event: MouseEvent) => {
  if (isDraggingFullscreen.value) {
    updateFullscreenSliderPosition(event);
  }
};

// 切换全屏显示
const toggleFullscreen = () => {
  console.log('toggleFullscreen clicked, current isFullscreen:', isFullscreen.value);
  isFullscreen.value = true;
  console.log('toggleFullscreen after, new isFullscreen:', isFullscreen.value);
};

// 关闭全屏
const closeFullscreen = () => {
  isFullscreen.value = false;
};

// 监听ESC键关闭全屏
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    closeFullscreen();
  }
};

// 视频时长缓存
const videoDurationCache = ref<Map<string, number>>(new Map());

// 获取视频时长（带缓存）
const getVideoDuration = async (videoPath: string): Promise<number> => {
  if (videoDurationCache.value.has(videoPath)) {
    console.log(`[Vue Debug] 视频时长从缓存获取: ${videoPath}`);
    return videoDurationCache.value.get(videoPath)!;
  }
  
  try {
    console.log(`[Vue Debug] 开始获取视频时长: ${videoPath}`);
    const durationCallStart = performance.now();
    const duration = await invoke('get_video_duration', { videoPath }) as number;
    console.log(`[Vue Debug] 获取视频时长完成: ${videoPath}，耗时: ${(performance.now() - durationCallStart).toFixed(2)}ms，时长: ${duration}s`);
    videoDurationCache.value.set(videoPath, duration);
    return duration;
  } catch (error) {
    console.error('获取视频时长失败:', error);
    throw error;
  }
};

// 选择帧并按需加载（通用：只要任务被选中即可获取原始帧，若有压缩视频则同时获取压缩帧）
const selectFrame = async (index: number) => {
  const requestId = Date.now(); // 生成请求ID
  console.log(`[Vue Debug] 开始选择帧 ${index}, 请求ID: ${requestId}`);
  const startTime = performance.now();
  selectedFrameIndex.value = index;

  // 没有原始视频路径时无法生成帧
  if (!props.videoPath) {
    console.log(`[Vue Debug] 无原始视频路径，跳过加载帧 ${index}`);
    return;
  }
  
  // 如果帧已经在缓存中，直接更新图片并返回
  if (frameCache.value.has(index)) {
    const cached = frameCache.value.get(index)!;
    console.log(`[Vue Debug] 帧 ${index} 从缓存加载, 耗时: ${(performance.now() - startTime).toFixed(2)}ms`);
    // 只有当前选择的帧才更新界面
    if (selectedFrameIndex.value === index) {
      // 更新本地图片状态
      if (cached.original) {
        localBeforeImage.value = cached.original;
      }
      if (cached.compressed) {
        localAfterImage.value = cached.compressed;
      } else if (cached.original) {
        localAfterImage.value = cached.original;
      }
      
      emit('updateImages', {
        beforeImage: cached.original,
        afterImage: cached.compressed || cached.original // 如果没有压缩帧，显示原始帧
      });
    }
    return;
  }
  
  // 如果正在加载，避免重复请求
  if (loadingFrames.value.has(index)) {
    console.log(`[Vue Debug] 帧 ${index} 正在加载中，跳过重复请求`);
    return;
  }
  
  // 标记为正在加载
  loadingFrames.value.add(index);
  console.log(`[Vue Debug] 开始异步加载帧 ${index}`);
  
  try {
    // 初始化缓存条目
    frameCache.value.set(index, { original: undefined, compressed: undefined });
    
    let originalFrame: string | undefined;
    let compressedFrame: string | undefined;
    
    // 并行加载原始帧和压缩帧以提高性能
    const loadPromises: Promise<void>[] = [];
    
    // 加载原始帧（始终根据原始视频生成）
    if (props.videoPath) {
      const loadOriginalFrame = async () => {
        try {
          const originalStartTime = performance.now();
          
          // 始终使用原始视频的时长来生成帧
          const durationStart = performance.now();
          const originalDuration = await getVideoDuration(props.videoPath!);
          console.log(`[Vue Debug] 获取原始视频时长，帧 ${index}，耗时: ${(performance.now() - durationStart).toFixed(2)}ms，时长: ${originalDuration}s`);

          console.log(`[Vue Debug] 开始调用Rust生成原始帧 ${index}，视频: ${props.videoPath}，使用原始时长: ${originalDuration}s`);
          const rustCallStart = performance.now();
          
          // 如果有自定义时间范围，使用带时间范围的帧生成
          if (props.timeRange) {
            originalFrame = await invoke('generate_single_frame_with_time_range', {
              videoPath: props.videoPath!,
              frameIndex: index,
              timeRangeStart: props.timeRange.start,
              timeRangeEnd: props.timeRange.end
            });
          } else {
            originalFrame = await invoke('generate_single_frame_with_duration', {
              videoPath: props.videoPath!,
              frameIndex: index,
              duration: originalDuration
            });
          }
          console.log(`[Vue Debug] Rust调用完成，原始帧 ${index}，耗时: ${(performance.now() - rustCallStart).toFixed(2)}ms`);
          console.log(`[Vue Debug] 原始帧 ${index} 生成完成, 总耗时: ${(performance.now() - originalStartTime).toFixed(2)}ms`);
          
          const cached = frameCache.value.get(index) || {};
          cached.original = originalFrame;
          frameCache.value.set(index, cached);
        } catch (error) {
          console.error(`加载原始帧 ${index} 失败:`, error);
        }
      };
      loadPromises.push(loadOriginalFrame());
    }
    
    // 加载压缩帧（仅当存在压缩视频路径时）
    if (props.compressedVideoFilePath) {
      const loadCompressedFrame = async () => {
        try {
          const compressedStartTime = performance.now();
          
          // 获取压缩视频的实际时长
          const durationStart = performance.now();
          const compressedDuration = await getVideoDuration(props.compressedVideoFilePath!);
          console.log(`[Vue Debug] 获取压缩视频时长，帧 ${index}，耗时: ${(performance.now() - durationStart).toFixed(2)}ms，时长: ${compressedDuration}s`);
          
          // 使用压缩视频的实际时长来生成帧
          console.log(`[Vue Debug] 开始调用Rust生成压缩帧 ${index}，视频: ${props.compressedVideoFilePath}，使用压缩后时长: ${compressedDuration}s`);
          const rustCallStart = performance.now();
          
          compressedFrame = await invoke('generate_single_frame_with_duration', {
            videoPath: props.compressedVideoFilePath!,
            frameIndex: index,
            duration: compressedDuration
          });
          
          console.log(`[Vue Debug] Rust调用完成，压缩帧 ${index}，耗时: ${(performance.now() - rustCallStart).toFixed(2)}ms`);
          console.log(`[Vue Debug] 压缩帧 ${index} 生成完成, 总耗时: ${(performance.now() - compressedStartTime).toFixed(2)}ms`);
          
          const cached = frameCache.value.get(index) || {};
          cached.compressed = compressedFrame;
          frameCache.value.set(index, cached);
        } catch (error) {
          console.error(`加载压缩帧 ${index} 失败:`, error);
        }
      };
      loadPromises.push(loadCompressedFrame());
    }
    
    // 等待所有帧加载完成
    const parallelStart = performance.now();
    await Promise.all(loadPromises);
    console.log(`[Vue Debug] 并行加载完成，帧 ${index}，耗时: ${(performance.now() - parallelStart).toFixed(2)}ms`);
    
    // 重新获取缓存中的帧数据（因为可能在并行加载过程中被更新）
    const finalCached = frameCache.value.get(index);
    if (finalCached) {
      originalFrame = finalCached.original;
      compressedFrame = finalCached.compressed;
    }
    
    // 只有当前选择的帧才更新界面
    if (selectedFrameIndex.value === index) {
      console.log(`[Vue Debug] 更新界面显示帧 ${index}, 总耗时: ${(performance.now() - startTime).toFixed(2)}ms`);
      // 更新主预览区域的图片 - beforeImage是压缩前，afterImage是压缩后
      const updateData = {
        beforeImage: originalFrame, // 压缩前
        afterImage: compressedFrame || originalFrame // 压缩后，如果没有压缩帧则显示原始帧
      };
      
      // 直接更新本地的图片状态 - 压缩前在左边，压缩后在右边
      const uiUpdateStart = performance.now();
      if (originalFrame) {
        localBeforeImage.value = originalFrame; // 左侧显示压缩前
      }
      if (compressedFrame) {
        localAfterImage.value = compressedFrame; // 右侧显示压缩后
      } else if (originalFrame) {
        localAfterImage.value = originalFrame; // 如果没有压缩帧，右侧也显示原始帧
      }
      
      emit('updateImages', updateData);
      console.log(`[Vue Debug] UI更新完成，帧 ${index}，耗时: ${(performance.now() - uiUpdateStart).toFixed(2)}ms`);
    } else {
      console.log(`[Vue Debug] 帧 ${index} 加载完成但不是当前选择的帧 (当前: ${selectedFrameIndex.value})`);
    }
  } finally {
    // 移除加载标记
    loadingFrames.value.delete(index);
  }
};

// 清理缓存和重置状态
const resetFrameData = () => {
  frameCache.value.clear();
  loadingFrames.value.clear();
  videoDurationCache.value.clear();
  selectedFrameIndex.value = null;
  localBeforeImage.value = '';
  localAfterImage.value = '';
};



// 监听videoPath变化：被选中任务变化或导入新任务时，自动加载第1帧（索引0）
watch(() => props.videoPath, (newPath, oldPath) => {
  if (!newPath) {
    resetFrameData();
  } else {
    // 当视频源发生变化时，清除该路径对应的时长缓存，避免复用上一个任务的时长
    try {
      if (oldPath) videoDurationCache.value.delete(oldPath);
      if (newPath) videoDurationCache.value.delete(newPath);
    } catch {}
    // 清理缓存并自动选择第一帧
    frameCache.value.clear();
    loadingFrames.value.clear();
    selectedFrameIndex.value = 0;
    selectFrame(0);
  }
}, { immediate: true });

// 监听compressedVideoFilePath变化：压缩完成或路径变化时，刷新当前选中帧（若未选中则取第1帧）
watch(() => props.compressedVideoFilePath, (newPath, oldPath) => {
  // 每次压缩视频文件路径变化时，清除对应路径（以及旧路径）的时长缓存，
  // 防止由于同名覆盖（如 *_compressed.mp4）导致读取到上一次的缓存时长（例如1分钟）。
  try {
    if (oldPath) videoDurationCache.value.delete(oldPath);
    if (newPath) videoDurationCache.value.delete(newPath);
  } catch {}
  // 完全清理帧缓存，确保重新生成所有帧
  frameCache.value.clear();
  loadingFrames.value.clear();
  const index = selectedFrameIndex.value ?? 0;
  selectFrame(index);
}, { immediate: true });

// 监听任务状态变化：当进入处理或完成态时，清理缓存，避免同一路径覆盖导致的旧时长被复用
watch(() => props.taskStatus, (newStatus) => {
  if (newStatus === 'processing' || newStatus === 'completed') {
    try {
      if (props.compressedVideoFilePath) {
        videoDurationCache.value.delete(props.compressedVideoFilePath);
      }
    } catch {}
    frameCache.value.clear();
    loadingFrames.value.clear();
    const index = selectedFrameIndex.value ?? 0;
    if (props.videoPath) selectFrame(index);
  }
});

// 如果自定义时间范围变化，也刷新当前帧
watch(() => props.timeRange, () => {
  if (props.videoPath) {
    const index = selectedFrameIndex.value ?? 0;
    // 不清空所有缓存，只清除当前帧以便重算
    frameCache.value.delete(index);
    selectFrame(index);
  }
});

// 组件挂载时添加键盘监听和全屏鼠标事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousemove', handleFullscreenMouseMove);
  document.addEventListener('mouseup', stopFullscreenDragging);
  // 初次挂载时，如有视频路径则选中第1帧
  if (props.videoPath) {
    selectFrame(0);
  }
});

// 组件卸载时移除所有事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousemove', handleFullscreenMouseMove);
  document.removeEventListener('mouseup', stopFullscreenDragging);
});

// 暴露selectFrame方法供父组件调用
defineExpose({
  selectFrame,
  resetFrameData
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