mod video;
mod image;

use video::*;
use image::*;
use tauri::{Manager, WindowEvent};
use std::sync::atomic::{AtomicBool, Ordering};

// logging
use tracing_subscriber::{EnvFilter, fmt};

struct CloseTracker(AtomicBool);
impl Default for CloseTracker {
    fn default() -> Self { Self(AtomicBool::new(false)) }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化 tracing 日志：默认 info 级别，可通过环境变量 RUST_LOG 或 TAURI_LOG 覆盖
    let _ = fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("info"))
                .unwrap()
        )
        .with_target(true)
        .with_thread_ids(false)
        .with_thread_names(false)
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 全局关闭状态跟踪（每个窗口共享同一状态即可）
            app.manage(CloseTracker::default());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let tracker = window.state::<CloseTracker>();
                // 仅第一次进入时执行终止逻辑并阻止默认关闭
                if !tracker.0.swap(true, Ordering::SeqCst) {
                    // 阻止默认关闭，等异步清理完成后手动关闭
                    api.prevent_close();
                    let window = window.clone();
                    tauri::async_runtime::spawn(async move {
                        // 杀掉所有正在运行的 ffmpeg
                        let _ = terminate_all_tasks().await;
                        // 兜底：再次保证全部杀掉
                        terminate_all_running_processes().await;
                        // 再关闭窗口（第二次进入时将不会再阻止关闭）
                        let _ = window.close();
                    });
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // video
            compress_video,
            generate_thumbnail,
            generate_video_frames,
            get_video_duration,
            generate_single_frame_with_duration,
            generate_single_frame_with_time_range,
            get_desktop_path,
            get_file_size,
            get_video_metadata,
            detect_all_codecs,
            get_platform,
            get_arch,
            open_output_folder,
            pause_task,
            resume_task,
            delete_task,
            get_hardware_encoder_support,
            refresh_hardware_encoder_support,
            terminate_all_tasks,
            // image
            compress_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
