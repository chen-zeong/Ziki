use tokio::process::Command;
use crate::video::{CompressionSettings, CompressionResult, get_ffmpeg_binary};
use tauri::Manager; // 引入 Manager trait 以便使用 AppHandle.path()

fn map_jpeg_quality(crf_value: Option<u8>) -> u8 {
    // ffmpeg mjpeg quality range: 2(best) - 31(worst)
    let q = crf_value.unwrap_or(80).min(100) as f64; // 0-100, higher = better
    let mapped = 31.0 - (q * 29.0 / 100.0);
    let qv = mapped.round() as i32 + 0; // keep within 2..=31 below
    qv.clamp(2, 31) as u8
}

fn build_png_filter_and_codec(crf_value: Option<u8>) -> (String, Vec<String>) {
    // 默认质量改为 80
    let q = crf_value.unwrap_or(80).min(100);
    
    if q == 100 {
        // 质量 100（无损）：使用参数 -compression_level 90 -pred mixed
        (
            "png".to_string(),
            vec![
                "-compression_level".to_string(), "90".to_string(),
                "-pred".to_string(), "mixed".to_string(),
            ]
        )
    } else {
        // 其他质量值：使用 palettegen + paletteuse 滤镜
        let max_colors = if q >= 80 {
            256  // 质量 80：256 色
        } else if q >= 60 {
            128  // 质量 60（默认）：128 色
        } else if q >= 40 {
            96   // 质量 40：96 色
        } else if q >= 20 {
            64   // 极低质量 20：64 色
        } else {
            64   // 移除 32 色档，最低仍为 64 色
        };
        
        let filter = format!(
            "split[s0][s1];[s0]palettegen=max_colors={}:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a",
            max_colors
        );
        
        ("png".to_string(), vec!["-vf".to_string(), filter])
    }
}

fn map_webp_quality(crf_value: Option<u8>) -> u8 {
    // libwebp uses 0-100 quality scale, higher = better
    crf_value.unwrap_or(80).min(100)
}

fn build_scale_filter(settings: &CompressionSettings) -> Option<String> {
    if settings.resolution.eq_ignore_ascii_case("original") { return None; }
    if settings.resolution.eq_ignore_ascii_case("custom") {
        if let Some(custom) = &settings.custom_resolution {
            return Some(format!("scale={}:{}", custom.width, custom.height));
        }
        return None;
    }
    // Expect formats like "1920x1080"
    if settings.resolution.contains('x') {
        return Some(format!("scale={}", settings.resolution));
    }
    None
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn compress_image(
    taskId: String,
    inputPath: String,
    outputPath: String,
    settings: CompressionSettings,
    app_handle: tauri::AppHandle,
) -> Result<CompressionResult, String> {
    // Resolve ffmpeg path (reuse logic from video module)
    let ffmpeg_path = if cfg!(debug_assertions) {
        let current_exe = std::env::current_exe().unwrap();
        let src_tauri_dir = current_exe.parent().unwrap().parent().unwrap().parent().unwrap();
        src_tauri_dir.join("bin").join(get_ffmpeg_binary())
    } else {
        let resource_dir = app_handle.path().resource_dir().unwrap();
        resource_dir.join("bin").join(get_ffmpeg_binary())
    };

    // 基本参数打印
    println!("[Image] ================= compress_image =================");
    println!("[Image] taskId: {}", taskId);
    println!("[Image] FFmpeg path: {:?}", ffmpeg_path);
    println!("[Image] input: {}", inputPath);
    println!("[Image] output: {}", outputPath);
    println!("[Image] format: {}", settings.format);
    println!("[Image] quality_type: {}", settings.quality_type);
    println!("[Image] crf_value: {:?}", settings.crf_value);
    println!("[Image] resolution: {}", settings.resolution);
    if let Some(custom) = &settings.custom_resolution {
        println!("[Image] custom_resolution: {}x{}", custom.width, custom.height);
    } else {
        println!("[Image] custom_resolution: (none)");
    }

    if !ffmpeg_path.exists() {
        return Err(format!("FFmpeg binary not found at: {:?}", ffmpeg_path));
    }

    let original_size = std::fs::metadata(&inputPath)
        .map_err(|e| format!("Failed to get file size: {}", e))?
        .len();

    // Prepare ffmpeg command
    let mut cmd = Command::new(&ffmpeg_path);
    let mut args_for_log: Vec<String> = Vec::new();
    cmd.arg("-y");
    args_for_log.push("-y".to_string());
    cmd.arg("-i").arg(&inputPath);
    args_for_log.push("-i".to_string());
    args_for_log.push(inputPath.clone());

    // Get scale filter first
    let scale_filter = build_scale_filter(&settings);

    // Set codec and quality based on output format
    let format_lower = settings.format.to_lowercase();
    match format_lower.as_str() {
        "jpg" | "jpeg" => {
            let q = map_jpeg_quality(settings.crf_value);
            
            // Apply scale filter if needed
            if let Some(scale) = scale_filter {
                println!("[Image] scale_filter: {}", scale);
                cmd.arg("-vf").arg(&scale);
                args_for_log.push("-vf".to_string());
                args_for_log.push(scale);
            } else {
                println!("[Image] scale_filter: <none> (original)");
            }
            
            cmd.arg("-c:v").arg("mjpeg");
            cmd.arg("-q:v").arg(q.to_string());
            args_for_log.push("-c:v".to_string());
            args_for_log.push("mjpeg".to_string());
            args_for_log.push("-q:v".to_string());
            args_for_log.push(q.to_string());
            println!("[Image] codec=mjpeg, args: -q:v {}", q);
        },
        "png" => {
            let (codec, png_args) = build_png_filter_and_codec(settings.crf_value);
            
            // PNG的滤镜和缩放需要特殊处理
            if png_args.len() >= 2 && png_args[0] == "-vf" {
                // 使用palette滤镜的情况，需要合并scale和palette滤镜
                let palette_filter = &png_args[1];
                if let Some(scale) = scale_filter {
                    // 合并scale和palette滤镜：先scale再palette
                    let combined_filter = format!("{},{}", scale, palette_filter);
                    cmd.arg("-vf").arg(&combined_filter);
                    args_for_log.push("-vf".to_string());
                    args_for_log.push(combined_filter.clone());
                    println!("[Image] combined_filter: {}", combined_filter);
                } else {
                    cmd.arg("-vf").arg(palette_filter);
                    args_for_log.push("-vf".to_string());
                    args_for_log.push(palette_filter.clone());
                    println!("[Image] palette_filter: {}", palette_filter);
                }
            } else {
                // 无损PNG（compression_level），正常处理scale
                if let Some(scale) = scale_filter {
                    println!("[Image] scale_filter: {}", scale);
                    cmd.arg("-vf").arg(&scale);
                    args_for_log.push("-vf".to_string());
                    args_for_log.push(scale);
                } else {
                    println!("[Image] scale_filter: <none> (original)");
                }
                
                // 添加无损 PNG 参数（可能包含多项，例如 -compression_level 90 -pred mixed）
                for a in &png_args {
                    cmd.arg(a);
                    args_for_log.push(a.clone());
                }
                println!("[Image] codec=png, args: {}", png_args.join(" "));
            }
            
            cmd.arg("-c:v").arg(&codec);
            args_for_log.push("-c:v".to_string());
            args_for_log.push(codec);
        },
        "webp" => {
            let q = map_webp_quality(settings.crf_value);
            
            // Apply scale filter if needed
            if let Some(scale) = scale_filter {
                println!("[Image] scale_filter: {}", scale);
                cmd.arg("-vf").arg(&scale);
                args_for_log.push("-vf".to_string());
                args_for_log.push(scale);
            } else {
                println!("[Image] scale_filter: <none> (original)");
            }
            
            cmd.arg("-c:v").arg("libwebp");
            cmd.arg("-q:v").arg(q.to_string());
            args_for_log.push("-c:v".to_string());
            args_for_log.push("libwebp".to_string());
            args_for_log.push("-q:v".to_string());
            args_for_log.push(q.to_string());
            println!("[Image] codec=libwebp, args: -q:v {}", q);
        },
        other => {
            // Fallback to PNG (无损)
            eprintln!("[Image] Unknown image format '{}', falling back to PNG", other);
            
            if let Some(scale) = scale_filter {
                println!("[Image] scale_filter: {}", scale);
                cmd.arg("-vf").arg(&scale);
                args_for_log.push("-vf".to_string());
                args_for_log.push(scale);
            } else {
                println!("[Image] scale_filter: <none> (original)");
            }
            
            cmd.arg("-c:v").arg("png");
            cmd.arg("-compression_level").arg("90");
            args_for_log.push("-c:v".to_string());
            args_for_log.push("png".to_string());
            args_for_log.push("-compression_level".to_string());
            args_for_log.push("90".to_string());
            println!("[Image] codec=png (fallback), args: -compression_level 90");
        }
    }

    cmd.arg(&outputPath);
    args_for_log.push(outputPath.clone());

    // 打印将要执行的完整命令（路径 + 参数）
    let args_joined = args_for_log
        .iter()
        .map(|a| if a.contains(' ') { format!("\"{}\"", a) } else { a.clone() })
        .collect::<Vec<_>>()
        .join(" ");
    println!("[Image] Executing FFmpeg: {:?} {}", ffmpeg_path, args_joined);

    let output = cmd.output().await.map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("[Image] ffmpeg failed: {}", stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    let compressed_size = std::fs::metadata(&outputPath)
        .map(|m| m.len())
        .ok();

    println!("[Image] Success. original_size={} bytes, compressed_size={:?} bytes", original_size, compressed_size);

    Ok(CompressionResult {
        success: true,
        output_path: Some(outputPath),
        error: None,
        original_size,
        compressed_size,
        compressed_metadata: None,
    })
}