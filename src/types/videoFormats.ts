// 视频格式配置类型定义

export interface VideoCodec {
  name: string;
  description: string;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  compression: 'none' | 'poor' | 'fair' | 'good' | 'excellent';
  hardwareSupport: boolean;
}

export interface AudioCodec {
  name: string;
  description: string;
  quality: 'poor' | 'fair' | 'good' | 'excellent' | 'lossless';
  compression: 'none' | 'poor' | 'fair' | 'good' | 'excellent';
  recommendedBitrate: string;
}

export interface VideoFormat {
  name: string;
  extension: string;
  videoCodecs: string[];
  audioCodecs: string[];
  description: string;
  recommended: boolean;
}

export interface VideoFormatsConfig {
  videoFormats: Record<string, VideoFormat>;
  videoCodecs: Record<string, VideoCodec>;
  audioCodecs: Record<string, AudioCodec>;
}

// 导入配置数据
import videoFormatsConfigData from '../config/videoFormats.json';
export const videoFormatsConfig = videoFormatsConfigData as VideoFormatsConfig;

// 工具函数：根据视频格式获取支持的视频编码
export function getSupportedVideoCodecs(format: string): string[] {
  return videoFormatsConfig.videoFormats[format]?.videoCodecs || [];
}

// 工具函数：根据视频格式获取支持的音频编码
export function getSupportedAudioCodecs(format: string): string[] {
  return videoFormatsConfig.videoFormats[format]?.audioCodecs || [];
}

// 工具函数：获取推荐的视频格式
export function getRecommendedFormats(): Record<string, VideoFormat> {
  const recommended: Record<string, VideoFormat> = {};
  
  Object.entries(videoFormatsConfig.videoFormats).forEach(([key, format]) => {
    if (format.recommended) {
      recommended[key] = format;
    }
  });
  
  return recommended;
}

// 工具函数：检查编码组合是否兼容
export function isCodecCompatible(format: string, videoCodec: string, audioCodec: string): boolean {
  const formatConfig = videoFormatsConfig.videoFormats[format];
  
  if (!formatConfig) return false;
  
  const videoSupported = formatConfig.videoCodecs.includes(videoCodec);
  const audioSupported = formatConfig.audioCodecs.includes(audioCodec);
  
  return videoSupported && audioSupported;
}

// 工具函数：获取编码质量信息
export function getCodecQuality(codecName: string, type: 'video' | 'audio'): string {
  if (type === 'video') {
    return videoFormatsConfig.videoCodecs[codecName]?.quality || 'unknown';
  } else {
    return videoFormatsConfig.audioCodecs[codecName]?.quality || 'unknown';
  }
}

// 工具函数：获取硬件加速支持信息
export function hasHardwareSupport(codecName: string): boolean {
  return videoFormatsConfig.videoCodecs[codecName]?.hardwareSupport || false;
}