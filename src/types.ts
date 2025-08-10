// 导出视频格式相关类型
export type { VideoFormatsConfig, VideoFormat, VideoCodec, AudioCodec } from './types/videoFormats';

export interface VideoMetadata {
  format: string; // 视频格式，如 'mp4', 'mkv' 等
  videoCodec: string; // 视频编码，如 'H.264', 'H.265' 等
  audioCodec: string; // 音频编码，如 'AAC', 'MP3' 等
  resolution: string; // 分辨率，如 '1920x1080'
  bitrate: string; // 码率，如 '2000 kbps'
  sampleRate: string; // 音频采样率，如 '48000 Hz'
  duration: number; // 视频时长（秒）
  fps: number; // 帧率
}

export interface VideoFile {
  id: string;
  name: string;
  size: number;
  path: string;
  thumbnailUrl?: string;
  originalUrl?: string;
  compressedUrl?: string;
  compressedPath?: string;
  metadata?: VideoMetadata; // 视频元数据
}

export interface CompressionTask {
  id: string;
  file: VideoFile;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  originalSize: number;
  compressedSize?: number;
  settings: CompressionSettings;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface CustomResolution {
  width: number;
  height: number;
}

export interface TimeRange {
  start: number | null;
  end: number | null;
}

export interface CompressionSettings {
  format: string; // 视频容器格式，如 'mp4', 'mkv', 'webm' 等
  videoCodec: string; // 视频编码，如 'H.264', 'H.265', 'VP9' 等
  audioCodec: string; // 音频编码，如 'AAC', 'MP3', 'FLAC' 等
  resolution: 'original' | '1920x1080' | '1280x720' | '854x480' | 'custom';
  customResolution?: CustomResolution;
  qualityType: 'crf' | 'bitrate';
  crfValue?: number;
  bitrate?: string;
  sampleRate: 'original' | '22050' | '44100' | '48000' | '96000';
  timeRange?: TimeRange;
  hardwareAcceleration?: 'cpu' | 'gpu';
}

export interface CompressionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  originalSize: number;
  compressedSize?: number;
}

export interface ComparisonData {
  beforeUrl: string;
  afterUrl: string;
  beforeSize: number;
  afterSize: number;
}