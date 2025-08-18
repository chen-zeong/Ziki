<template>
  <div class="border border-gray-200 dark:border-gray-800 rounded-xl p-4" :style="{ backgroundColor: isDark ? '#2b2b2b' : 'white' }">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="font-bold text-xl text-gray-800 dark:text-gray-100 tracking-wide">{{ $t('taskList.title') }}</h3>
      
      <!-- 状态筛选器 -->
      <div class="flex items-center space-x-2">
        <button
          v-for="status in statusFilters"
          :key="status.key"
          @click="toggleStatusFilter(status.key)"
          :class="[
            'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110',
            selectedStatuses.size === 0 || selectedStatuses.has(status.key)
              ? `${status.bgColor} ${status.borderColor} ${status.textColor}`
              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
          ]"
          :title="status.label"
        >
          <span class="text-xs font-bold">{{ getStatusCount(status.key) }}</span>
        </button>
      </div>
    </div>
    
    <ul class="space-y-4">
      <li 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors overflow-hidden"
      >
        <!-- 主要任务信息 -->
        <div class="flex items-center p-2">
          <img 
            :src="task.file.thumbnailUrl || task.file.originalUrl || getPlaceholderImage(task.file.name)" 
            :alt="task.file.name"
            class="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-gray-200 dark:bg-gray-700"
            loading="lazy"
          >
          <div class="flex-grow ml-4">
            <p class="text-gray-800 dark:text-gray-100 font-medium truncate" :title="task.file.name">
              {{ task.file.name }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatFileSize(task.file.size || task.originalSize) }} 
              <span v-if="task.compressedSize">→ {{ formatFileSize(task.compressedSize) }}</span>
            </p>
            
            <!-- 状态和进度集成显示 -->
            <div class="mt-1">
              <!-- 压缩完成状态 -->
              <div v-if="task.status === 'completed' && task.compressedSize" 
                   class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ getCompressionRatio(task) }} {{ getCompressionText(task) }}
              </div>
              
              <!-- 压缩中状态 -->
              <div v-else-if="task.status === 'processing'" class="space-y-1">
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    class="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                    :style="{ width: `${task.progress}%` }"
                  ></div>
                </div>
                <p class="text-xs text-amber-600 dark:text-amber-400">压缩中 {{ task.progress }}%</p>
              </div>
              
              <!-- 压缩失败状态 -->
              <div v-else-if="task.status === 'failed'" 
                   class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                   :title="task.error || '压缩失败'">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                </svg>
                失败{{ task.error ? ': ' + (task.error.length > 20 ? task.error.substring(0, 20) + '...' : task.error) : '' }}
              </div>
              
              <!-- 等待中状态 -->
              <div v-else-if="task.status === 'pending'" 
                   class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                等待中
              </div>
              
              <!-- 排队中状态 -->
              <div v-else-if="task.status === 'queued'" 
                   class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                排队中
              </div>
            </div>
          </div>
          <div class="ml-4 flex-shrink-0 flex items-center space-x-2">
            <!-- 详细信息按钮 -->
            <button 
              @click="toggleDetails(task.id)"
              class="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              :title="$t('taskList.details')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-200" :class="{ 'rotate-180': expandedTasks.has(task.id) }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <!-- 打开文件夹按钮 -->
            <button 
              v-if="task.status === 'completed' && task.outputDirectory"
              @click="openOutputFolder(task.outputDirectory)"
              class="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              :title="$t('taskList.openOutputFolder')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            
            <!-- 删除按钮 -->
            <button 
              @click="deleteTask(task.id)"
              class="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              :title="$t('taskList.deleteTask')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            <!-- Status Icons -->
            <div v-if="task.status === 'completed'" class="h-6 w-6 text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div v-else-if="task.status === 'processing'" class="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            <div v-else-if="task.status === 'failed'" class="h-6 w-6 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
              </svg>
            </div>
            <div v-else class="h-6 w-6 text-gray-400 dark:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 详细信息展开区域 -->
        <Transition
          enter-active-class="transition-all duration-500 ease-out"
          enter-from-class="max-h-0 opacity-0 transform scale-y-95"
          enter-to-class="max-h-[1000px] opacity-100 transform scale-y-100"
          leave-active-class="transition-all duration-300 ease-in"
          leave-from-class="max-h-[1000px] opacity-100 transform scale-y-100"
          leave-to-class="max-h-0 opacity-0 transform scale-y-95"
        >
          <div v-if="expandedTasks.has(task.id)" class="overflow-hidden">
            <div class="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
              
              <!-- 压缩前后对比 (仅完成的任务) -->
               <div v-if="task.status === 'completed' && task.file.metadata" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                 <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                   <h3 class="font-bold text-gray-500 dark:text-gray-400 text-sm">
                     {{ $t('taskList.compressionComparison') }}
                   </h3>
                 </div>
                 <div class="p-4">
                   <div class="grid grid-cols-3 gap-4 text-sm">
                     <!-- 参数名称列 -->
                     <div class="space-y-2">
                       <div class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.fileSize') }}</span>
                       </div>
                       <div class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.format') }}</span>
                       </div>
                       <div class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.videoCodec') }}</span>
                       </div>
                       <div class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.audioCodec') }}</span>
                        </div>
                        <div class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.audioSampleRate') }}</span>
                        </div>
                        <div class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.resolution') }}</span>
                        </div>
                        <div v-if="task.file.metadata.bitrate !== 'unknown' || getActualBitrate(task)" class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.bitrate') }}</span>
                        </div>
                       <div v-if="task.file.metadata.duration" class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.duration') }}</span>
                       </div>
                       <div v-if="task.file.metadata.fps" class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.frameRate') }}</span>
                       </div>
                     </div>
                     
                     <!-- 压缩前数值列 -->
                     <div class="space-y-2 text-right">
                       <div class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatFileSize(task.file.size || task.originalSize) }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.format.toUpperCase() }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.videoCodec }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.audioCodec || $t('common.unknown') }}</span>
                        </div>
                        <div class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.sampleRate || $t('common.unknown') }}</span>
                        </div>
                        <div class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.resolution }}</span>
                        </div>
                        <div v-if="task.file.metadata.bitrate !== 'unknown' || getActualBitrate(task)" class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.bitrate || $t('common.unknown') }}</span>
                        </div>
                       <div v-if="task.file.metadata.duration" class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatDuration(task.file.metadata.duration) }}</span>
                       </div>
                       <div v-if="task.file.metadata.fps" class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ Number(task.file.metadata.fps).toFixed(2) }} fps</span>
                       </div>
                     </div>
                     
                     <!-- 压缩后数值列 -->
                     <div class="space-y-2 text-right">
                       <div class="h-8 flex items-center justify-end">
                         <span :class="getComparisonClass((task.compressedSize || 0), (task.file.size || task.originalSize))" class="px-2 py-1 rounded">{{ formatFileSize(task.compressedSize || 0) }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                         <span :class="getValueComparisonClass(task.file.metadata.format.toUpperCase(), task.settings.format.toUpperCase())" class="px-2 py-1 rounded">{{ task.settings.format.toUpperCase() }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                         <span :class="getValueComparisonClass(task.file.metadata.videoCodec, task.settings.videoCodec)" class="px-2 py-1 rounded">{{ task.settings.videoCodec }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                          <span :class="getValueComparisonClass(task.file.metadata.audioCodec || $t('common.unknown'), task.settings.audioCodec)" class="px-2 py-1 rounded">{{ task.settings.audioCodec }}</span>
                        </div>
                        <div class="h-8 flex items-center justify-end">
                          <span :class="getValueComparisonClass(task.file.metadata.sampleRate || $t('common.unknown'), task.settings.sampleRate === 'original' ? (task.file.metadata.sampleRate || $t('videoSettings.original')) : task.settings.sampleRate + ' Hz')" class="px-2 py-1 rounded">{{ task.settings.sampleRate === 'original' ? (task.file.metadata.sampleRate || $t('videoSettings.original')) : task.settings.sampleRate + ' Hz' }}</span>
                        </div>
                        <div class="h-8 flex items-center justify-end">
                          <span :class="getValueComparisonClass(task.file.metadata.resolution, getActualResolution(task))" class="px-2 py-1 rounded">{{ getActualResolution(task) }}</span>
                        </div>
                        <div v-if="task.file.metadata.bitrate !== 'unknown' || getActualBitrate(task)" class="h-8 flex items-center justify-end">
                          <span :class="getValueComparisonClass(task.file.metadata.bitrate || $t('common.unknown'), getActualBitrate(task) || $t('common.unknown'))" class="px-2 py-1 rounded">{{ getActualBitrate(task) || $t('common.unknown') }}</span>
                        </div>
                       <div v-if="task.file.metadata.duration" class="h-8 flex items-center justify-end">
                         <span :class="getValueComparisonClass(formatDuration(task.file.metadata.duration), formatDuration(getActualDuration(task) || 0))" class="px-2 py-1 rounded">{{ formatDuration(getActualDuration(task) || 0) }}</span>
                       </div>
                       <div v-if="task.file.metadata.fps" class="h-8 flex items-center justify-end">
                         <span :class="getValueComparisonClass(Number(task.file.metadata.fps).toFixed(2) + ' fps', Number(task.file.metadata.fps).toFixed(2) + ' fps')" class="px-2 py-1 rounded">{{ Number(task.file.metadata.fps).toFixed(2) }} fps</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
               
               <!-- 文件信息 (未完成的任务) -->
               <div v-else-if="task.file.metadata" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                 <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                   <h3 class="font-bold text-gray-500 dark:text-gray-400 text-sm">
                     {{ $t('taskList.fileInfo') }}
                   </h3>
                 </div>
                 <div class="p-4">
                   <div class="grid grid-cols-2 gap-4 text-sm">
                     <!-- 参数名称列 -->
                     <div class="space-y-2">
                       <div class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.fileSize') }}</span>
                       </div>
                       <div class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.format') }}</span>
                       </div>
                       <div class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.videoCodec') }}</span>
                       </div>
                       <div class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.audioCodec') }}</span>
                        </div>
                        <div class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.audioSampleRate') }}</span>
                        </div>
                        <div class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.resolution') }}</span>
                        </div>
                        <div v-if="task.file.metadata.bitrate !== 'unknown'" class="h-8 flex items-center">
                          <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('videoSettings.bitrate') }}</span>
                        </div>
                       <div v-if="task.file.metadata.duration" class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.duration') }}</span>
                       </div>
                       <div v-if="task.file.metadata.fps" class="h-8 flex items-center">
                         <span class="font-bold text-gray-500 dark:text-gray-400">{{ $t('taskList.frameRate') }}</span>
                       </div>
                     </div>
                     
                     <!-- 参数数值列 -->
                     <div class="space-y-2 text-right">
                       <div class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatFileSize(task.file.size || task.originalSize) }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.format.toUpperCase() }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.videoCodec }}</span>
                       </div>
                       <div class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.audioCodec || $t('common.unknown') }}</span>
                        </div>
                        <div class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.sampleRate || $t('common.unknown') }}</span>
                        </div>
                        <div class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.resolution }}</span>
                        </div>
                        <div v-if="task.file.metadata.bitrate !== 'unknown'" class="h-8 flex items-center justify-end">
                          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ task.file.metadata.bitrate }}</span>
                        </div>
                       <div v-if="task.file.metadata.duration" class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ formatDuration(task.file.metadata.duration) }}</span>
                       </div>
                       <div v-if="task.file.metadata.fps" class="h-8 flex items-center justify-end">
                         <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{{ Number(task.file.metadata.fps).toFixed(2) }} fps</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </Transition>
      </li>
      
      <!-- Empty state -->
      <li v-if="filteredTasks.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto h-12 w-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026C6.154 9.75 8.25 11.846 8.25 14.25c0 2.404-2.096 4.5-4.156 4.5-.117 0-.232-.009-.344-.026m4.156-8.474a8.25 8.25 0 018.25 8.25c0 1.194-.25 2.33-.705 3.358-.07.16-.155.313-.249.456l-.077.105c-.616.85-1.539 1.406-2.594 1.406-1.98 0-3.594-1.64-3.594-3.75 0-.859.285-1.65.762-2.286C3.008 15.337 1.5 13.15 1.5 10.5c0-4.556 3.694-8.25 8.25-8.25z" />
        </svg>
        <p v-if="tasks.length === 0">{{ $t('taskList.noTasks') }}</p>
        <p v-else>{{ $t('taskList.noFilteredTasks') }}</p>
        <p v-if="tasks.length === 0" class="text-sm mt-1">{{ $t('taskList.uploadHint') }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';
import type { CompressionTask } from '../types';

interface Props {
  tasks: CompressionTask[];
}

const props = defineProps<Props>();
const { t } = useI18n();
const { isDark } = useTheme();

// 展开状态管理
const expandedTasks = ref(new Set<string>());

// 状态筛选管理
const selectedStatuses = ref(new Set<string>());

// 状态筛选器配置
const statusFilters = computed(() => [
  {
    key: 'pending',
    label: t('taskList.statusPending'),
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    borderColor: 'border-gray-400 dark:border-gray-500',
    textColor: 'text-gray-700 dark:text-gray-300'
  },
  {
    key: 'queued',
    label: t('taskList.statusQueued'),
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-400 dark:border-blue-500',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    key: 'processing',
    label: t('taskList.statusProcessing'),
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-400 dark:border-amber-500',
    textColor: 'text-amber-700 dark:text-amber-300'
  },
  {
    key: 'completed',
    label: t('taskList.statusCompleted'),
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-400 dark:border-green-500',
    textColor: 'text-green-700 dark:text-green-300'
  },
  {
    key: 'failed',
    label: t('taskList.statusFailed'),
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-400 dark:border-red-500',
    textColor: 'text-red-700 dark:text-red-300'
  }
]);

// 筛选后的任务列表
const filteredTasks = computed(() => {
  if (selectedStatuses.value.size === 0) {
    return props.tasks;
  }
  return props.tasks.filter(task => selectedStatuses.value.has(task.status));
});

// 获取指定状态的任务数量
const getStatusCount = (status: string): number => {
  return props.tasks.filter(task => task.status === status).length;
};

// 切换状态筛选
const toggleStatusFilter = (status: string) => {
  if (selectedStatuses.value.has(status)) {
    selectedStatuses.value.delete(status);
  } else {
    selectedStatuses.value.add(status);
  }
  // 触发响应式更新
  selectedStatuses.value = new Set(selectedStatuses.value);
};

// 切换详细信息展开状态
const toggleDetails = (taskId: string) => {
  if (expandedTasks.value.has(taskId)) {
    expandedTasks.value.delete(taskId);
  } else {
    expandedTasks.value.add(taskId);
  }
  // 触发响应式更新
  expandedTasks.value = new Set(expandedTasks.value);
};

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCompressionRatio = (task: CompressionTask): string => {
  const originalSize = task.file.size || task.originalSize;
  if (!task.compressedSize || !originalSize || isNaN(task.compressedSize) || isNaN(originalSize)) return '0%';
  const ratio = ((originalSize - task.compressedSize) / originalSize) * 100;
  return Math.round(Math.abs(ratio)) + '%';
};

const getCompressionRatioClass = (task: CompressionTask): string => {
  const originalSize = task.file.size || task.originalSize;
  if (!task.compressedSize || !originalSize || isNaN(task.compressedSize) || isNaN(originalSize)) return 'text-gray-500 dark:text-gray-400';
  const ratio = ((originalSize - task.compressedSize) / originalSize) * 100;
  return ratio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
};

const getCompressionText = (task: CompressionTask): string => {
  if (!task.compressedSize || !task.originalSize || isNaN(task.compressedSize) || isNaN(task.originalSize)) return '压缩';
  const ratio = ((task.originalSize - task.compressedSize) / task.originalSize) * 100;
  return ratio >= 0 ? '压缩' : '膨胀';
};

const getPlaceholderImage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext || '');
  const color = isVideo ? '0ea5e9' : 'ef4444';
  const text = isVideo ? 'Video' : 'Image';
  return `https://placehold.co/100x100/${color}/ffffff?text=${text}`;
};

const getTargetResolution = (task: CompressionTask): string => {
  if (task.settings.resolution === 'custom' && task.settings.customResolution) {
    return `${task.settings.customResolution.width}x${task.settings.customResolution.height}`;
  }
  return task.settings.resolution;
};

const openOutputFolder = async (outputDirectory: string) => {
  try {
    await invoke('open_output_folder', { folderPath: outputDirectory });
  } catch (error) {
    console.error('Failed to open output folder:', error);
    // 可以添加用户友好的错误提示
  }
};

// 获取压缩后的实际分辨率
const getActualResolution = (task: CompressionTask): string => {
  if (task.compressedMetadata?.resolution) {
    return task.compressedMetadata.resolution;
  }
  return getTargetResolution(task);
};

// 获取压缩后的实际码率
const getActualBitrate = (task: CompressionTask): string | null => {
  if (task.compressedMetadata?.bitrate && task.compressedMetadata.bitrate !== 'unknown') {
    return task.compressedMetadata.bitrate;
  }
  return null;
};

// 获取压缩后的实际时长
const getActualDuration = (task: CompressionTask): number | null => {
  if (task.compressedMetadata?.duration) {
    return task.compressedMetadata.duration;
  }
  return task.file.metadata?.duration || null;
};

// 格式化时长显示
const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

const getComparisonClass = (afterValue: number, beforeValue: number): string => {
  if (afterValue < beforeValue) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  } else if (afterValue > beforeValue) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
  } else {
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
  }
};

const getValueComparisonClass = (beforeValue: string, afterValue: string): string => {
  if (beforeValue === afterValue) {
    return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100';
  } else {
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
  }
};

// 删除任务
const emit = defineEmits<{
  deleteTask: [taskId: string]
}>();

const deleteTask = (taskId: string) => {
  emit('deleteTask', taskId);
};
</script>