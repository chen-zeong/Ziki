import { ref, computed, type Ref } from 'vue';
import type { VideoFormatsConfig, VideoFormat } from '../types/videoFormats';
import videoFormatsConfig from '../config/videoFormats.json';

// 创建全局状态实例
const config = videoFormatsConfig as VideoFormatsConfig;

// 当前选择的格式 - 全局状态
const selectedFormat: Ref<string> = ref('mp4');
const selectedVideoCodec: Ref<string> = ref('H.264');
const selectedAudioCodec: Ref<string> = ref('AAC');

export function useVideoFormats() {

  // 获取所有视频格式
  const allFormats = computed(() => config.videoFormats);
  
  // 获取推荐的视频格式
  const recommendedFormats = computed(() => {
    const recommended: Record<string, VideoFormat> = {};
    Object.entries(config.videoFormats).forEach(([key, format]) => {
      if (format.recommended) {
        recommended[key] = format;
      }
    });
    return recommended;
  });

  // 获取当前格式支持的视频编码
  const supportedVideoCodecs = computed(() => {
    const format = config.videoFormats[selectedFormat.value];
    return format ? format.videoCodecs : [];
  });

  // 获取当前格式支持的音频编码
  const supportedAudioCodecs = computed(() => {
    const format = config.videoFormats[selectedFormat.value];
    return format ? format.audioCodecs : [];
  });

  // 获取视频编码详细信息
  const videoCodecInfo = computed(() => {
    return config.videoCodecs[selectedVideoCodec.value];
  });

  // 获取音频编码详细信息
  const audioCodecInfo = computed(() => {
    return config.audioCodecs[selectedAudioCodec.value];
  });

  // 获取当前格式信息
  const currentFormatInfo = computed(() => {
    return config.videoFormats[selectedFormat.value];
  });

  // 检查当前编码组合是否兼容
  const isCurrentCombinationValid = computed(() => {
    const format = config.videoFormats[selectedFormat.value];
    if (!format) return false;
    
    const videoSupported = format.videoCodecs.includes(selectedVideoCodec.value);
    const audioSupported = format.audioCodecs.includes(selectedAudioCodec.value);
    
    return videoSupported && audioSupported;
  });

  // 设置格式并自动选择兼容的编码
  const setFormat = (formatKey: string) => {
    selectedFormat.value = formatKey;
    const format = config.videoFormats[formatKey];
    
    if (format) {
      // 如果当前视频编码不兼容，选择第一个支持的编码
      if (!format.videoCodecs.includes(selectedVideoCodec.value)) {
        selectedVideoCodec.value = format.videoCodecs[0] || 'H.264';
      }
      
      // 如果当前音频编码不兼容，选择第一个支持的编码
      if (!format.audioCodecs.includes(selectedAudioCodec.value)) {
        selectedAudioCodec.value = format.audioCodecs[0] || 'AAC';
      }
    }
  };

  // 设置视频编码
  const setVideoCodec = (codec: string) => {
    const format = config.videoFormats[selectedFormat.value];
    if (format && format.videoCodecs.includes(codec)) {
      selectedVideoCodec.value = codec;
    }
  };

  // 设置音频编码
  const setAudioCodec = (codec: string) => {
    const format = config.videoFormats[selectedFormat.value];
    if (format && format.audioCodecs.includes(codec)) {
      selectedAudioCodec.value = codec;
    }
  };

  // 获取格式的扩展名
  const getFormatExtension = (formatKey: string): string => {
    return config.videoFormats[formatKey]?.extension || '';
  };

  // 获取编码质量等级
  const getCodecQuality = (codecName: string, type: 'video' | 'audio'): string => {
    if (type === 'video') {
      return config.videoCodecs[codecName]?.quality || 'unknown';
    } else {
      return config.audioCodecs[codecName]?.quality || 'unknown';
    }
  };

  // 检查是否支持硬件加速
  const hasHardwareSupport = (codecName: string): boolean => {
    return config.videoCodecs[codecName]?.hardwareSupport || false;
  };

  // 获取推荐的编码组合
  const getRecommendedCombination = (formatKey: string) => {
    const format = config.videoFormats[formatKey];
    if (!format) return null;

    // 优先选择H.264和AAC（最兼容的组合）
    const videoCodec = format.videoCodecs.includes('H.264') ? 'H.264' : format.videoCodecs[0];
    const audioCodec = format.audioCodecs.includes('AAC') ? 'AAC' : format.audioCodecs[0];

    return {
      videoCodec,
      audioCodec
    };
  };

  // 获取格式列表（用于下拉选择）
  const formatOptions = computed(() => {
    return Object.entries(config.videoFormats).map(([key, format]) => ({
      value: key,
      label: format.name,
      description: format.description,
      recommended: format.recommended
    }));
  });

  // 获取视频编码选项
  const videoCodecOptions = computed(() => {
    return supportedVideoCodecs.value.map(codec => {
      const codecInfo = config.videoCodecs[codec];
      return {
        value: codec,
        label: codecInfo?.name || codec,
        description: codecInfo?.description || '',
        quality: codecInfo?.quality || 'unknown',
        hardwareSupport: codecInfo?.hardwareSupport || false
      };
    });
  });

  // 获取音频编码选项
  const audioCodecOptions = computed(() => {
    return supportedAudioCodecs.value.map(codec => {
      const codecInfo = config.audioCodecs[codec];
      return {
        value: codec,
        label: codecInfo?.name || codec,
        description: codecInfo?.description || '',
        quality: codecInfo?.quality || 'unknown',
        recommendedBitrate: codecInfo?.recommendedBitrate || ''
      };
    });
  });

  return {
    // 状态
    selectedFormat,
    selectedVideoCodec,
    selectedAudioCodec,
    
    // 计算属性
    allFormats,
    recommendedFormats,
    supportedVideoCodecs,
    supportedAudioCodecs,
    videoCodecInfo,
    audioCodecInfo,
    currentFormatInfo,
    isCurrentCombinationValid,
    formatOptions,
    videoCodecOptions,
    audioCodecOptions,
    
    // 方法
    setFormat,
    setVideoCodec,
    setAudioCodec,
    getFormatExtension,
    getCodecQuality,
    hasHardwareSupport,
    getRecommendedCombination
  };
}