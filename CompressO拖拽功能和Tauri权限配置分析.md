# CompressO 拖拽功能和 Tauri 权限配置分析

## 项目概述

CompressO 是一个基于 Tauri 框架开发的跨平台视频压缩应用，使用 Next.js 作为前端，Rust 作为后端。该项目实现了完整的拖拽上传功能，允许用户通过拖拽方式选择视频文件进行压缩。

## 拖拽功能实现

### 1. 前端拖拽组件实现

#### 核心组件：`DragAndDrop.tsx`

位置：`src/app/(root)/ui/DragAndDrop.tsx`

```typescript
import React from 'react'
import { event } from '@tauri-apps/api'
import ReactDOM from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

function DragAndDrop({ disable = false, onFile }: DragAndDropProps) {
  const [dragAndDropState, setDragAndDropState] = React.useState<
    'idle' | 'dragging' | 'dropped'
  >('idle')

  // 监听 Tauri 拖拽事件
  React.useEffect(() => {
    ;(async function iife() {
      if (!disable) {
        // 监听文件拖放事件
        dragAndDropListenerRef.current.drop = await event.listen<{
          paths: string[]
        }>('tauri://drop', (evt) => {
          setDragAndDropState('dropped')
          const paths = evt?.payload?.paths
          if (paths.length > 0) {
            const filePath = paths?.[0]
            const filePathSplitted = filePath?.split('.')
            if (filePathSplitted.length) {
              const fileExtension = filePathSplitted?.[filePathSplitted.length - 1]
              if (!videoExtensions?.includes(fileExtension)) {
                toast.error('Invalid video file.')
              } else {
                onFile?.(filePath)
              }
            }
          }
        })
        
        // 监听拖拽开始事件
        dragAndDropListenerRef.current.drag = await event.listen(
          'tauri://drag',
          () => {
            setDragAndDropState('dragging')
          },
        )
        
        // 监听拖拽取消事件
        dragAndDropListenerRef.current.dragCancelled = await event.listen(
          'tauri://drag-cancelled',
          () => {
            setDragAndDropState('idle')
          },
        )
      }
    })()
  }, [onFile, disable])

  return (
    // 拖拽时显示的覆盖层UI
    <AnimatePresence mode="wait">
      {dragAndDropState === 'dragging' ? (
        <div className="fixed top-0 right-0 bottom-0 left-0 w-screen h-screen bg-zinc-200 dark:bg-zinc-900 flex justify-center items-center flex-col z-[2]">
          <motion.div className="flex justify-center items-center flex-col py-16 px-20 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl">
            <Icon name="dragAndDrop" className="text-primary" size={50} />
            <p className="my-2 text-gray-600 dark:text-gray-400 italic text-sm">
              Drop anywhere...
            </p>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
```

#### 关键特性：

1. **事件监听**：使用 `@tauri-apps/api` 的 `event.listen` 监听三个关键事件：
   - `tauri://drop`：文件拖放完成
   - `tauri://drag`：拖拽开始
   - `tauri://drag-cancelled`：拖拽取消

2. **文件验证**：检查拖放的文件扩展名是否为支持的视频格式

3. **状态管理**：使用 React state 管理拖拽状态（idle/dragging/dropped）

4. **UI 反馈**：拖拽时显示全屏覆盖层，提供视觉反馈

### 2. 主页面集成

在 `src/app/(root)/page.tsx` 中集成拖拽组件：

```typescript
<DragAndDrop disable={isFileSelected} onFile={handleVideoSelected} />
```

- `disable`：当已选择文件时禁用拖拽功能
- `onFile`：文件选择回调函数

### 3. 支持的视频格式

项目支持多种视频格式，定义在 `src/types/compression.ts` 中：

```typescript
const videoExtensions = Object.keys(extensions?.video)
```

## Tauri 权限配置

### 1. 主配置文件：`tauri.conf.json`

位置：`src-tauri/tauri.conf.json`

```json
{
  "productName": "CompressO",
  "version": "1.2.0",
  "identifier": "com.compresso.app",
  "app": {
    "windows": [
      {
        "fullscreen": false,
        "height": 992,
        "width": 1280,
        "minWidth": 1080,
        "minHeight": 800,
        "resizable": true,
        "title": "",
        "hiddenTitle": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: http://asset.localhost asset: https://asset.localhost; style-src 'unsafe-inline' 'self'; connect-src 'self' ipc: http://ipc.localhost ipc: https://ipc.localhost",
      "dangerousDisableAssetCspModification": ["style-src"],
      "assetProtocol": {
        "enable": true,
        "scope": {
          "allow": ["$APPDATA/**"],
          "requireLiteralLeadingDot": false
        }
      }
    }
  }
}
```

### 2. 权限能力配置：`capabilities/main.json`

位置：`src-tauri/capabilities/main.json`

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main",
  "description": "Capability for the main window",
  "platforms": ["linux", "macOS", "windows"],
  "local": true,
  "windows": ["main"],
  "permissions": [
    "path:default",
    "event:default",        // 拖拽事件需要
    "window:default",
    "app:default",
    "resources:default",
    "menu:default",
    "tray:default",
    "fs:allow-read-file",   // 文件读取权限
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "args": false,
          "cmd": "",
          "name": "./bin/ffmpeg",
          "sidecar": true
        }
      ]
    },
    "dialog:allow-open",    // 文件对话框权限
    "dialog:allow-save",    // 保存对话框权限
    "shell:default",
    "dialog:default",
    {
      "identifier": "fs:default",
      "allow": [{ "path": "$APPDATA/**" }]
    },
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "$APPDATA/*" }]
    },
    "shell:allow-open",
    "log:default"
  ]
}
```

#### 拖拽功能相关的关键权限：

1. **`event:default`**：允许监听和处理事件，包括拖拽事件
2. **`fs:allow-read-file`**：允许读取拖放的文件
3. **`dialog:allow-open`** 和 **`dialog:allow-save`**：文件选择和保存对话框
4. **`fs:default`** 和 **`fs:scope`**：文件系统访问权限，限制在 `$APPDATA` 目录

### 3. Rust 后端配置

#### 主程序：`src-tauri/src/main.rs`

```rust
#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())        // 文件系统插件
        .plugin(tauri_plugin_dialog::init())    // 对话框插件
        .plugin(tauri_plugin_shell::init())     // Shell 插件
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            file_system::setup_app_data_dir(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compress_video,
            generate_video_thumbnail,
            get_video_duration,
            get_image_dimension,
            get_file_metadata,
            move_file,
            delete_file,
            delete_cache,
            show_item_in_file_manager
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 依赖配置：`Cargo.toml`

```toml
[dependencies]
tauri = { version = "2.0.0-beta", features = ["protocol-asset"] }
tauri-plugin-dialog = "2.0.0-beta.7"
tauri-plugin-shell = "2.0.0-beta.4"
tauri-plugin-fs = "2.0.0-beta.7"
```

## 拖拽功能工作流程

1. **初始化**：组件挂载时注册 Tauri 事件监听器
2. **拖拽开始**：用户开始拖拽文件时，触发 `tauri://drag` 事件
3. **UI 反馈**：显示拖拽覆盖层，提示用户可以释放文件
4. **文件释放**：用户释放文件时，触发 `tauri://drop` 事件
5. **文件验证**：检查文件扩展名是否为支持的视频格式
6. **处理文件**：如果验证通过，调用 `onFile` 回调处理文件
7. **清理**：组件卸载时清理事件监听器

## 安全考虑

1. **文件类型验证**：只接受预定义的视频文件格式
2. **路径限制**：文件系统访问限制在应用数据目录
3. **CSP 策略**：配置内容安全策略防止 XSS 攻击
4. **权限最小化**：只授予应用必需的最小权限集

## 总结

CompressO 的拖拽功能实现展示了 Tauri 框架在桌面应用开发中的强大能力：

- **跨平台支持**：一套代码支持 Windows、macOS 和 Linux
- **安全性**：细粒度的权限控制和文件访问限制
- **用户体验**：流畅的拖拽交互和视觉反馈
- **类型安全**：TypeScript 和 Rust 提供的类型安全保障

这种实现方式为其他 Tauri 应用的拖拽功能开发提供了很好的参考模板。