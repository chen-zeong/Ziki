use std::process::Command;
use tauri::Manager;
use base64::{Engine as _, engine::general_purpose};
use crate::video::{get_ffmpeg_binary, parse_duration_from_ffmpeg_output};

// 获取视频时长的单独函数 - 使用ffprobe快速获取
#[tauri::command]
pub async fn get_video_duration(videoPath: String, app_handle: tauri::AppHandle) -> Result<f64, String> {
    let start_time = std::time::Instant::now();
    println!("[Rust Debug] 开始获取视频时长: {}", videoPath);
    
    // 使用ffprobe快速获取视频时长，比FFmpeg快得多
    let output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            &videoPath
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("ffprobe failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    let json_str = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    
    // 解析JSON获取时长
    let json_value: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let duration = json_value["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .ok_or("Failed to extract duration from ffprobe output")?;
    
    println!("[Rust Debug] 视频时长获取完成: {}s, 总耗时: {:?}", duration, start_time.elapsed());
    Ok(duration)
}

// 生成单帧函数，支持自定义时间范围
#[tauri::command]
pub async fn generate_single_frame_with_time_range(videoPath: String, frameIndex: u32, timeRangeStart: f64, timeRangeEnd: f64, app_handle: tauri::AppHandle) -> Result<String, String> {
    let start_time = std::time::Instant::now();
    let time_range_duration = timeRangeEnd - timeRangeStart;
    println!("[Rust Debug] 开始生成帧 {} for {}, 时间范围: {}s - {}s (时长: {}s)", frameIndex, videoPath, timeRangeStart, timeRangeEnd, time_range_duration);
    
    // Get actual video duration to validate time range
    let actual_duration = get_video_duration(videoPath.clone(), app_handle.clone()).await?;
    if timeRangeEnd > actual_duration {
        return Err(format!("Time range end {} exceeds video duration {}", timeRangeEnd, actual_duration));
    }
    if timeRangeStart >= actual_duration {
        return Err(format!("Time range start {} exceeds video duration {}", timeRangeStart, actual_duration));
    }
    if time_range_duration <= 0.0 {
        return Err(format!("Invalid time range: start {} >= end {}", timeRangeStart, timeRangeEnd));
    }
    
    let path_check_start = std::time::Instant::now();
    println!("[Rust Debug] 检查FFmpeg路径...");
    
    // Get FFmpeg path
    let ffmpeg_path = if cfg!(debug_assertions) {
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffmpeg_binary())
    } else {
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffmpeg_binary())
    };
    println!("[Rust Debug] FFmpeg路径获取完成, 耗时: {:?}, 路径: {:?}", path_check_start.elapsed(), ffmpeg_path);
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    // Calculate timestamp within the custom time range
    let timestamp_calc_start = std::time::Instant::now();
    
    let time_range_duration = timeRangeEnd - timeRangeStart;
    
    // 统一时间戳计算逻辑，与 generate_single_frame_with_duration 保持一致
    let timestamp_offset = if frameIndex == 0 {
        // 对于第一帧，使用一个小的偏移量以避免在最开始时出现问题
        0.1
    } else if frameIndex == 9 {
        // 对于最后一帧，使用一个远在结束前的时间戳以避免边缘情况
        (time_range_duration - 0.5).max(time_range_duration * 0.95).max(0.0)
    } else {
        (time_range_duration * frameIndex as f64) / 9.0
    };
    
    let timestamp = timeRangeStart + timestamp_offset;
    
    // Validate timestamp is within reasonable bounds
    if timestamp < timeRangeStart {
        return Err(format!("Invalid timestamp {} for frame {} (less than start time {})", timestamp, frameIndex, timeRangeStart));
    }
    if timestamp > timeRangeEnd {
        // 允许时间戳等于结束时间，因为ffmpeg的-ss参数是寻找该时间点之前的关键帧
        println!("[Rust Warning] Timestamp {} for frame {} slightly exceeds end time {}, clamping to end time.", timestamp, frameIndex, timeRangeEnd);
    }
    
    let timestamp_str = format!("{:.2}", timestamp);
    println!("[Rust Debug] 时间戳计算完成, 耗时: {:?}, 帧索引: {}, 时间戳: {} (在范围 {}-{} 内), 时间范围长度: {}", timestamp_calc_start.elapsed(), frameIndex, timestamp_str, timeRangeStart, timeRangeEnd, time_range_duration);
    
    println!("[Rust Debug] 开始执行FFmpeg命令生成帧 {} at timestamp {}", frameIndex, timestamp_str);
    
    let ffmpeg_start = std::time::Instant::now();
    // 使用管道输出和优化参数来提高跳转性能
    let output = Command::new(&ffmpeg_path)
        .arg("-ss").arg(&timestamp_str)  // 将-ss放在-i之前，实现输入级别的跳转
        .arg("-i").arg(&videoPath)
        .arg("-vframes").arg("1")
        .arg("-f").arg("image2pipe")
        .arg("-vcodec").arg("mjpeg")
        .arg("-avoid_negative_ts").arg("make_zero")
        .arg("-")
        .output()
        .map_err(|e| format!("Failed to generate frame {}: {}", frameIndex, e))?;
    println!("[Rust Debug] FFmpeg命令执行完成, 帧 {} 耗时: {:?}", frameIndex, ffmpeg_start.elapsed());
    
    if output.status.success() {
        if !output.stdout.is_empty() {
            let base64_start = std::time::Instant::now();
            let base64_data = general_purpose::STANDARD.encode(&output.stdout);
            let data_url = format!("data:image/jpeg;base64,{}", base64_data);
            println!("[Rust Debug] Base64编码完成, 帧 {} 耗时: {:?}, 总耗时: {:?}", frameIndex, base64_start.elapsed(), start_time.elapsed());
            Ok(data_url)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            println!("[Rust Debug] FFmpeg成功但返回空数据, 帧 {}, stderr: {}", frameIndex, stderr);
            Err(format!("Empty frame data for frame {} - FFmpeg stderr: {}", frameIndex, stderr))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("[Rust Debug] FFmpeg执行失败, 帧 {}, stderr: {}", frameIndex, stderr);
        Err(format!("FFmpeg failed for frame {}: {}", frameIndex, stderr))
    }
}

// 优化的生成单帧函数，接受预先计算的时长
#[tauri::command]
pub async fn generate_single_frame_with_duration(videoPath: String, frameIndex: u32, duration: f64, app_handle: tauri::AppHandle) -> Result<String, String> {
    let start_time = std::time::Instant::now();
    println!("[Rust Debug] 开始生成帧 {} for {}, 视频时长: {}s", frameIndex, videoPath, duration);
    
    let path_check_start = std::time::Instant::now();
    println!("[Rust Debug] 检查FFmpeg路径...");
    
    // Get FFmpeg path
    let ffmpeg_path = if cfg!(debug_assertions) {
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffmpeg_binary())
    } else {
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffmpeg_binary())
    };
    println!("[Rust Debug] FFmpeg路径获取完成, 耗时: {:?}, 路径: {:?}", path_check_start.elapsed(), ffmpeg_path);
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    // Calculate timestamp for the specific frame (跳过获取时长步骤)
    let timestamp_calc_start = std::time::Instant::now();
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
    println!("[Rust Debug] 时间戳计算完成, 耗时: {:?}, 帧索引: {}, 时间戳: {}", timestamp_calc_start.elapsed(), frameIndex, timestamp_str);
    
    println!("[Rust Debug] 开始执行FFmpeg命令生成帧 {} at timestamp {}", frameIndex, timestamp_str);
    
    let ffmpeg_start = std::time::Instant::now();
    // 使用管道输出和优化参数来提高跳转性能
    let output = Command::new(&ffmpeg_path)
        .arg("-ss").arg(&timestamp_str)  // 将-ss放在-i之前，实现输入级别的跳转
        .arg("-i").arg(&videoPath)
        .arg("-vframes").arg("1")
        .arg("-f").arg("image2pipe")
        .arg("-vcodec").arg("mjpeg")
        .arg("-avoid_negative_ts").arg("make_zero")
        .arg("-")
        .output()
        .map_err(|e| format!("Failed to generate frame {}: {}", frameIndex, e))?;
    println!("[Rust Debug] FFmpeg命令执行完成, 帧 {} 耗时: {:?}", frameIndex, ffmpeg_start.elapsed());
    
    if output.status.success() {
        if !output.stdout.is_empty() {
            let base64_start = std::time::Instant::now();
            let base64_data = general_purpose::STANDARD.encode(&output.stdout);
            println!("[Rust Debug] Base64编码完成, 帧 {} 耗时: {:?}, 数据大小: {} bytes", frameIndex, base64_start.elapsed(), output.stdout.len());
            println!("[Rust Debug] 帧 {} 生成完成, 总耗时: {:?}", frameIndex, start_time.elapsed());
            Ok(format!("data:image/jpeg;base64,{}", base64_data))
        } else {
            println!("[Rust Debug] FFmpeg输出为空, 帧 {}", frameIndex);
            Err(format!("No frame data generated for frame {}", frameIndex))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        println!("[Rust Debug] FFmpeg执行失败, 帧 {}, 错误: {}", frameIndex, stderr);
        Err(format!("FFmpeg failed to generate frame {}: {}", frameIndex, stderr))
    }
}

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
    
    // First, get video duration using ffprobe (fast)
    let duration_start = std::time::Instant::now();
    println!("[Rust Debug] 开始获取视频时长 for 帧 {}", frameIndex);
    let duration_output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            &videoPath
        ])
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    if !duration_output.status.success() {
        return Err(format!("ffprobe failed: {}", String::from_utf8_lossy(&duration_output.stderr)));
    }
    
    let json_str = String::from_utf8(duration_output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    
    let json_value: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let duration = json_value["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .ok_or("Failed to extract duration from ffprobe output")?;
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
    
    // First, get video duration using ffprobe (fast)
    let duration_output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            &video_path
        ])
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    if !duration_output.status.success() {
        return Err(format!("ffprobe failed: {}", String::from_utf8_lossy(&duration_output.stderr)));
    }
    
    let json_str = String::from_utf8(duration_output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    
    let json_value: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let duration = json_value["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .ok_or("Failed to extract duration from ffprobe output")?;
    
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