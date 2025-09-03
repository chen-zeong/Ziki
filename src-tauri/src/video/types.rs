use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: Option<f64>,
    pub end: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub format: String,
    pub codec: String,
    pub resolution: String,
    pub custom_resolution: Option<CustomResolution>,
    pub quality_type: String, // "crf" or "bitrate"
    pub crf_value: Option<u8>,
    pub bitrate: Option<String>,
    pub time_range: Option<TimeRange>,
    #[serde(rename = "hardwareAcceleration")]
    pub hardware_acceleration: Option<String>, // "cpu" or "gpu"
    #[serde(rename = "bitDepth")]
    pub bit_depth: Option<u8>, // 8, 10, or 12 bit
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomResolution {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub format: String,
    #[serde(rename = "videoCodec")]
    pub video_codec: String,
    #[serde(rename = "audioCodec")]
    pub audio_codec: String,
    pub resolution: String,
    pub bitrate: String,
    #[serde(rename = "sampleRate")]
    pub sample_rate: String,
    pub duration: f64,
    pub fps: f64,
    #[serde(rename = "colorDepth")]
    pub color_depth: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub success: bool,
    #[serde(rename = "outputPath")]
    pub output_path: Option<String>,
    pub error: Option<String>,
    #[serde(rename = "originalSize")]
    pub original_size: u64,
    #[serde(rename = "compressedSize")]
    pub compressed_size: Option<u64>,
    #[serde(rename = "compressedMetadata")]
    pub compressed_metadata: Option<VideoMetadata>,
}