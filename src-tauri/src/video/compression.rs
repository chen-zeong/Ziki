use std::process::Command;
use tauri::Manager;
use crate::video::{CompressionSettings, CompressionResult, get_ffmpeg_binary};

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
    cmd.arg("-i").arg(&inputPath);
    
    // Set video codec
    cmd.arg("-c:v").arg(&settings.codec);
    
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
        cmd.arg("-c:a").arg(&settings.audio_format);
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
            
        Ok(CompressionResult {
            success: true,
            output_path: Some(outputPath),
            error: None,
            original_size,
            compressed_size,
        })
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(CompressionResult {
            success: false,
            output_path: None,
            error: Some(error_msg.to_string()),
            original_size,
            compressed_size: None,
        })
    }
}