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
  colorDepth?: string; // 色彩深度，如 '8-bit', '10-bit' 等
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
  status: 'pending' | 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  originalSize: number;
  compressedSize?: number;
  compressedMetadata?: VideoMetadata; // 压缩后的视频元数据
  settings: CompressionSettings;
  outputDirectory?: string; // 输出文件夹路径
  createdAt: Date;
  startedAt?: Date; // 开始压缩的时间
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
  resolution: 'original' | '1920x1080' | '1280x720' | '854x480' | 'custom';
  customResolution?: CustomResolution;
  qualityType: 'crf' | 'qv' | 'profile'; // 支持多种质量参数类型
  crfValue?: number; // CRF值，用于软件编码
  qvValue?: number; // -q:v值，用于硬件加速
  profileValue?: string; // Profile值，用于ProRes等编码器
  timeRange?: TimeRange;
  hardwareAcceleration?: 'cpu' | 'gpu';
  bitDepth?: 8 | 10 | 12; // 色彩深度，支持8bit、10bit、12bit
}

export interface CompressionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  originalSize: number;
  compressedSize?: number;
  compressedMetadata?: VideoMetadata; // 压缩后的视频元数据
}

export interface ComparisonData {
  beforeUrl: string;
  afterUrl: string;
  beforeSize: number;
  afterSize: number;
}