<p align="center">
  <img src="./assets/icon.png" width="96" alt="App Icon" />
</p>
<h1 align="center">CompressGo · 即刻压缩</h1>
<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white" />
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white" />
  <img alt="FFmpeg" src="https://img.shields.io/badge/FFmpeg-enabled-007808?logo=ffmpeg&logoColor=white" />
  <img alt="Platform" src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-444" />
</p>

> 简洁、快速、私密。本地离线完成图片与视频压缩。

---

## 功能亮点

- 图片与视频压缩：支持常见图片、视频格式的压缩与转码，支持生成 AVIF 动图
- 批量处理与任务队列：一次添加多文件，支持队列、状态筛选与清理
- 自定义参数：在体积与清晰度之间灵活平衡
- 硬件加速检测：自动检测可用的硬件编码能力并优先使用
- 本地离线：所有处理均在本地完成，不上传任何文件
- 拖拽与原生对话框：拖拽添加文件，或使用系统原生选择器
- 预览与对比：压缩前后可快速预览、对比差异
- 输出路径与命名：自定义输出目录与文件命名规则（原名/时间戳/随机）
- 多语言与主题：支持中文/英文，明暗/自动主题
- 跨平台：macOS、Windows

## 系统要求

- **macOS**：10.15 (Catalina) 或更高版本
- **Windows**：8 或更高版本
- **FFmpeg**：已集成 FFmpeg 7.1 - 无需本地安装

## 截图




### macOS
<div>
  <img src="./assets/screenshots/macOS.webp" alt="macOS UI" width="100%" />
</div>

### Windows
<div>
  <img src="./assets/screenshots/win.webp" alt="Windows UI" width="100%" />
</div>

## 开发

需要 Node.js、pnpm 与 Rust 环境。

```bash
pnpm install
pnpm tauri dev
```

构建发行版：

```bash
pnpm install
pnpm tauri build
```


## 参考

- CompressO（开源跨平台视频压缩 App）：https://github.com/codeforreal1/compressO
- Rotato Video Compressor（基于 FFmpeg 的在线/离线压缩工具）：https://tools.rotato.app/compress
- HandBrake：https://github.com/HandBrake/HandBrake
- FFmpeg 二进制下载：https://ffmpeg.martin-riedl.de/
