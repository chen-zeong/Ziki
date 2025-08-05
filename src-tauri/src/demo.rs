mod video;

use video::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}



#[tauri::command]
async fn compress_video(
    input_path: String,
    output_path: String,
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
    
    let original_size = std::fs::metadata(&input_path)
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();
    
    let mut cmd = Command::new(&ffmpeg_path);
    cmd.arg("-i").arg(&input_path);
    
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
    
    cmd.arg("-y").arg(&output_path);
    
    println!("Executing FFmpeg command: {:?}", cmd);
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    println!("FFmpeg exit status: {}", output.status);
    println!("FFmpeg stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("FFmpeg stderr: {}", String::from_utf8_lossy(&output.stderr));

    if output.status.success() {
        let compressed_size = std::fs::metadata(&output_path)
            .map(|m| m.len())
            .ok();
            
        Ok(CompressionResult {
            success: true,
            output_path: Some(output_path),
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

#[tauri::command]
async fn generate_single_frame(video_path: String, frame_index: u32, app_handle: tauri::AppHandle) -> Result<String, String> {
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
    
    // Calculate timestamp for the specific frame
    let timestamp = if frame_index == 9 {
        // For the last frame, use a timestamp well before the end to avoid edge cases
        (duration - 0.5).max(duration * 0.95).max(0.0)
    } else {
        (duration * frame_index as f64) / 9.0
    };
    let timestamp_str = format!("{:.2}", timestamp);
    
    // Create a safe temporary file path
    let video_path_buf = std::path::Path::new(&video_path);
    let parent_dir = video_path_buf.parent().unwrap_or(std::path::Path::new("."));
    let file_stem = video_path_buf.file_stem().unwrap_or(std::ffi::OsStr::new("video"));
    let frame_output_path = parent_dir.join(format!("{}_frame_{}.jpg", file_stem.to_string_lossy(), frame_index)).to_string_lossy().to_string();
    
    println!("Generating frame {} at timestamp {} to path: {}", frame_index, timestamp_str, frame_output_path);
    
    let output = Command::new(&ffmpeg_path)
        .arg("-i").arg(&video_path)
        .arg("-ss").arg(&timestamp_str)
        .arg("-vframes").arg("1")
        .arg("-y")
        .arg(&frame_output_path)
        .output()
        .map_err(|e| format!("Failed to generate frame {}: {}", frame_index, e))?;
    
    if output.status.success() {
        // Check if file exists before trying to read it
        if std::path::Path::new(&frame_output_path).exists() {
            // Read the generated frame file and convert to base64
            match std::fs::read(&frame_output_path) {
                Ok(image_data) => {
                    let base64_data = base64::encode(&image_data);
                    // Clean up the temporary file
                    let _ = std::fs::remove_file(&frame_output_path);
                    println!("Successfully generated frame {}", frame_index);
                    Ok(format!("data:image/jpeg;base64,{}", base64_data))
                }
                Err(e) => Err(format!("Failed to read frame file {}: {}", frame_index, e))
            }
        } else {
            Err(format!("Frame file {} was not created", frame_index))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to generate frame {}: {}", frame_index, stderr))
    }
}

#[tauri::command]
async fn generate_video_frames(video_path: String, app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
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
                        let base64_data = base64::encode(&image_data);
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

fn parse_duration_from_ffmpeg_output(output: &str) -> Option<f64> {
    // Look for "Duration: HH:MM:SS.ss" in the output
    for line in output.lines() {
        if line.contains("Duration:") {
            if let Some(duration_part) = line.split("Duration: ").nth(1) {
                if let Some(time_str) = duration_part.split(',').next() {
                    return parse_time_to_seconds(time_str.trim());
                }
            }
        }
    }
    None
}

fn parse_time_to_seconds(time_str: &str) -> Option<f64> {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() == 3 {
        let hours: f64 = parts[0].parse().ok()?;
        let minutes: f64 = parts[1].parse().ok()?;
        let seconds: f64 = parts[2].parse().ok()?;
        Some(hours * 3600.0 + minutes * 60.0 + seconds)
    } else {
        None
    }
}

#[tauri::command]
async fn generate_thumbnail(video_path: String, app_handle: tauri::AppHandle) -> Result<String, String> {
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
    
    let output_path = format!("{}_thumb.jpg", video_path.trim_end_matches(|c| c != '.'));
    
    let output = Command::new(&ffmpeg_path)
        .arg("-i").arg(&video_path)
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
                let base64_data = base64::encode(&image_data);
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

fn get_desktop_directory() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        use std::env;
        if let Ok(userprofile) = env::var("USERPROFILE") {
            return Some(PathBuf::from(userprofile).join("Desktop"));
        }
    }
    
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        use std::env;
        if let Ok(home) = env::var("HOME") {
            return Some(PathBuf::from(home).join("Desktop"));
        }
    }
    
    None
}

fn get_ffmpeg_binary() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        #[cfg(target_arch = "aarch64")]
        return "compresso_ffmpeg-aarch64-apple-darwin";
        #[cfg(target_arch = "x86_64")]
        return "compresso_ffmpeg-x86_64-apple-darwin";
    }
    
    #[cfg(target_os = "windows")]
    {
        #[cfg(target_arch = "x86_64")]
        return "compresso_ffmpeg-x86_64-pc-windows-msvc.exe";
        #[cfg(target_arch = "x86")]
        return "compresso_ffmpeg-i686-pc-windows-msvc.exe";
    }
    
    #[cfg(target_os = "linux")]
    return "compresso_ffmpeg-x86_64-unknown-linux-gnu";
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return "ffmpeg";
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, compress_video, generate_thumbnail, generate_video_frames, generate_single_frame, get_desktop_path, get_file_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
