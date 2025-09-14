import { ref, computed, type Ref } from 'vue';
import type { VideoFormatsConfig, VideoFormat } from '../types/videoFormats';
import videoFormatsConfig from '../config/videoFormats.json';

// 创建全局状态实例
const config = videoFormatsConfig as VideoFormatsConfig;

// 当前选择的格式 - 全局状态
const selectedFormat: Ref<string> = ref('mp4');
const selectedVideoCodec: Ref<string> = ref('H.264'); // 默认选择H264编码

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



  // 获取视频编码详细信息
  const videoCodecInfo = computed(() => {
    return config.videoCodecs[selectedVideoCodec.value];
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
    
    return videoSupported;
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
    }
  };

  // 设置视频编码
  const setVideoCodec = (codec: string) => {
    const format = config.videoFormats[selectedFormat.value];
    if (format && format.videoCodecs.includes(codec)) {
      selectedVideoCodec.value = codec;
    }
  };



  // 获取格式的扩展名
  const getFormatExtension = (formatKey: string): string => {
    return config.videoFormats[formatKey]?.extension || '';
  };

  // 获取编码质量等级
  const getCodecQuality = (codecName: string, type: 'video'): string => {
    return config.videoCodecs[codecName]?.quality || 'unknown';
  };

  // 检查是否支持硬件加速
  const hasHardwareSupport = (codecName: string): boolean => {
    return config.videoCodecs[codecName]?.hardwareSupport || false;
  };

  // 获取推荐的编码组合
  const getRecommendedCombination = (formatKey: string) => {
    const format = config.videoFormats[formatKey];
    if (!format) return null;

    // 优先选择H.264（最兼容的组合）
    const videoCodec = format.videoCodecs.includes('H.264') ? 'H.264' : format.videoCodecs[0];

    return {
      videoCodec
    };
  };

  // 为每种格式生成标签（克制、简洁）
  const getFormatTags = (key: string): string[] => {
    switch (key) {
      case 'mp4': return ['兼容性强'];
      case 'mov': return ['Apple生态'];
      case 'mkv': return ['开源','多音轨字幕'];
      case 'avi': return ['老牌格式','体积大'];
      case 'wmv': return ['Windows优化'];
      case 'webm': return ['谷歌开发','Web优化'];
      case 'flv': return ['Flash开发','过时'];
      case 'avif': return ['高质量动态图片'];
      default: return [];
    }
  };

  // 获取格式列表（用于下拉选择）
  const formatOptions = computed(() => {
    return Object.entries(config.videoFormats).map(([key, format]) => ({
      value: key,
      label: (format as any).name || key.toUpperCase(),
      description: (format as any).description || '',
      recommended: !!(format as any).recommended,
      // 新增：小标签，突出优势
      tags: getFormatTags(key)
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



  return {
    // 状态
    selectedFormat,
    selectedVideoCodec,
    
    // 计算属性
    allFormats,
    recommendedFormats,
    supportedVideoCodecs,
    videoCodecInfo,
    currentFormatInfo,
    isCurrentCombinationValid,
    formatOptions,
    videoCodecOptions,
    
    // 方法
    setFormat,
    setVideoCodec,
    getFormatExtension,
    getCodecQuality,
    hasHardwareSupport,
    getRecommendedCombination
  };
}