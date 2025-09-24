<p align="right"><strong>English</strong> | <a href="./README.zh.md">中文</a></p>

<p align="center">
  <img src="./assets/icon.svg" width="96" alt="App Icon" />
</p>
<h1 align="center">Ziki</h1>
<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white" />
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white" />
  <img alt="FFmpeg" src="https://img.shields.io/badge/FFmpeg-enabled-007808?logo=ffmpeg&logoColor=white" />
  <img alt="Platform" src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-444" />
</p>


> Simple, fast, and private. Compress images and videos locally and offline, balancing quality and size—perfect for daily sharing and archiving.

---

## ✨ Key Features

- Image and video compression: Optimize size and transcode common image and video formats
- Batch processing and task queue: Add multiple files at once, with queueing, status filtering, and cleanup
- Quality presets and customization: Flexibly balance size and clarity (presets + manual parameters)
- Hardware acceleration detection: Automatically detects available hardware encoders and prioritizes them
- Local and offline: All processing is done locally; no files are uploaded
- Drag-and-drop and native dialogs: Drag to add files, or use the system's native picker
- Preview and comparison: Quickly preview and compare before and after compression
- Output path and naming: Customize output directory and file naming (original name/timestamp/random)
- Multi-language and theme: Supports Chinese/English, light/dark/auto themes
- Cross-platform: macOS, Windows

## 🖼️ Screenshots

<div>
  <img src="./assets/demo.avif" alt="Demo" width="100%" />
</div>

<div>
  <img src="./assets/screenshots/macOS.webp" alt="macOS UI" width="100%" />
</div>

## 🚀 Development

Requires Node.js, pnpm, and a Rust environment.

```bash
pnpm i
pnpm tauri dev
```

Build release:

```bash
pnpm i
pnpm tauri build
```



## 🙏 References

- CompressO (open-source cross-platform video compression app): https://github.com/codeforreal1/compressO
- Rotato Video Compressor (FFmpeg-based online/offline compression tool): https://tools.rotato.app/compress
- HandBrake: https://github.com/HandBrake/HandBrake
