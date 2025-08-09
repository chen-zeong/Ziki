<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

interface Codec {
  name: string;
  codec_type: string; // "encoder" or "decoder"
  media_type: string; // "video" or "audio"
  description: string;
  hardware_type?: string; // "Apple VideoToolbox" or null for software
}

const codecs = ref<Codec[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const showCodecs = ref(false);

// 过滤器状态
const filterType = ref<'all' | 'encoder' | 'decoder'>('all');
const filterMedia = ref<'all' | 'video' | 'audio'>('all');
const filterHardware = ref<'all' | 'hardware' | 'software'>('all');
const searchQuery = ref('');

// 计算过滤后的编解码器
const filteredCodecs = computed(() => {
  return codecs.value.filter(codec => {
    // 类型过滤
    if (filterType.value !== 'all' && codec.codec_type !== filterType.value) {
      return false;
    }
    
    // 媒体类型过滤
    if (filterMedia.value !== 'all' && codec.media_type !== filterMedia.value) {
      return false;
    }
    
    // 硬件加速过滤
    if (filterHardware.value === 'hardware' && !codec.hardware_type) {
      return false;
    }
    if (filterHardware.value === 'software' && codec.hardware_type) {
      return false;
    }
    
    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      return codec.name.toLowerCase().includes(query) || 
             codec.description.toLowerCase().includes(query);
    }
    
    return true;
  });
});

// 统计信息
const stats = computed(() => {
  const total = codecs.value.length;
  const encoders = codecs.value.filter(c => c.codec_type === 'encoder').length;
  const decoders = codecs.value.filter(c => c.codec_type === 'decoder').length;
  const videoCodecs = codecs.value.filter(c => c.media_type === 'video').length;
  const audioCodecs = codecs.value.filter(c => c.media_type === 'audio').length;
  const hardwareCodecs = codecs.value.filter(c => c.hardware_type).length;
  
  return {
    total,
    encoders,
    decoders,
    videoCodecs,
    audioCodecs,
    hardwareCodecs
  };
});

const detectCodecs = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const result = await invoke<Codec[]>('detect_all_codecs');
    codecs.value = result;
    showCodecs.value = true;
  } catch (err) {
    error.value = err as string;
    console.error('Failed to detect codecs:', err);
  } finally {
    isLoading.value = false;
  }
};

const resetFilters = () => {
  filterType.value = 'all';
  filterMedia.value = 'all';
  filterHardware.value = 'all';
  searchQuery.value = '';
};

const toggleCodecs = () => {
  if (showCodecs.value) {
    showCodecs.value = false;
  } else if (codecs.value.length > 0) {
    showCodecs.value = true;
  } else {
    detectCodecs();
  }
};

// 自动检测（可选）
// onMounted(() => {
//   detectCodecs();
// });
</script>

<template>
  <div class="codec-detector">
    <!-- 触发按钮 -->
    <button 
      class="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
      @click="toggleCodecs"
      :disabled="isLoading"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
      </svg>
      <span v-if="isLoading">检测中...</span>
      <span v-else-if="showCodecs">隐藏编解码器</span>
      <span v-else>检测编解码器</span>
    </button>

    <!-- 编解码器列表 -->
    <div v-if="showCodecs" class="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <!-- 统计信息 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-2">编解码器统计</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-600 dark:text-gray-400">总计</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ stats.encoders }}</div>
            <div class="text-gray-600 dark:text-gray-400">编码器</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ stats.decoders }}</div>
            <div class="text-gray-600 dark:text-gray-400">解码器</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ stats.videoCodecs }}</div>
            <div class="text-gray-600 dark:text-gray-400">视频</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-pink-500">{{ stats.audioCodecs }}</div>
            <div class="text-gray-600 dark:text-gray-400">音频</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-500">{{ stats.hardwareCodecs }}</div>
            <div class="text-gray-600 dark:text-gray-400">硬件加速</div>
          </div>
        </div>
      </div>

      <!-- 过滤器 -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex flex-wrap gap-4 items-center">
          <!-- 搜索框 -->
          <div class="flex-1 min-w-48">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索编解码器..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <!-- 类型过滤 -->
          <select v-model="filterType" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
            <option value="all">所有类型</option>
            <option value="encoder">编码器</option>
            <option value="decoder">解码器</option>
          </select>
          
          <!-- 媒体类型过滤 -->
          <select v-model="filterMedia" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
            <option value="all">所有媒体</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
          </select>
          
          <!-- 硬件加速过滤 -->
          <select v-model="filterHardware" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
            <option value="all">所有</option>
            <option value="hardware">硬件加速</option>
            <option value="software">软件</option>
          </select>
          
          <!-- 重置按钮 -->
          <button 
            @click="resetFilters"
            class="px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      <!-- 编解码器列表 -->
      <div class="max-h-96 overflow-y-auto">
        <div v-if="filteredCodecs.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
          <div v-if="isLoading">正在检测编解码器...</div>
          <div v-else-if="error">检测失败: {{ error }}</div>
          <div v-else>没有找到匹配的编解码器</div>
        </div>
        
        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div 
            v-for="codec in filteredCodecs" 
            :key="`${codec.name}-${codec.codec_type}`"
            class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{{ codec.name }}</span>
                  
                  <!-- 类型标签 -->
                  <span 
                    :class="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': codec.codec_type === 'encoder',
                      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200': codec.codec_type === 'decoder'
                    }"
                    class="px-2 py-1 text-xs rounded-full"
                  >
                    {{ codec.codec_type === 'encoder' ? '编码器' : '解码器' }}
                  </span>
                  
                  <!-- 媒体类型标签 -->
                  <span 
                    :class="{
                      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200': codec.media_type === 'video',
                      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200': codec.media_type === 'audio'
                    }"
                    class="px-2 py-1 text-xs rounded-full"
                  >
                    {{ codec.media_type === 'video' ? '视频' : '音频' }}
                  </span>
                  
                  <!-- 硬件加速标签 -->
                  <span 
                    v-if="codec.hardware_type"
                    class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  >
                    {{ codec.hardware_type }}
                  </span>
                </div>
                
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ codec.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error && !showCodecs" class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-red-600 dark:text-red-400">检测失败: {{ error }}</p>
      <button 
        @click="detectCodecs"
        class="mt-2 px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
      >
        重试
      </button>
    </div>
  </div>
</template>

<style scoped>
.codec-detector {
  @apply w-full;
}
</style>