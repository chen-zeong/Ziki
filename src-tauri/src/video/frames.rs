use std::process::Command;
use tauri::Manager;
use base64::{Engine as _, engine::general_purpose};
use crate::video::{get_ffmpeg_binary, parse_duration_from_ffmpeg_output};

#[tauri::command]
pub async fn generate_single_frame(videoPath: String, frameIndex: u32, app_handle: tauri::AppHandle) -> Result<String, String> {
    let start_time = std::time::Instant::now();
    println!("[Rust Debug] 开始生成帧 {} for {}", frameIndex, videoPath);
    
    // Get FFmpeg path
    let ffmpeg_path = if cfg!(debug_assertions) {
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffmpeg_binary())
    } else {
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffmpeg_binary())
    };
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    // First, get video duration
    let duration_start = std::time::Instant::now();
    println!("[Rust Debug] 开始获取视频时长 for 帧 {}", frameIndex);
    let duration_output = Command::new(&ffmpeg_path)
        .arg("-i").arg(&videoPath)
        .arg("-f").arg("null")
        .arg("-")
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    let stderr = String::from_utf8_lossy(&duration_output.stderr);
    let duration = parse_duration_from_ffmpeg_output(&stderr)
        .ok_or("Failed to parse video duration")?;
    println!("[Rust Debug] 获取视频时长完成 for 帧 {}, 耗时: {:?}", frameIndex, duration_start.elapsed());
    
    // Calculate timestamp for the specific frame
    let timestamp = if frameIndex == 0 {
        // For the first frame, use a small offset to avoid issues at the very beginning
        0.1
    } else if frameIndex == 9 {
        // For the last frame, use a timestamp well before the end to avoid edge cases
        (duration - 0.5).max(duration * 0.95).max(0.0)
    } else {
        (duration * frameIndex as f64) / 9.0
    };
    let timestamp_str = format!("{:.2}", timestamp);
    
    // Create a safe temporary file path
    let video_path_buf = std::path::Path::new(&videoPath);
    let parent_dir = video_path_buf.parent().unwrap_or(std::path::Path::new("."));
    let file_stem = video_path_buf.file_stem().unwrap_or(std::ffi::OsStr::new("video"));
    let frame_output_path = parent_dir.join(format!("{}_frame_{}.jpg", file_stem.to_string_lossy(), frameIndex)).to_string_lossy().to_string();
    
    println!("Generating frame {} at timestamp {} to path: {}", frameIndex, timestamp_str, frame_output_path);
    
    let ffmpeg_start = std::time::Instant::now();
    let output = Command::new(&ffmpeg_path)
        .arg("-i").arg(&videoPath)
        .arg("-ss").arg(&timestamp_str)
        .arg("-vframes").arg("1")
        .arg("-y")
        .arg(&frame_output_path)
        .output()
        .map_err(|e| format!("Failed to generate frame {}: {}", frameIndex, e))?;
    println!("[Rust Debug] FFmpeg生成帧 {} 完成, 耗时: {:?}", frameIndex, ffmpeg_start.elapsed());
    
    if output.status.success() {
        // Check if file exists before trying to read it
        if std::path::Path::new(&frame_output_path).exists() {
            // Read the generated frame file and convert to base64
            match std::fs::read(&frame_output_path) {
                Ok(image_data) => {
                    let base64_data = general_purpose::STANDARD.encode(&image_data);
                    // Clean up the temporary file
                    let _ = std::fs::remove_file(&frame_output_path);
                    println!("[Rust Debug] 帧 {} 生成完成, 总耗时: {:?}", frameIndex, start_time.elapsed());
                    Ok(format!("data:image/jpeg;base64,{}", base64_data))
                }
                Err(e) => Err(format!("Failed to read frame file {}: {}", frameIndex, e))
            }
        } else {
            Err(format!("Frame file {} was not created", frameIndex))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to generate frame {}: {}", frameIndex, stderr))
    }
}

#[tauri::command]
pub async fn generate_video_frames(video_path: String, app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    // Get FFmpeg path
    let ffmpeg_path = if cfg!(debug_assertions) {
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffmpeg_binary())
    } else {
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffmpeg_binary())
    };
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    // First, get video duration
    let duration_output = Command::new(&ffmpeg_path)
        .arg("-i").arg(&video_path)
        .arg("-f").arg("null")
        .arg("-")
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    let stderr = String::from_utf8_lossy(&duration_output.stderr);
    let duration = parse_duration_from_ffmpeg_output(&stderr)
        .ok_or("Failed to parse video duration")?;
    
    let mut frames = Vec::new();
    
    // Generate 10 frames at evenly spaced intervals
    for i in 0..10 {
        let timestamp = if i == 9 {
            // For the last frame, use a timestamp slightly before the end
            (duration - 0.1).max(0.0)
        } else {
            (duration * i as f64) / 9.0
        };
        let timestamp_str = format!("{:.2}", timestamp);
        
        // Create a safe temporary file path
        let video_path_buf = std::path::Path::new(&video_path);
        let parent_dir = video_path_buf.parent().unwrap_or(std::path::Path::new("."));
        let file_stem = video_path_buf.file_stem().unwrap_or(std::ffi::OsStr::new("video"));
        let frame_output_path = parent_dir.join(format!("{}_frame_{}.jpg", file_stem.to_string_lossy(), i)).to_string_lossy().to_string();
        
        println!("Generating frame {} at timestamp {} to path: {}", i, timestamp_str, frame_output_path);
        
        let output = Command::new(&ffmpeg_path)
            .arg("-i").arg(&video_path)
            .arg("-ss").arg(&timestamp_str)
            .arg("-vframes").arg("1")
            .arg("-y")
            .arg(&frame_output_path)
            .output()
            .map_err(|e| format!("Failed to generate frame {}: {}", i, e))?;
        
        if output.status.success() {
            // Check if file exists before trying to read it
            if std::path::Path::new(&frame_output_path).exists() {
                // Read the generated frame file and convert to base64
                match std::fs::read(&frame_output_path) {
                    Ok(image_data) => {
                        let base64_data = general_purpose::STANDARD.encode(&image_data);
                        // Clean up the temporary file
                        let _ = std::fs::remove_file(&frame_output_path);
                        frames.push(format!("data:image/jpeg;base64,{}", base64_data));
                        println!("Successfully generated frame {}", i);
                    }
                    Err(e) => return Err(format!("Failed to read frame file {}: {}", i, e))
                }
            } else {
                return Err(format!("Frame file {} was not created", i));
            }
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to generate frame {}: {}", i, stderr));
        }
    }
    
    Ok(frames)
}

#[tauri::command]
pub async fn generate_thumbnail(videoPath: String, app_handle: tauri::AppHandle) -> Result<String, String> {
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
    
    println!("FFmpeg path for thumbnail: {:?}", ffmpeg_path);
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    let output_path = format!("{}_thumb.jpg", videoPath.trim_end_matches(|c| c != '.'));
    
    let output = Command::new(&ffmpeg_path)
        .arg("-i").arg(&videoPath)
        .arg("-ss").arg("00:00:01")
        .arg("-vframes").arg("1")
        .arg("-y")
        .arg(&output_path)
        .output()
        .map_err(|e| format!("Failed to generate thumbnail: {}", e))?;
    
    if output.status.success() {
        // Read the generated thumbnail file and convert to base64
        match std::fs::read(&output_path) {
            Ok(image_data) => {
                let base64_data = general_purpose::STANDARD.encode(&image_data);
                // Clean up the temporary file
                let _ = std::fs::remove_file(&output_path);
                Ok(format!("data:image/jpeg;base64,{}", base64_data))
            }
            Err(e) => Err(format!("Failed to read thumbnail file: {}", e))
        }
    } else {
        Err("Failed to generate thumbnail".to_string())
    }
}