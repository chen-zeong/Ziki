use std::process::Command;
use tauri::Manager;
use crate::video::{CompressionSettings, CompressionResult, get_ffmpeg_binary, get_video_metadata};

// 将前端编码器名称映射为FFmpeg编码器名称
fn map_codec_to_ffmpeg(codec: &str) -> &str {
    match codec {
        "H.264" => "libx264",
        "H.265" | "HEVC" => "libx265",
        "AV1" => "libaom-av1",
        "VP8" => "libvpx",
        "VP9" => "libvpx-vp9",
        "Xvid" => "libxvid",
        "ProRes" => "prores",
        "WMV9" => "wmv2",
        "VC-1" => "vc1",
        "MPEG-2" => "mpeg2video",
        "MPEG-4" => "mpeg4",
        "H.263" => "h263",
        "VP6" => "vp6",
        "Theora" => "libtheora",
        "DNxHD" => "dnxhd",
        // 如果已经是FFmpeg编码器名称，直接返回
        _ => codec,
    }
}

// 将前端音频编码器名称映射为FFmpeg编码器名称
fn map_audio_codec_to_ffmpeg(codec: &str) -> &str {
    match codec {
        "AAC" => "aac",
        "MP3" => "libmp3lame",
        "FLAC" => "flac",
        "Vorbis" => "libvorbis",
        "Opus" => "libopus",
        "AC-3" => "ac3",
        "DTS" => "dts",
        "WMA" => "wmav2",
        "AMR" => "libopencore_amrnb",
        "PCM" => "pcm_s16le",
        // 如果已经是FFmpeg编码器名称，直接返回
        _ => codec,
    }
}

#[tauri::command]
pub async fn compress_video(
    inputPath: String,
    outputPath: String,
    settings: CompressionSettings,
    app_handle: tauri::AppHandle,
) -> Result<CompressionResult, String> {
    // In development mode, use the bin directory in src-tauri
    // In production, use the resource directory
    let ffmpeg_path = if cfg!(debug_assertions) {
        // Development mode: use bin directory relative to src-tauri
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffmpeg_binary())
    } else {
        // Production mode: use resource directory
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffmpeg_binary())
    };
    
    println!("FFmpeg path: {:?}", ffmpeg_path);
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    let original_size = std::fs::metadata(&inputPath)
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();
    
    let mut cmd = Command::new(&ffmpeg_path);
    
    // Add time range parameters if specified
    if let Some(time_range) = &settings.time_range {
        if let Some(start) = time_range.start {
            cmd.arg("-ss").arg(start.to_string());
        }
    }
    
    cmd.arg("-i").arg(&inputPath);
    
    // Add duration parameter if end time is specified
    if let Some(time_range) = &settings.time_range {
        if let Some(end) = time_range.end {
            if let Some(start) = time_range.start {
                let duration = end - start;
                if duration > 0.0 {
                    cmd.arg("-t").arg(duration.to_string());
                }
            } else {
                // If only end time is specified, treat it as duration from start
                cmd.arg("-t").arg(end.to_string());
            }
        }
    }
    
    // Set video codec (映射为FFmpeg编码器名称)
    let ffmpeg_codec = map_codec_to_ffmpeg(&settings.codec);
    cmd.arg("-c:v").arg(ffmpeg_codec);
    
    // Set quality (CRF or bitrate)
    match settings.quality_type.as_str() {
        "crf" => {
            if let Some(crf) = settings.crf_value {
                cmd.arg("-crf").arg(crf.to_string());
            }
        }
        "bitrate" => {
            if let Some(bitrate) = &settings.bitrate {
                cmd.arg("-b:v").arg(bitrate);
            }
        }
        _ => {}
    }
    
    // Set resolution
    let mut scale_filter = String::new();
    if settings.resolution == "custom" {
        if let Some(custom_res) = &settings.custom_resolution {
            scale_filter = format!("scale={}:{}", custom_res.width, custom_res.height);
        }
    } else if settings.resolution != "original" {
        scale_filter = format!("scale={}", settings.resolution.replace("x", ":"));
    }
    
    if !scale_filter.is_empty() {
        cmd.arg("-vf").arg(scale_filter);
    }
    
    // Set audio codec and sample rate
    if settings.audio_format != "copy" {
        let ffmpeg_audio_codec = map_audio_codec_to_ffmpeg(&settings.audio_format);
        cmd.arg("-c:a").arg(ffmpeg_audio_codec);
        if settings.sample_rate != "original" {
            cmd.arg("-ar").arg(&settings.sample_rate);
        }
    } else {
        cmd.arg("-c:a").arg("copy");
    }
    
    cmd.arg("-y").arg(&outputPath);
    
    println!("Executing FFmpeg command: {:?}", cmd);
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    println!("FFmpeg exit status: {}", output.status);
    println!("FFmpeg stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("FFmpeg stderr: {}", String::from_utf8_lossy(&output.stderr));

    if output.status.success() {
        let compressed_size = std::fs::metadata(&outputPath)
            .map(|m| m.len())
            .ok();
        
        // 获取压缩后文件的元数据
        let compressed_metadata = match get_video_metadata(outputPath.clone()) {
            Ok(metadata) => Some(metadata),
            Err(e) => {
                println!("Warning: Failed to get compressed video metadata: {}", e);
                None
            }
        };
            
        Ok(CompressionResult {
            success: true,
            output_path: Some(outputPath),
            error: None,
            original_size,
            compressed_size,
            compressed_metadata,
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(CompressionResult {
            success: false,
            output_path: None,
            error: Some(error_msg.to_string()),
            original_size,
            compressed_size: None,
            compressed_metadata: None,
        })
    }
}