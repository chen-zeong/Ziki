use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use crate::video::types::VideoMetadata;

pub fn get_desktop_directory() -> Option<PathBuf> {
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

pub fn get_ffmpeg_binary() -> &'static str {
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

pub fn parse_duration_from_ffmpeg_output(output: &str) -> Option<f64> {
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

pub fn parse_time_to_seconds(time_str: &str) -> Option<f64> {
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
pub fn get_desktop_path() -> Result<String, String> {
    let desktop_path = get_desktop_directory()
        .ok_or("Failed to get desktop path")?;
    
    let zipzap_path = desktop_path.join("zipzap");
    
    // Create zipzap directory if it doesn't exist
    if !zipzap_path.exists() {
        std::fs::create_dir_all(&zipzap_path)
            .map_err(|e| format!("Failed to create zipzap directory: {}", e))?;
    }
    
    zipzap_path.to_str()
        .ok_or("Failed to convert path to string".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
pub fn get_file_size(filePath: String) -> Result<u64, String> {
    std::fs::metadata(&filePath)
        .map_err(|e| format!("Failed to get file metadata: {}", e))
        .map(|metadata| metadata.len())
}

#[tauri::command]
pub fn get_platform() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    return Ok("macos".to_string());
    
    #[cfg(target_os = "windows")]
    return Ok("windows".to_string());
    
    #[cfg(target_os = "linux")]
    return Ok("linux".to_string());
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return Ok("unknown".to_string());
}

#[tauri::command]
pub async fn open_output_folder(folder_path: String) -> Result<(), String> {
    let path = std::path::Path::new(&folder_path);
    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&folder_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn get_video_metadata(videoPath: String) -> Result<VideoMetadata, String> {
    let ffprobe_binary = get_ffprobe_binary();
    
    let output = Command::new(ffprobe_binary)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            &videoPath
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("ffprobe failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    let json_str = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    
    parse_ffprobe_json(&json_str)
}

pub fn get_ffprobe_binary() -> &'static str {
    "ffprobe"
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct Codec {
    pub name: String,
    pub codec_type: String, // "encoder" or "decoder"
    pub media_type: String, // "video" or "audio"
    pub description: String,
    pub hardware_type: Option<String>, // Some("Apple VideoToolbox") or None for software
}

#[tauri::command]
pub fn detect_all_codecs(app_handle: tauri::AppHandle) -> Result<Vec<Codec>, String> {
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
    
    println!("FFmpeg path for codec detection: {:?}", ffmpeg_path);
    
    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }
    
    let mut all_codecs = Vec::new();
    
    // 获取所有编码器
    let encoders_output = Command::new(&ffmpeg_path)
        .args(["-encoders"])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg -encoders: {}", e))?;
    
    if encoders_output.status.success() {
        let output_str = String::from_utf8(encoders_output.stdout)
            .map_err(|e| format!("Failed to parse ffmpeg output: {}", e))?;
        
        for line in output_str.lines() {
            if line.starts_with(" V") || line.starts_with(" A") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let codec_name = parts[1].to_string();
                    let description = parts[2..].join(" ");
                    let media_type = if line.starts_with(" V") { "video" } else { "audio" };
                    
                    // 检测硬件加速类型
                    let hardware_type = if codec_name.contains("videotoolbox") || codec_name.contains("vt_") {
                        Some("Apple VideoToolbox".to_string())
                    } else if codec_name.contains("nvenc") || codec_name.contains("cuda") {
                        Some("NVIDIA NVENC".to_string())
                    } else if codec_name.contains("qsv") {
                        Some("Intel Quick Sync Video".to_string())
                    } else if codec_name.contains("amf") {
                        Some("AMD AMF".to_string())
                    } else {
                        None
                    };
                    
                    all_codecs.push(Codec {
                        name: codec_name,
                        codec_type: "encoder".to_string(),
                        media_type: media_type.to_string(),
                        description,
                        hardware_type,
                    });
                }
            }
        }
    }
    
    // 获取所有解码器
    let decoders_output = Command::new(&ffmpeg_path)
        .args(["-decoders"])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg -decoders: {}", e))?;
    
    if decoders_output.status.success() {
        let output_str = String::from_utf8(decoders_output.stdout)
            .map_err(|e| format!("Failed to parse ffmpeg output: {}", e))?;
        
        for line in output_str.lines() {
            if line.starts_with(" V") || line.starts_with(" A") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let codec_name = parts[1].to_string();
                    let description = parts[2..].join(" ");
                    let media_type = if line.starts_with(" V") { "video" } else { "audio" };
                    
                    // 检测硬件加速类型
                    let hardware_type = if codec_name.contains("videotoolbox") || codec_name.contains("vt_") {
                        Some("Apple VideoToolbox".to_string())
                    } else if codec_name.contains("cuvid") || codec_name.contains("cuda") {
                        Some("NVIDIA CUVID".to_string())
                    } else if codec_name.contains("qsv") {
                        Some("Intel Quick Sync Video".to_string())
                    } else if codec_name.contains("amf") {
                        Some("AMD AMF".to_string())
                    } else {
                        None
                    };
                    
                    all_codecs.push(Codec {
                        name: codec_name,
                        codec_type: "decoder".to_string(),
                        media_type: media_type.to_string(),
                        description,
                        hardware_type,
                    });
                }
            }
        }
    }
    
    Ok(all_codecs)
}

fn parse_ffprobe_json(json_str: &str) -> Result<VideoMetadata, String> {
    use serde_json::Value;
    
    let json: Value = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let format = json["format"].as_object()
        .ok_or("No format information found")?;
    
    let streams = json["streams"].as_array()
        .ok_or("No streams information found")?;
    
    // 查找视频流
    let video_stream = streams.iter()
        .find(|stream| stream["codec_type"].as_str() == Some("video"))
        .ok_or("No video stream found")?;
    
    // 查找音频流
    let audio_stream = streams.iter()
        .find(|stream| stream["codec_type"].as_str() == Some("audio"));
    
    // 获取格式信息
    let format_name = format["format_name"].as_str()
        .unwrap_or("unknown")
        .split(',').next().unwrap_or("unknown");
    
    // 根据文件扩展名和格式名称确定正确的容器格式
    let file_extension = format["filename"].as_str()
        .and_then(|path| std::path::Path::new(path).extension())
        .and_then(|ext| ext.to_str())
        .unwrap_or("");
    
    let container_format = match file_extension.to_lowercase().as_str() {
        "mp4" => "MP4".to_string(),
        "mov" => "MOV".to_string(), 
        "mkv" => "MKV".to_string(),
        "avi" => "AVI".to_string(),
        "webm" => "WEBM".to_string(),
        "flv" => "FLV".to_string(),
        "wmv" => "WMV".to_string(),
        "m4v" => "M4V".to_string(),
        "ts" => "TS".to_string(),
        "m2ts" => "M2TS".to_string(),
        "3gp" => "3GP".to_string(),
        _ => {
            // 如果扩展名不匹配，则根据格式名称推断
            match format_name.to_lowercase().as_str() {
                "mov" | "mp4" => "MP4".to_string(), // 默认优先使用MP4
                "matroska" | "mkv" => "MKV".to_string(),
                "avi" => "AVI".to_string(),
                "webm" => "WEBM".to_string(),
                "flv" => "FLV".to_string(),
                "asf" | "wmv" => "WMV".to_string(),
                "mpegts" => "TS".to_string(),
                _ => format_name.to_uppercase()
            }
        }
    };
    
    // 获取视频编码
    let video_codec = video_stream["codec_name"].as_str()
        .unwrap_or("unknown")
        .to_uppercase();
    
    // 获取音频编码
    let audio_codec = if let Some(audio) = audio_stream {
        audio["codec_name"].as_str().unwrap_or("none").to_uppercase()
    } else {
        "none".to_string()
    };
    
    // 获取分辨率
    let width = video_stream["width"].as_u64().unwrap_or(0);
    let height = video_stream["height"].as_u64().unwrap_or(0);
    let resolution = format!("{}x{}", width, height);
    
    // 获取码率
    let bitrate = format["bit_rate"].as_str()
        .and_then(|br| br.parse::<u64>().ok())
        .map(|br| format!("{} kbps", br / 1000))
        .unwrap_or("unknown".to_string());
    
    // 获取音频采样率
    let sample_rate = if let Some(audio) = audio_stream {
        audio["sample_rate"].as_str()
            .map(|sr| format!("{} Hz", sr))
            .unwrap_or("unknown".to_string())
    } else {
        "none".to_string()
    };
    
    // 获取时长
    let duration = format["duration"].as_str()
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);
    
    // 获取帧率
    let fps = video_stream["r_frame_rate"].as_str()
        .and_then(|fps_str| {
            let parts: Vec<&str> = fps_str.split('/').collect();
            if parts.len() == 2 {
                let num = parts[0].parse::<f64>().ok()?;
                let den = parts[1].parse::<f64>().ok()?;
                if den != 0.0 {
                    Some(num / den)
                } else {
                    None
                }
            } else {
                fps_str.parse::<f64>().ok()
            }
        })
        .unwrap_or(0.0);
    
    Ok(VideoMetadata {
        format: container_format,
        video_codec,
        audio_codec,
        resolution,
        bitrate,
        sample_rate,
        duration,
        fps,
    })
}