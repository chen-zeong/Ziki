use std::path::PathBuf;

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
        .map_err(|e| format!("Failed to get file size: {}", e))
        .map(|metadata| metadata.len())
}