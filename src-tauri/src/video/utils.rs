use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use crate::video::types::VideoMetadata;
// Add for caching hardware support
use std::time::{SystemTime, UNIX_EPOCH};

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
        return "ffmpeg-aarch64-apple-darwin";
        #[cfg(target_arch = "x86_64")]
        return "ffmpeg-x86_64-apple-darwin";
    }
    
    #[cfg(target_os = "windows")]
    {
        #[cfg(target_arch = "x86_64")]
        return "ffmpeg-x86_64-pc-win64.exe";
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return "ffmpeg";
}

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(non_snake_case)]
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

#[allow(non_snake_case)]
#[tauri::command]
pub fn get_video_metadata(app_handle: tauri::AppHandle, videoPath: String) -> Result<VideoMetadata, String> {
    // In development mode, use the bin directory in src-tauri
    // In production, use the resource directory
    let ffprobe_path = if cfg!(debug_assertions) {
        // Development mode: use bin directory relative to src-tauri
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffprobe_binary())
    } else {
        // Production mode: use resource directory
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffprobe_binary())
    };
    
    println!("FFprobe path for metadata: {:?}", ffprobe_path);
    
    if !ffprobe_path.exists() {
        return Err(format!("FFprobe binary not found at: {:?}", ffprobe_path));
    }
    
    let output = Command::new(&ffprobe_path)
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
    #[cfg(target_os = "macos")]
    {
        #[cfg(target_arch = "aarch64")]
        return "ffprobe-aarch64-apple-darwin";
        #[cfg(target_arch = "x86_64")]
        return "ffprobe-x86_64-apple-darwin";
    }
    
    #[cfg(target_os = "windows")]
    {
        #[cfg(target_arch = "x86_64")]
        return "ffprobe-x86_64-pc-windows-msvc.exe";
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return "ffprobe";
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
    
    // 获取格式信息（容错：键缺失时不崩溃）
    let format_name = format.get("format_name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .split(',').next().unwrap_or("unknown");
    
    // 根据文件扩展名和格式名称确定正确的容器格式（容错：filename 可能缺失）
    let file_extension = format.get("filename")
        .and_then(|v| v.as_str())
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
    
    // 获取码率（容错：bit_rate 可能缺失或非数字）
    let bitrate = format.get("bit_rate")
        .and_then(|v| v.as_str())
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
    
    // 获取时长（容错：duration 可能缺失或不可解析）
    let duration = format.get("duration")
        .and_then(|v| v.as_str())
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
    
    // 获取色彩深度
    let color_depth = video_stream["bits_per_raw_sample"].as_str()
        .or_else(|| video_stream["bits_per_sample"].as_str())
        .or_else(|| {
            // 尝试从像素格式推断色彩深度
            video_stream["pix_fmt"].as_str().and_then(|pix_fmt| {
                match pix_fmt {
                    "yuv420p" | "yuv422p" | "yuv444p" | "rgb24" | "bgr24" => Some("8"),
                    "yuv420p10le" | "yuv422p10le" | "yuv444p10le" | "rgb48le" | "bgr48le" => Some("10"),
                    "yuv420p12le" | "yuv422p12le" | "yuv444p12le" => Some("12"),
                    "yuv420p16le" | "yuv422p16le" | "yuv444p16le" | "rgb48" | "bgr48" => Some("16"),
                    _ => None
                }
            })
        })
        .map(|depth| format!("{} bit", depth));
    
    Ok(VideoMetadata {
        format: container_format,
        video_codec,
        audio_codec,
        resolution,
        bitrate,
        sample_rate,
        duration,
        fps,
        color_depth,
    })
}


// Add: Hardware encoder detection result types
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct EncoderSupport {
  pub name: String,     // ffmpeg encoder name, e.g. "h264_videotoolbox", "h264_nvenc"
  pub codec: String,    // logical codec: h264|hevc|av1|vp9|prores
  pub vendor: String,   // Apple VT | NVIDIA | Intel | AMD
  pub supported: bool,
  pub error_message: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct HardwareSupport {
  pub platform: String,           // macos|windows|linux|unknown
  pub tested_at: i64,             // unix seconds
  pub encoders: Vec<EncoderSupport>,
}

// Helper: current platform string (aligns with get_platform())
fn current_platform() -> String {
  #[cfg(target_os = "macos")] { return "macos".into(); }
  #[cfg(target_os = "windows")] { return "windows".into(); }
  #[cfg(target_os = "linux")] { return "linux".into(); }
  #[allow(unreachable_code)]
  "unknown".into()
}

// Helper: resolve app-local cache file path
fn hardware_cache_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
  app_handle.path().app_local_data_dir().ok().map(|dir| dir.join("hardware_support.json"))
}

// Helper: resolve test video path (dev: src-tauri/test/*.mp4; prod: resources/test/*.mp4)
fn resolve_test_video_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
  let base_dir = if cfg!(debug_assertions) {
    // dev: current_exe 位于 src-tauri/target/debug/[app]，上移 3 层刚好到 src-tauri 目录
    let current_exe = std::env::current_exe().ok()?;
    let src_tauri_dir = current_exe.parent()?.parent()?.parent()?;
    src_tauri_dir.join("test")
  } else {
    // prod：resource_dir/test
    let resource_dir = app_handle.path().resource_dir().ok()?;
    resource_dir.join("test")
  };
  if !base_dir.exists() {
    if cfg!(debug_assertions) { println!("[HW Detect] Test dir not found: {:?}", base_dir); }
    return None;
  }
  // pick first .mp4 file
  if let Ok(entries) = std::fs::read_dir(&base_dir) {
    for entry in entries.flatten() {
      let p = entry.path();
      if p.is_file() {
        if let Some(ext) = p.extension() { if ext.to_string_lossy().to_lowercase() == "mp4" { return Some(p); } }
      }
    }
  }
  if cfg!(debug_assertions) { println!("[HW Detect] No .mp4 found under {:?}", base_dir); }
  None
}

// Helper: Log available HW encoders from `ffmpeg -encoders`
fn log_available_hw_encoders(ffmpeg_path: &PathBuf) {
  if !cfg!(debug_assertions) { return; }
  let out = Command::new(ffmpeg_path)
    .arg("-hide_banner")
    .arg("-v").arg("error")
    .arg("-encoders")
    .output();
  match out {
    Ok(o) => {
      let text = String::from_utf8_lossy(&o.stdout);
      let mut lines: Vec<&str> = text
        .lines()
        .filter(|l| l.contains("videotoolbox") || l.contains("nvenc") || l.contains("qsv") || l.contains("amf"))
        .collect();
      if lines.is_empty() {
        println!("[HW Detect] No HW encoders found in 'ffmpeg -encoders' output.");
      } else {
        lines.sort_unstable();
        println!("[HW Detect] 'ffmpeg -encoders' HW list:\n{}", lines.join("\n"));
      }
    }
    Err(e) => println!("[HW Detect] Failed to run 'ffmpeg -encoders': {}", e),
  }
}

// Test input source for ffmpeg minimal probe
enum TestInput { File(PathBuf), Lavfi(String) }

// Helper: run a minimal encode of 1 frame to null muxer; return (supported, error)
fn test_encoder(ffmpeg_path: &PathBuf, input: &TestInput, encoder: &str) -> (bool, Option<String>) {
  if cfg!(debug_assertions) {
    match input {
      TestInput::File(p) => println!("[HW Detect] Testing encoder '{}' with input file {:?}", encoder, p),
      TestInput::Lavfi(spec) => println!("[HW Detect] Testing encoder '{}' with lavfi input {}", encoder, spec),
    }
  }

  // 单次最小参数检测：仅设置编码器与码率，输出到 null，处理 1 帧
  let mut cmd = Command::new(ffmpeg_path);
  cmd
    .arg("-hide_banner")
    .arg("-nostdin")
    .arg("-y")
    .arg("-v").arg(if cfg!(debug_assertions) { "info" } else { "error" });

  match input {
    TestInput::File(p) => { cmd.arg("-i").arg(p); }
    TestInput::Lavfi(spec) => { cmd.arg("-f").arg("lavfi").arg("-i").arg(spec); }
  }

  cmd
    .arg("-an")
    .arg("-c:v").arg(encoder)
    .arg("-b:v").arg("50k")
    .arg("-frames:v").arg("1")
    .arg("-f").arg("null")
    .arg("-");

  let out = cmd.output();
  match out {
    Ok(o) => {
      if cfg!(debug_assertions) { println!("[HW Detect] [{}] exit status: {}", encoder, o.status); }
      if o.status.success() {
        (true, None)
      } else {
        let stderr = String::from_utf8_lossy(&o.stderr).to_string();
        (false, Some(stderr))
      }
    }
    Err(e) => (false, Some(e.to_string())),
  }
}

// 枚举要测试的硬件编码器
fn encoders_to_test() -> Vec<&'static str> {
  if cfg!(target_os = "macos") {
    vec![
      "h264_videotoolbox",
      "hevc_videotoolbox",
      "prores_videotoolbox",
      // 若 ffmpeg 支持，可加入："av1_videotoolbox",
    ]
  } else if cfg!(target_os = "windows") {
    vec![
      // NVIDIA
      "h264_nvenc", "hevc_nvenc", "av1_nvenc",
      // Intel Quick Sync
      "h264_qsv", "hevc_qsv", "av1_qsv",
      // AMD AMF
      "h264_amf", "hevc_amf", "av1_amf",
    ]
  } else {
    // Linux: VAAPI
    vec!["h264_vaapi", "hevc_vaapi", "av1_vaapi", "vp9_vaapi"]
  }
}

fn map_vendor(name: &str) -> &'static str {
  if name.contains("videotoolbox") { "Apple VT" }
  else if name.contains("nvenc") { "NVIDIA" }
  else if name.contains("qsv") { "Intel" }
  else if name.contains("amf") { "AMD" }
  else if name.contains("vaapi") { "VAAPI" }
  else { "Unknown" }
}

fn map_codec(name: &str) -> &'static str {
  if name.contains("264") { "h264" }
  else if name.contains("hevc") || name.contains("265") { "hevc" }
  else if name.contains("av1") { "av1" }
  else if name.contains("vp9") { "vp9" }
  else if name.contains("prores") { "prores" }
  else { "unknown" }
}

fn detect_hardware_support_internal(app_handle: &tauri::AppHandle) -> HardwareSupport {
  let platform = current_platform();

  // 与 detect_all_codecs 相同的 ffmpeg 路径解析：优先打包/本地 bin，失败回退 PATH
  let mut ffmpeg_path = if cfg!(debug_assertions) {
    // dev：相对 src-tauri/bin
    let current_exe = std::env::current_exe().unwrap();
    let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
    src_tauri_dir.join("bin").join(get_ffmpeg_binary())
  } else {
    // prod：资源目录 bin
    let resource_dir = app_handle.path().resource_dir().unwrap();
    resource_dir.join("bin").join(get_ffmpeg_binary())
  };
  if !ffmpeg_path.exists() {
    if cfg!(debug_assertions) { println!("[HW Detect] Packaged ffmpeg not found at {:?}, fallback to 'ffmpeg' in PATH", ffmpeg_path); }
    ffmpeg_path = PathBuf::from("ffmpeg");
  }
  if cfg!(debug_assertions) {
    println!("[HW Detect] Using ffmpeg at: {:?}", ffmpeg_path);
    // 打印一次可用硬件编码器列表，便于观察
    log_available_hw_encoders(&ffmpeg_path);
  }

  let tested_at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
  let mut encoders: Vec<EncoderSupport> = Vec::new();

  // 只使用本地测试视频，不做 lavfi 回退，避免更改分辨率
  let test_video_opt = resolve_test_video_path(app_handle);
  if test_video_opt.is_none() {
    let msg = "No test video found: dev expects src-tauri/test/*.mp4, prod expects resources/test/*.mp4".to_string();
    for name in encoders_to_test() {
      encoders.push(EncoderSupport {
        name: name.to_string(),
        codec: map_codec(name).to_string(),
        vendor: map_vendor(name).to_string(),
        supported: false,
        error_message: Some(msg.clone()),
      });
    }
    return HardwareSupport { platform, tested_at, encoders };
  }
  let test_video = test_video_opt.unwrap();
  let test_input = TestInput::File(test_video);

  for name in encoders_to_test() {
    if cfg!(debug_assertions) { println!("[HW Detect] >> Start testing {}", name); }
    let (ok, err) = test_encoder(&ffmpeg_path, &test_input, name);
    encoders.push(EncoderSupport {
      name: name.to_string(),
      codec: map_codec(name).to_string(),
      vendor: map_vendor(name).to_string(),
      supported: ok,
      error_message: if ok { None } else { err },
    });
  }

  HardwareSupport { platform, tested_at, encoders }
}

fn load_hardware_support_cache(app_handle: &tauri::AppHandle) -> Option<HardwareSupport> {
  let path = hardware_cache_path(app_handle)?;
  let data = std::fs::read_to_string(path).ok()?;
  serde_json::from_str::<HardwareSupport>(&data).ok()
}

fn save_hardware_support_cache(app_handle: &tauri::AppHandle, hs: &HardwareSupport) -> Result<(), String> {
  if let Some(path) = hardware_cache_path(app_handle) {
    if let Some(dir) = path.parent() { let _ = std::fs::create_dir_all(dir); }
    let data = serde_json::to_string_pretty(hs).map_err(|e| e.to_string())?;
    std::fs::write(path, data).map_err(|e| e.to_string())
  } else {
    Err("Failed to resolve hardware cache path".into())
  }
}

#[tauri::command]
pub fn get_hardware_encoder_support(app_handle: tauri::AppHandle) -> Result<HardwareSupport, String> {
  println!("[HW Detect] get_hardware_encoder_support called");
  if let Some(cached) = load_hardware_support_cache(&app_handle) {
    println!("[HW Detect] Load cached hardware support");
    println!("[HW Detect] get_hardware_encoder_support finished (from cache)");
    return Ok(cached);
  }
  println!("[HW Detect] Cache missing, running detection...");
  let hs = detect_hardware_support_internal(&app_handle);
  let _ = save_hardware_support_cache(&app_handle, &hs);
  println!("[HW Detect] get_hardware_encoder_support finished (detection run)");
  Ok(hs)
}

#[tauri::command]
pub fn refresh_hardware_encoder_support(app_handle: tauri::AppHandle) -> Result<HardwareSupport, String> {
  if cfg!(debug_assertions) { println!("[HW Detect] Refresh requested, running detection..."); }
  let hs = detect_hardware_support_internal(&app_handle);
  let _ = save_hardware_support_cache(&app_handle, &hs);
  Ok(hs)
}