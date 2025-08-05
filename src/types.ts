export interface VideoFile {
  id: string;
  name: string;
  size: number;
  path: string;
  thumbnailUrl?: string;
  originalUrl?: string;
  compressedUrl?: string;
  compressedPath?: string;
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

export interface CompressionSettings {
  format: 'mp4' | 'webm' | 'avi' | 'mkv' | 'mov' | 'flv' | 'wmv' | 'avif';
  codec: 'libx264' | 'libx265' | 'libvpx-vp9' | 'libaom-av1' | 'mpeg4' | 'libxvid';
  resolution: 'original' | '1920x1080' | '1280x720' | '854x480' | 'custom';
  customResolution?: CustomResolution;
  qualityType: 'crf' | 'bitrate';
  crfValue?: number;
  bitrate?: string;
  audioFormat: 'aac' | 'mp3' | 'libvorbis' | 'flac' | 'copy';
  sampleRate: 'original' | '22050' | '44100' | '48000' | '96000';
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