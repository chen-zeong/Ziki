use std::process::Stdio;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::process::{Child};
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{Manager, Emitter};
use crate::video::{CompressionSettings, CompressionResult, get_ffmpeg_binary, get_video_metadata};
use crate::video::utils::get_ffprobe_binary;
use crate::video::utils::get_hardware_encoder_support;
use crate::video::utils::tokio_command_with_no_window;
use serde_json::json;
use tracing::{info, warn, debug};

// 任务信息结构
#[derive(Clone, Debug)]
struct TaskInfo {
    input_path: String,
    #[allow(dead_code)]
    total_duration: f64,
    app_handle: tauri::AppHandle,
    output_path: String,
    #[allow(dead_code)]
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
        "AV1" => "libsvtav1",
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
#[allow(dead_code)]
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

#[allow(non_snake_case)]
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
        // Production mode: prefer resource dir, then fallback to exe dir with both suffixed and unsuffixed names
        let resource_dir = app_handle.path().resource_dir().unwrap();
        let mut candidates: Vec<std::path::PathBuf> = Vec::new();
        candidates.push(resource_dir.join("bin").join(get_ffmpeg_binary()));
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                candidates.push(exe_dir.join(get_ffmpeg_binary()));
                #[cfg(target_os = "windows")]
                {
                    candidates.push(exe_dir.join("ffmpeg.exe"));
                }
                #[cfg(not(target_os = "windows"))]
                {
                    candidates.push(exe_dir.join("ffmpeg"));
                }
            }
        }
        candidates.into_iter().find(|p| p.exists()).unwrap_or_else(|| resource_dir.join("bin").join(get_ffmpeg_binary()))
    };
    
    println!("FFmpeg path: {:?}", ffmpeg_path);
    
    if !ffmpeg_path.exists() {
        // Build helpful error message with tried paths
        let mut tried: Vec<String> = Vec::new();
        if cfg!(debug_assertions) {
            let current_exe = std::env::current_exe().unwrap();
            let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
            tried.push(src_tauri_dir.join("bin").join(get_ffmpeg_binary()).display().to_string());
        } else {
            let resource_dir = app_handle.path().resource_dir().unwrap();
            tried.push(resource_dir.join("bin").join(get_ffmpeg_binary()).display().to_string());
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_dir) = exe_path.parent() {
                    tried.push(exe_dir.join(get_ffmpeg_binary()).display().to_string());
                    #[cfg(target_os = "windows")]
                    {
                        tried.push(exe_dir.join("ffmpeg.exe").display().to_string());
                    }
                    #[cfg(not(target_os = "windows"))]
                    {
                        tried.push(exe_dir.join("ffmpeg").display().to_string());
                    }
                }
            }
        }
        return Err(format!("FFmpeg binary not found. Tried: {}", tried.join(" | ")));
    }
    
    let original_size = std::fs::metadata(&inputPath)
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();
    
    // 使用ffprobe快速获取视频时长用于进度计算（使用打包的 ffprobe 二进制）
    let ffprobe_path = if cfg!(debug_assertions) {
        // Development mode: use bin directory relative to src-tauri
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffprobe_binary())
    } else {
        // Production mode: prefer resource dir, then fallback to exe dir with both suffixed and unsuffixed names
        let resource_dir = app_handle.path().resource_dir().unwrap();
        let mut candidates: Vec<std::path::PathBuf> = Vec::new();
        candidates.push(resource_dir.join("bin").join(get_ffprobe_binary()));
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                candidates.push(exe_dir.join(get_ffprobe_binary()));
                #[cfg(target_os = "windows")]
                {
                    candidates.push(exe_dir.join("ffprobe.exe"));
                }
                #[cfg(not(target_os = "windows"))]
                {
                    candidates.push(exe_dir.join("ffprobe"));
                }
            }
        }
        candidates.into_iter().find(|p| p.exists()).unwrap_or_else(|| resource_dir.join("bin").join(get_ffprobe_binary()))
    };
    
    println!("FFprobe path: {:?}", ffprobe_path);
    
    if !ffprobe_path.exists() {
        let mut tried: Vec<String> = Vec::new();
        if cfg!(debug_assertions) {
            let current_exe = std::env::current_exe().unwrap();
            let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
            tried.push(src_tauri_dir.join("bin").join(get_ffprobe_binary()).display().to_string());
        } else {
            let resource_dir = app_handle.path().resource_dir().unwrap();
            tried.push(resource_dir.join("bin").join(get_ffprobe_binary()).display().to_string());
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_dir) = exe_path.parent() {
                    tried.push(exe_dir.join(get_ffprobe_binary()).display().to_string());
                    #[cfg(target_os = "windows")]
                    {
                        tried.push(exe_dir.join("ffprobe.exe").display().to_string());
                    }
                    #[cfg(not(target_os = "windows"))]
                    {
                        tried.push(exe_dir.join("ffprobe").display().to_string());
                    }
                }
            }
        }
        return Err(format!("FFprobe binary not found. Tried: {}", tried.join(" | ")));
    }
    
    let duration_cmd = tokio_command_with_no_window(&ffprobe_path)
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
    
    let mut cmd = tokio_command_with_no_window(&ffmpeg_path);
    let mut args_for_log: Vec<String> = Vec::new();
    
    // Add time range parameters if specified
    if let Some(time_range) = &settings.time_range {
        if let Some(start) = time_range.start {
            cmd.arg("-ss").arg(start.to_string());
            args_for_log.push("-ss".to_string());
            args_for_log.push(start.to_string());
        }
    }
    
    cmd.arg("-i").arg(&inputPath);
    args_for_log.push("-i".to_string());
    args_for_log.push(inputPath.clone());
    
    // Add duration parameter if end time is specified
    if let Some(time_range) = &settings.time_range {
        if let Some(end) = time_range.end {
            if let Some(start) = time_range.start {
                let duration = end - start;
                if duration > 0.0 {
                    cmd.arg("-t").arg(duration.to_string());
                    args_for_log.push("-t".to_string());
                    args_for_log.push(duration.to_string());
                }
            } else {
                // If only end time is specified, treat it as duration from start
                cmd.arg("-t").arg(end.to_string());
                args_for_log.push("-t".to_string());
                args_for_log.push(end.to_string());
            }
        }
    }
    
    // 添加调试日志
    debug!("Hardware acceleration setting: {:?}", settings.hardware_acceleration);
    info!("Video codec: {}", settings.codec);
    
    // Set video codec (映射为FFmpeg编码器名称，考虑硬件加速)
    let ffmpeg_codec: String = if settings.hardware_acceleration == Some("gpu".to_string()) {
        info!("Using GPU acceleration");
         // 检查当前平台并使用相应的硬件加速编码器
         if cfg!(target_os = "macos") {
             // Intel 架构禁用硬件加速，ARM 使用 VideoToolbox
             if cfg!(target_arch = "x86_64") {
                    warn!("Platform: macOS (Intel), hardware acceleration disabled; falling back to software");
                 map_codec_to_ffmpeg(&settings.codec).to_string()
             } else {
                    info!("Platform: macOS (ARM), using VideoToolbox");
                 // macOS 使用 VideoToolbox（ARM）
                 match settings.codec.as_str() {
                        "H.264" | "libx264" | "h264" => {
                            info!("Selected h264_videotoolbox encoder");
                         "h264_videotoolbox".to_string()
                     },
                        "H.265" | "HEVC" | "libx265" | "hevc" => {
                            info!("Selected hevc_videotoolbox encoder");
                         "hevc_videotoolbox".to_string()
                     },
                        "ProRes" | "prores" => {
                            info!("Selected prores_videotoolbox encoder");
                         "prores_videotoolbox".to_string()
                     },
                     _ => {
                            warn!("Codec {} not supported for hardware acceleration, falling back to software", settings.codec);
                         map_codec_to_ffmpeg(&settings.codec).to_string() // 回退到软件编码
                     }
                 }
             }
         } else if cfg!(target_os = "windows") {
                info!("Platform: Windows, selecting HW encoder by availability");
             // Windows: 从检测到的“可用硬件编码器”中选择当前 codec 对应的一个，而不是按厂商顺序逐个尝试
             let base = match settings.codec.as_str() {
                 "H.264" | "libx264" | "h264" => "h264",
                 "H.265" | "HEVC" | "libx265" | "hevc" => "hevc",
                 "AV1" | "libsvtav1" | "av1" => "av1",
                 _ => "",
             };
             let mut selected: Option<String> = None;
             if !base.is_empty() {
                 if let Ok(hs) = get_hardware_encoder_support(app_handle.clone()) {
                     // 过滤出支持且与当前 codec 匹配的编码器，例如 h264_amf / h264_nvenc / h264_qsv
                      let candidates: Vec<_> = hs
                          .encoders
                          .iter()
                          .filter(|e| e.supported && e.codec == base)
                          .collect();
                      debug!("Detected HW encoders (all): {:?}", hs.encoders.iter().map(|e| (e.name.clone(), e.codec.clone(), e.supported, e.vendor.clone())).collect::<Vec<_>>());
                      debug!("Available HW encoders for {}: {:?}", base, candidates.iter().map(|e| (&e.name, &e.vendor)).collect::<Vec<_>>());
                      // 若有多个可用，按优先级 NVIDIA > AMD > Intel 选择
                      if let Some(best) = candidates.into_iter().max_by_key(|e| match e.vendor.as_str() {
                          "NVIDIA" => 3,
                          "AMD" => 2,
                          "Intel" => 1,
                          _ => 0,
                      }) {
                          selected = Some(best.name.clone());
                      }
                 } else {
                        warn!("Hardware support detection failed; falling back to defaults");
                 }
             }
             match selected {
                 Some(s) => {
                        info!("Selected Windows HW encoder: {}", s);
                     s
                 }
                 None => {
                    warn!("Codec {} not supported by available HW encoders on Windows, falling back to software", settings.codec);
                    map_codec_to_ffmpeg(&settings.codec).to_string() // 回退到软件编码
                 }
             }
         } else {
           warn!("Platform not supported for hardware acceleration, falling back to software");
             // 其他平台回退到软件编码
             map_codec_to_ffmpeg(&settings.codec).to_string()
         }
     } else {
            info!("Using CPU encoding");
         map_codec_to_ffmpeg(&settings.codec).to_string()
     };
     
    println!("Final FFmpeg codec: {}", ffmpeg_codec);
    cmd.arg("-c:v").arg(&ffmpeg_codec);
    args_for_log.push("-c:v".to_string());
    args_for_log.push(ffmpeg_codec.clone());
    
    // Add H.265 specific tag for better compatibility
    if ffmpeg_codec.contains("265") || ffmpeg_codec.contains("hevc") {
        cmd.arg("-tag:v").arg("hvc1");
        args_for_log.push("-tag:v".to_string());
        args_for_log.push("hvc1".to_string());
    }
    
    // Set pixel format based on bit depth
    println!("Received bit_depth: {:?}", settings.bit_depth);
    // For VideoToolbox (macOS), use p010le for >=10-bit and nv12 for 8-bit
    let is_videotoolbox = ffmpeg_codec.contains("videotoolbox");
    let pix_fmt = if is_videotoolbox {
        match settings.bit_depth {
            Some(12) => {
                println!("hevc_videotoolbox does not support 12-bit; falling back to 10-bit p010le");
                "p010le"
            },
            Some(10) => "p010le",
            _ => "nv12", // default 8-bit for VideoToolbox
        }
    } else {
        match settings.bit_depth {
            Some(10) => "yuv420p10le",
            Some(12) => "yuv420p12le",
            _ => "yuv420p", // Default to 8-bit
        }
    };
    println!("Using pix_fmt: {}", pix_fmt);
    cmd.arg("-pix_fmt").arg(pix_fmt);
    args_for_log.push("-pix_fmt".to_string());
    args_for_log.push(pix_fmt.to_string());

    // For hevc_videotoolbox, set main10 profile when requesting >=10-bit
    if is_videotoolbox {
        if let Some(depth) = settings.bit_depth {
            if depth >= 10 {
                println!("Setting VideoToolbox profile to main10 for {}-bit request", depth);
                cmd.arg("-profile:v").arg("main10");
                args_for_log.push("-profile:v".to_string());
                args_for_log.push("main10".to_string());
            }
        }
    }
    
    // Set quality (CRF or bitrate)
    match settings.quality_type.as_str() {
        "crf" => {
            if let Some(crf) = settings.crf_value {
                cmd.arg("-crf").arg(crf.to_string());
                args_for_log.push("-crf".to_string());
                args_for_log.push(crf.to_string());
            }
        }
        "bitrate" => {
            if let Some(bitrate) = &settings.bitrate {
                cmd.arg("-b:v").arg(bitrate);
                args_for_log.push("-b:v".to_string());
                args_for_log.push(bitrate.clone());
            }
        }
        "qv" => {
            let q = settings.qv_value.unwrap_or(80).min(100);
            cmd.arg("-q:v").arg(q.to_string());
            args_for_log.push("-q:v".to_string());
            args_for_log.push(q.to_string());
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

    // Ensure 10-bit is preserved through filters when using VideoToolbox
    if is_videotoolbox {
        if let Some(depth) = settings.bit_depth {
            if depth >= 10 {
                if scale_filter.is_empty() {
                    scale_filter = "format=p010le".to_string();
                } else {
                    scale_filter = format!("{},format=p010le", scale_filter);
                }
            }
        }
    }
    
    if !scale_filter.is_empty() {
        println!("Using filter chain: {}", scale_filter);
        cmd.arg("-vf").arg(scale_filter.clone());
        args_for_log.push("-vf".to_string());
        args_for_log.push(scale_filter);
    }
    
    // Set audio codec based on output format
    if outputPath.to_lowercase().ends_with(".webm") {
        // For WebM format, use specific audio encoding parameters
        cmd.arg("-c:a").arg("libopus");
        cmd.arg("-b:a").arg("128k");
        cmd.arg("-c:s").arg("webvtt");
        args_for_log.push("-c:a".to_string());
        args_for_log.push("libopus".to_string());
        args_for_log.push("-b:a".to_string());
        args_for_log.push("128k".to_string());
        args_for_log.push("-c:s".to_string());
        args_for_log.push("webvtt".to_string());
    } else {
        // For other formats, copy audio and subtitle streams
        cmd.arg("-c:a").arg("copy");
        cmd.arg("-c:s").arg("copy");
        args_for_log.push("-c:a".to_string());
        args_for_log.push("copy".to_string());
        args_for_log.push("-c:s".to_string());
        args_for_log.push("copy".to_string());
    }
    
    cmd.arg("-y").arg(&outputPath);
    args_for_log.push("-y".to_string());
    args_for_log.push(outputPath.clone());
    
    // 添加进度输出参数 - 输出到stdout
    cmd.arg("-progress").arg("pipe:1");
    args_for_log.push("-progress".to_string());
    args_for_log.push("pipe:1".to_string());
    
    // 发送最终命令事件到前端
    let args_joined = args_for_log
        .iter()
        .map(|a| if a.contains(' ') { format!("\"{}\"", a) } else { a.clone() })
        .collect::<Vec<_>>()
        .join(" ");
    let _ = app_handle.emit(&format!("compression-command-{}", taskId), json!({
        "taskId": taskId,
        "command": format!("{:?} {}", ffmpeg_path, args_joined),
        "args": args_for_log,
    }));
    
    println!("Executing FFmpeg command: {:?} {}", ffmpeg_path, args_joined);
    
    // 使用管道方式执行命令以实时监控进度
    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg process: {}", e))?;

    // 获取stdout用于进度监控
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);

    // 捕获stderr用于错误详情
    let stderr = child.stderr.take().unwrap();
    let stderr_reader = BufReader::new(stderr);
    let stderr_acc: Arc<tokio::sync::Mutex<String>> = Arc::new(Mutex::new(String::new()));
    let stderr_acc_clone = stderr_acc.clone();
    let stderr_handle = tokio::spawn(async move {
        let mut lines = stderr_reader.lines();
        while let Some(line) = lines.next_line().await.unwrap_or(None) {
            // println!("FFmpeg stderr: {}", line); // muted noisy stderr lines
            let mut acc = stderr_acc_clone.lock().await;
            acc.push_str(&line);
            acc.push('\n');
        }
    });

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
    let task_id_clone = taskId.clone();
    let display_name = if cfg!(target_os = "windows") {
        std::path::Path::new(&inputPath)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(&taskId)
            .to_string()
    } else {
        taskId.clone()
    };
    let display_name_clone = display_name.clone();
    
    let progress_handle = tokio::spawn(async move {
        let mut lines = reader.lines();
        println!("🚀 Starting progress monitoring for task: {}", display_name_clone);
        while let Some(line) = lines.next_line().await.unwrap_or(None) {
            // println!("FFmpeg stdout line: {}", line); // muted noisy stdout lines
            // 解析进度信息
            if let Some(progress) = parse_ffmpeg_progress(&line, actual_compression_duration) {
                println!("✅ Parsed progress: {}% for {}", progress, display_name_clone);
                // 发送进度事件到前端 - 使用任务特定的事件名称
                let event_name = format!("compression-progress-{}", task_id_clone);
                let emit_result = app_handle_clone.emit(&event_name, json!({
                    "taskId": task_id_clone,
                    "progress": progress
                }));
                if let Err(e) = emit_result {
                    println!("❌ Failed to emit progress event: {}", e);
                } else {
                    println!("📡 Progress event emitted successfully: {}%", progress);
                }
            }
        }
        println!("🏁 Progress monitoring ended for task: {}", display_name_clone);
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
                let _ = app_handle.emit(&format!("compression-error-{}", taskId), json!({
                    "taskId": taskId,
                    "error": "Process was interrupted"
                }));
                return Err("Process was interrupted".to_string());
            }
        }
    };

    // 等待进度监控线程完成
    let _ = progress_handle.await;
    // 等待stderr读取完成
    let _ = stderr_handle.await;
    
    println!("FFmpeg exit status: {}", status);

    if status.success() {
        let compressed_size = std::fs::metadata(&outputPath)
            .map(|m| m.len())
            .ok();
        
        // 获取压缩后文件的元数据
        let compressed_metadata = match get_video_metadata(app_handle.clone(), outputPath.clone()) {
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
        // 获取stderr详情
        let stderr_text = {
            let acc = stderr_acc.lock().await;
            acc.clone()
        };
        let err_msg = format!("FFmpeg process failed with exit code: {}", status);
        let _ = app_handle.emit(&format!("compression-error-{}", taskId), json!({
            "taskId": taskId,
            "error": err_msg,
            "stderr": stderr_text
        }));
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

#[cfg(windows)]
fn suspend_process(pid: u32) -> Result<(), String> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Thread32First, Thread32Next, THREADENTRY32, TH32CS_SNAPTHREAD};
    use windows_sys::Win32::System::Threading::{OpenThread, SuspendThread, THREAD_SUSPEND_RESUME};

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return Err("CreateToolhelp32Snapshot failed".to_string());
        }

        let mut entry: THREADENTRY32 = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        let mut has_thread = Thread32First(snapshot, &mut entry) != 0;
        while has_thread {
            if entry.th32OwnerProcessID == pid {
                let h_thread = OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID);
                if h_thread != std::ptr::null_mut() {
                    let res = SuspendThread(h_thread);
                    CloseHandle(h_thread);
                    if res == u32::MAX {
                        CloseHandle(snapshot);
                        return Err(format!("SuspendThread failed for TID {}", entry.th32ThreadID));
                    }
                }
            }
            has_thread = Thread32Next(snapshot, &mut entry) != 0;
        }
        CloseHandle(snapshot);
    }
    Ok(())
}

#[cfg(windows)]
fn resume_process(pid: u32) -> Result<(), String> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, Thread32First, Thread32Next, THREADENTRY32, TH32CS_SNAPTHREAD};
    use windows_sys::Win32::System::Threading::{OpenThread, ResumeThread, THREAD_SUSPEND_RESUME};

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return Err("CreateToolhelp32Snapshot failed".to_string());
        }

        let mut entry: THREADENTRY32 = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        let mut has_thread = Thread32First(snapshot, &mut entry) != 0;
        while has_thread {
            if entry.th32OwnerProcessID == pid {
                let h_thread = OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID);
                if h_thread != std::ptr::null_mut() {
                    let res = ResumeThread(h_thread);
                    CloseHandle(h_thread);
                    if res == u32::MAX {
                        CloseHandle(snapshot);
                        return Err(format!("ResumeThread failed for TID {}", entry.th32ThreadID));
                    }
                }
            }
            has_thread = Thread32Next(snapshot, &mut entry) != 0;
        }
        CloseHandle(snapshot);
    }
    Ok(())
}

#[allow(non_snake_case)]
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
            #[cfg(windows)]
            {
                match suspend_process(pid) {
                    Ok(_) => {
                        println!("Successfully suspended task: {} (PID: {})", taskId, pid);
                        Ok(())
                    }
                    Err(e) => {
                        println!("Failed to suspend task {}: {}", taskId, e);
                        Err(format!("Failed to pause task: {}", e))
                    }
                }
            }
            #[cfg(not(any(unix, windows)))]
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

#[allow(non_snake_case)]
#[allow(unused_variables)]
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
            #[cfg(windows)]
            {
                match resume_process(pid) {
                    Ok(_) => {
                        println!("Successfully resumed task: {} (PID: {})", taskId, pid);
                    }
                    Err(e) => {
                        println!("Failed to resume task {}: {}", taskId, e);
                        return Err(format!("Failed to resume task: {}", e));
                    }
                }
            }
            #[cfg(not(any(unix, windows)))]
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
             let compressed_metadata = get_video_metadata(task_info.app_handle.clone(), task_info.output_path.clone()).ok();

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
        
        let compressed_metadata = match get_video_metadata(task_info.app_handle.clone(), task_info.output_path.clone()) {
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
#[allow(non_snake_case)]
pub async fn delete_task(taskId: String) -> Result<(), String> {
  println!("Deleting task: {}", taskId);

  // 从运行中的进程管理器中移除并尝试强制终止进程
  let process_manager = get_process_manager();
  let mut processes = process_manager.lock().await;

  if let Some(mut child) = processes.remove(&taskId) {
    // 进程存在，尝试强制终止
    #[cfg(unix)]
    {
      if let Err(e) = child.kill().await {
        println!("Failed to kill task process {}: {}", taskId, e);
      } else {
        println!("Successfully killed task process: {}", taskId);
      }
    }
    #[cfg(not(unix))]
    {
      if let Err(e) = child.kill().await {
        println!("Failed to kill task process {} on this platform: {}", taskId, e);
      } else {
        println!("Successfully killed task process: {}", taskId);
      }
    }
  } else {
    println!(
      "Task {} not found in running processes (it may have already finished, been paused, or removed).",
      taskId
    );
  }
  drop(processes);

  // 从任务信息管理器中删除记录，释放资源
  let task_info_manager = get_task_info_manager();
  let mut task_infos = task_info_manager.lock().await;
  if task_infos.remove(&taskId).is_some() {
    println!("Removed task info for {}", taskId);
  }

  Ok(())
}

// ======================
// New: terminate all tasks
// ======================
/// 终止所有正在运行的压缩进程，并清理任务信息。
pub async fn terminate_all_running_processes() {
    println!("[Shutdown] Terminating all running FFmpeg processes...");
    // 终止进程
    {
        let process_manager = get_process_manager();
        let mut processes = process_manager.lock().await;
        // 使用drain安全地取出所有子进程
        let mut killed_count = 0usize;
        let mut failed: Vec<(String, String)> = Vec::new();
        for (task_id, mut child) in processes.drain() {
            match child.kill().await {
                Ok(_) => {
                    println!("[Shutdown] Killed task process: {}", task_id);
                    killed_count += 1;
                }
                Err(e) => {
                    println!("[Shutdown] Failed to kill task {}: {}", task_id, e);
                    failed.push((task_id, e.to_string()));
                }
            }
        }
        println!("[Shutdown] Kill summary -> success: {}, failed: {}", killed_count, failed.len());
        if !failed.is_empty() {
            for (id, err) in failed { println!("[Shutdown]   - {}: {}", id, err); }
        }
    }
    // 在清空任务信息之前，向前端发送取消事件
    let snapshot: Vec<(String, tauri::AppHandle)> = {
        let task_info_manager = get_task_info_manager();
        let task_infos = task_info_manager.lock().await;
        task_infos
            .iter()
            .map(|(id, info)| (id.clone(), info.app_handle.clone()))
            .collect()
    };
    for (task_id, app_handle) in snapshot {
        let event_name = format!("compression-cancelled-{}", task_id);
        let _ = app_handle.emit(&event_name, json!({
            "taskId": task_id,
            "status": "cancelled"
        }));
    }
    // 清空任务信息
    {
        let task_info_manager = get_task_info_manager();
        let mut task_infos = task_info_manager.lock().await;
        task_infos.clear();
        println!("[Shutdown] Cleared task infos");
    }
}

/// 可选：暴露为前端可调用的命令
#[tauri::command]
pub async fn terminate_all_tasks() -> Result<(), String> {
    terminate_all_running_processes().await;
    Ok(())
}