mod video;

use video::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
