use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub format: String,
    pub codec: String,
    pub resolution: String,
    pub custom_resolution: Option<CustomResolution>,
    pub quality_type: String, // "crf" or "bitrate"
    pub crf_value: Option<u8>,
    pub bitrate: Option<String>,
    pub audio_format: String,
    pub sample_rate: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomResolution {
    pub width: u32,
    pub height: u32,
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
}