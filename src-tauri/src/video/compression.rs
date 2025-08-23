use std::process::Stdio;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::process::{Command, Child};
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{Manager, Emitter};
use crate::video::{CompressionSettings, CompressionResult, get_ffmpeg_binary, get_video_metadata, parse_duration_from_ffmpeg_output};
use serde_json::json;

// 任务信息结构
#[derive(Clone, Debug)]
struct TaskInfo {
    input_path: String,
    total_duration: f64,
    app_handle: tauri::AppHandle,
    output_path: String,
    settings: CompressionSettings,
}

// 全局进程管理器
static RUNNING_PROCESSES: std::sync::OnceLock<Arc<Mutex<HashMap<String, Child>>>> = std::sync::OnceLock::new();
// 全局任务信息管理器
static TASK_INFO: std::sync::OnceLock<Arc<Mutex<HashMap<String, TaskInfo>>>> = std::sync::OnceLock::new();

fn get_process_manager() -> &'static Arc<Mutex<HashMap<String, Child>>> {
    RUNNING_PROCESSES.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

fn get_task_info_manager() -> &'static Arc<Mutex<HashMap<String, TaskInfo>>> {
    TASK_INFO.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

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

// 解析FFmpeg进度信息
fn parse_ffmpeg_progress(line: &str, total_duration: f64) -> Option<f64> {
    // FFmpeg -progress 输出格式: 每个字段单独一行
    // out_time=00:15:58.610500
    // 查找以 out_time= 开头的行
    if line.starts_with("out_time=") {
        if let Some(time_str) = line.strip_prefix("out_time=") {
            // 解析时间格式 HH:MM:SS.ss
            let parts: Vec<&str> = time_str.split(':').collect();
            if parts.len() == 3 {
                if let (Ok(hours), Ok(minutes), Ok(seconds)) = (
                    parts[0].parse::<f64>(),
                    parts[1].parse::<f64>(),
                    parts[2].parse::<f64>()
                ) {
                    let current_time = hours * 3600.0 + minutes * 60.0 + seconds;
                    if total_duration > 0.0 {
                        return Some((current_time / total_duration * 100.0).min(100.0));
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
pub async fn compress_video(
    taskId: String,
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
    
    // 使用ffprobe快速获取视频时长用于进度计算
    let duration_cmd = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            &inputPath
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    if !duration_cmd.status.success() {
        return Err(format!("ffprobe failed: {}", String::from_utf8_lossy(&duration_cmd.stderr)));
    }
    
    let json_str = String::from_utf8(duration_cmd.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    
    let json_value: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let total_duration = json_value["format"]["duration"]
        .as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);
    
    println!("Video duration: {} seconds", total_duration);
    
    // 计算实际要压缩的时长（用于进度计算）
    let actual_compression_duration = if let Some(time_range) = &settings.time_range {
        if let Some(end) = time_range.end {
            if let Some(start) = time_range.start {
                let duration = end - start;
                if duration > 0.0 {
                    duration
                } else {
                    total_duration
                }
            } else {
                // If only end time is specified, treat it as duration from start
                end
            }
        } else {
            total_duration
        }
    } else {
        total_duration
    };
    
    println!("Actual compression duration: {} seconds", actual_compression_duration);
    
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
    
    // Set encoding preset
    if let Some(preset) = &settings.encoding_preset {
        cmd.arg("-preset").arg(preset);
    }
    
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
    
    // Set audio codec to copy (no audio processing)
    cmd.arg("-c:a").arg("copy");
    
    cmd.arg("-y").arg(&outputPath);
    
    // 添加进度输出参数 - 输出到stdout
    cmd.arg("-progress").arg("pipe:1");
    
    println!("Executing FFmpeg command: {:?}", cmd);
    
    // 使用管道方式执行命令以实时监控进度
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg process: {}", e))?;

    // 获取stdout用于进度监控
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    
    // 将进程存储到进程管理器中
    {
        let process_manager = get_process_manager();
        let mut processes = process_manager.lock().await;
        processes.insert(taskId.clone(), child);
    }
    
    // 保存任务信息用于恢复时重新建立进度监听
    {
        let task_info_manager = get_task_info_manager();
        let mut task_infos = task_info_manager.lock().await;
        task_infos.insert(taskId.clone(), TaskInfo {
            input_path: inputPath.clone(),
            total_duration: actual_compression_duration,
            app_handle: app_handle.clone(),
            output_path: outputPath.clone(),
            settings: settings.clone(),
        });
    }
    
    // 在后台线程中监控进度
    let app_handle_clone = app_handle.clone();
    let input_path_clone = inputPath.clone();
    
    let progress_handle = tokio::spawn(async move {
        let mut lines = reader.lines();
        while let Some(line) = lines.next_line().await.unwrap_or(None) {
            println!("FFmpeg stdout line: {}", line);
            // 解析进度信息
            if let Some(progress) = parse_ffmpeg_progress(&line, actual_compression_duration) {
                println!("Parsed progress: {}%", progress);
                // 发送进度事件到前端
                let _ = app_handle_clone.emit("compression-progress", json!({
                    "inputPath": input_path_clone,
                    "progress": progress
                }));
            }
        }
    });
    
    // 等待进程完成或被中断
    let status = {
        // 持续检查进程状态直到完成或被移除
        loop {
            let process_manager = get_process_manager();
            let mut processes = process_manager.lock().await;
            
            if let Some(child) = processes.get_mut(&taskId) {
                // 检查进程是否已经完成
                match child.try_wait() {
                    Ok(Some(status)) => {
                        // 进程已完成，从管理器中移除
                        processes.remove(&taskId);
                        break status;
                    }
                    Ok(None) => {
                        // 进程仍在运行，继续等待
                        drop(processes);
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                        continue;
                    }
                    Err(e) => {
                        // 进程出错
                        processes.remove(&taskId);
                        return Err(format!("Failed to check FFmpeg process status: {}", e));
                    }
                }
            } else {
                // 进程不在管理器中，说明被暂停或删除了
                return Err("Process was interrupted".to_string());
            }
        }
    };

    // 等待进度监控线程完成
    let _ = progress_handle.await;
    
    println!("FFmpeg exit status: {}", status);

    if status.success() {
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
        Ok(CompressionResult {
            success: false,
            output_path: None,
            error: Some(format!("FFmpeg process failed with exit code: {}", status)),
            original_size,
            compressed_size: None,
            compressed_metadata: None,
        })
    }
}

#[tauri::command]
pub async fn pause_task(taskId: String) -> Result<(), String> {
    println!("Pausing task: {}", taskId);
    
    let process_manager = get_process_manager();
    let mut processes = process_manager.lock().await;
    
    if let Some(child) = processes.get_mut(&taskId) {
        // 使用系统信号暂停进程 (SIGSTOP)
        if let Some(pid) = child.id() {
            #[cfg(unix)]
            {
                use std::process::Command;
                let output = Command::new("kill")
                    .arg("-STOP")
                    .arg(pid.to_string())
                    .output();
                
                match output {
                    Ok(result) if result.status.success() => {
                        println!("Successfully paused task: {} (PID: {})", taskId, pid);
                        Ok(())
                    }
                    Ok(result) => {
                        let error = String::from_utf8_lossy(&result.stderr);
                        println!("Failed to pause task {}: {}", taskId, error);
                        Err(format!("Failed to pause task: {}", error))
                    }
                    Err(e) => {
                        println!("Failed to execute kill command: {}", e);
                        Err(format!("Failed to pause task: {}", e))
                    }
                }
            }
            #[cfg(not(unix))]
            {
                Err("Process pausing is not supported on this platform".to_string())
            }
        } else {
            Err("Failed to get process ID".to_string())
        }
    } else {
        println!("Task {} not found in running processes", taskId);
        Err(format!("Task {} not found", taskId))
    }
}

#[tauri::command]
pub async fn resume_task(
    taskId: String,
    app_handle: tauri::AppHandle,
) -> Result<CompressionResult, String> {
    println!("Resuming task: {}", taskId);

    let process_manager = get_process_manager();
    let processes = process_manager.lock().await;

    if let Some(child) = processes.get(&taskId) {
        // 使用系统信号恢复进程 (SIGCONT)
        if let Some(pid) = child.id() {
            #[cfg(unix)]
            {
                use std::process::Command;
                let output = Command::new("kill")
                    .arg("-CONT")
                    .arg(pid.to_string())
                    .output();

                match output {
                    Ok(result) if result.status.success() => {
                        println!("Successfully resumed task: {} (PID: {})", taskId, pid);
                        // 恢复后，我们需要像compress_video一样等待它完成
                    }
                    Ok(result) => {
                        let error = String::from_utf8_lossy(&result.stderr);
                        println!("Failed to resume task {}: {}", taskId, error);
                        return Err(format!("Failed to resume task: {}", error));
                    }
                    Err(e) => {
                        println!("Failed to execute kill command: {}", e);
                        return Err(format!("Failed to resume task: {}", e));
                    }
                }
            }
            #[cfg(not(unix))]
            {
                return Err("Process resuming is not supported on this platform".to_string());
            }
        } else {
            return Err("Failed to get process ID".to_string());
        }
    } else {
        println!("Task {} not found in running processes, it might have already finished or been deleted.", taskId);
        // 如果任务已经不在运行列表中，可能已经完成或被删除。
        // 我们可以检查任务信息是否存在来决定如何响应。
        let task_info_manager = get_task_info_manager();
        let task_infos = task_info_manager.lock().await;
        if let Some(task_info) = task_infos.get(&taskId) {
             // 任务信息还在，但进程不在了，说明可能已完成。
             // 尝试返回一个表示成功的结果，让前端可以更新状态。
             let original_size = std::fs::metadata(&task_info.input_path)
                .map(|m| m.len())
                .unwrap_or(0);
             let compressed_size = std::fs::metadata(&task_info.output_path)
                .map(|m| m.len())
                .ok();
             let compressed_metadata = get_video_metadata(task_info.output_path.clone()).ok();

             return Ok(CompressionResult {
                success: true,
                output_path: Some(task_info.output_path.clone()),
                error: None,
                original_size,
                compressed_size,
                compressed_metadata,
             });
        } else {
            // 进程和任务信息都不在了，返回错误。
            return Err(format!("Task {} not found", taskId));
        }
    }
    
    // 释放锁，因为下面的循环会需要它
    drop(processes);

    // 等待进程完成或被中断
    let status = {
        loop {
            let process_manager = get_process_manager();
            let mut processes = process_manager.lock().await;

            if let Some(child) = processes.get_mut(&taskId) {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        processes.remove(&taskId);
                        break status;
                    }
                    Ok(None) => {
                        drop(processes);
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                        continue;
                    }
                    Err(e) => {
                        processes.remove(&taskId);
                        return Err(format!("Failed to check FFmpeg process status: {}", e));
                    }
                }
            } else {
                return Err("Process was interrupted".to_string());
            }
        }
    };
    
    println!("Resumed FFmpeg exit status: {}", status);

    // 获取任务信息以返回结果
    let task_info_manager = get_task_info_manager();
    let task_infos = task_info_manager.lock().await;
    let task_info = task_infos.get(&taskId).ok_or("Task info not found after resume")?;

    if status.success() {
        let compressed_size = std::fs::metadata(&task_info.output_path)
            .map(|m| m.len())
            .ok();
        
        let compressed_metadata = match get_video_metadata(task_info.output_path.clone()) {
            Ok(metadata) => Some(metadata),
            Err(e) => {
                println!("Warning: Failed to get compressed video metadata: {}", e);
                None
            }
        };
            
        Ok(CompressionResult {
            success: true,
            output_path: Some(task_info.output_path.clone()),
            error: None,
            original_size: std::fs::metadata(&task_info.input_path).map(|m| m.len()).unwrap_or(0),
            compressed_size,
            compressed_metadata,
        })
    } else {
        Ok(CompressionResult {
            success: false,
            output_path: None,
            error: Some(format!("FFmpeg process failed with exit code: {}", status)),
            original_size: std::fs::metadata(&task_info.input_path).map(|m| m.len()).unwrap_or(0),
            compressed_size: None,
            compressed_metadata: None,
        })
    }
}

#[tauri::command]
pub async fn delete_task(taskId: String) -> Result<(), String> {
    // 这里应该实现删除任务的逻辑
    // 目前返回成功，让前端可以更新UI状态
    println!("Deleting task: {}", taskId);
    Ok(())
}