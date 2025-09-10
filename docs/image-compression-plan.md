# 图片压缩功能设计方案（更新版）

本文档给出在现有项目中新增“图片压缩”能力的整体设计方案（不含代码），包含交互与体验、前后端技术方案、数据模型、实施步骤与验收标准。本版根据最新要求进行了约束与细化：仅支持 JPEG/PNG/WebP；PNG 统一使用 0–100 的画质滑块，其中 100 表示无损，其他档位映射到给定的参数组合；图片格式与分辨率放在左列，画质放在右列。

## 1. 目标与范围
- 新增任务类型：image（图片）。
- 当当前任务文件为图片时，设置面板自动切换为“图片参数设置”。
- 支持参数：
  - 分辨率（保持比例缩放，支持预设与自定义）。
  - 图片格式（仅支持：JPEG、PNG、WebP）。
  - 画质（质量滑块，统一 0–100）。
- PNG 特殊规则：不再单独提供“无损/有损”模式切换，改为用质量滑块统一控制（见第 4 节的映射）。
- 兼容现有任务队列、状态与批量压缩流程；已完成（completed）的任务参数不可再编辑。

## 2. 用户体验与交互流程
1) 文件识别与面板切换
- 上传/添加文件后，根据扩展名或元信息判断文件类型（图片/视频）。
- 若为图片：
  - 隐藏与视频相关的选项（例如时间段截取）。
  - 显示“图片设置面板”：分辨率、格式、画质（PNG 由滑块统一控制无损/有损）。

2) 面板布局（左右两列）
- 左列：图片格式、分辨率（预设与自定义宽高，默认保持纵横比）。
- 右列：画质（0–100 滑块）。

3) 控件设计
- 分辨率：
  - 预设：保持原始、不超过 1920、1080、720、自定义（宽/高）。
  - 约束：默认保持纵横比；仅填宽或仅填高时自动按比例计算另一边。
- 图片格式：
  - 单选下拉：JPEG / PNG / WebP（仅此三种）。
- 画质（统一 0–100）：
  - 对于 JPEG / WebP：按常规质量映射（见第 4 节），步进 1。
  - 对于 PNG：采用离散档位策略（见第 4 节），前端滑块“步进建议为 20”（0/20/40/60/80/100），以确保与参数映射严格一致；若需更细步进，可对非锚点值采用“就近锚点”映射（最近邻取整到 0、20、40、60、80、100 之一）。

4) 锁定规则与状态
- 当任务状态为 completed 时，图片设置面板整体置灰，禁止修改（与视频设置一致）。
- 切换到其他未完成任务时，恢复可编辑。

5) 批量与混合任务
- 批量压缩时：
  - 图片任务保留独立的图片设置；
  - 后续可新增“仅对图片任务应用批量覆盖”的开关。

## 3. 前端技术方案
- 文件类型识别：在文件导入/任务创建流程中判断扩展名（jpg/jpeg/png/webp），为任务标记 type: 'image'。
- 组件结构：
  - 新增 ImageSettingsPanel（components/image-settings/ImageSettingsPanel.vue）。
  - 复用现有通用输入组件（CustomSelect、CustomNumberInput 等）。
  - 主区域根据任务类型切换 VideoSettingsPanel 或 ImageSettingsPanel。
  - FooterBar/TimeRangeSettings：图片任务不展示时间段设置。
- 状态与属性：
  - 向 ImageSettingsPanel 传入：当前任务设置、是否锁定、更新事件回调。
  - i18n：新增图片相关文案键值（格式、分辨率、质量）。
- 即时反馈：MVP 不做实时预览，可在后续迭代增加缩略图/采样预估。

## 4. 后端（Tauri/Rust）技术方案与质量映射
- 新增模块：src-tauri/src/image/compression.rs（或 image/mod.rs）。
- 通用流程：
  1) 读取原图与元数据；
  2) 按分辨率设置缩放（默认高质量采样）；
  3) 根据目标格式与画质映射进行编码输出。
- JPEG 映射：
  - 质量：1–100（默认 85）。
- WebP 映射：
  - 质量：0–100（默认 80），采用有损编码；（可在后续扩展无损模式）。
- PNG 映射（使用统一 0–100 滑块）：
  - 质量 100（无损）：使用参数 -compression_level 90。
  - 质量 80：使用滤镜参数 -vf "split[s0][s1];[s0]palettegen=max_colors=192:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a"。
  - 质量 60（默认）：-vf "split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a"。
  - 质量 40（低质量）：-vf "split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a"。
  - “极低质量20”：max_colors=64；“最低质量0”：max_colors=32。
  - 档位策略：
    - 推荐前端滑块步进为 20（0/20/40/60/80/100），并固定映射如下：
      - 0 → 32 色（最低质量）
      - 20 → 64 色（极低质量）
      - 40 → 96 色（低质量）
      - 60 → 128 色（默认）
      - 80 → 192 色（高质量）
      - 100 → 无损（-compression_level 90）
    - 若滑块允许非 20 的步进，则将数值“就近映射”到上述锚点值（最近邻）。
- 与现有任务队列集成：
  - 维护统一的 CompressionTask 流程，新增 image 分支；
  - 复用状态管理（pending/processing/completed/failed/canceled）。
- 输出：
  - 输出路径与视频一致；按目标格式更改扩展名；
  - EXIF 处理：默认丢弃，后续可加“保留元数据”开关。

## 5. 数据模型与前后端接口
- CompressionTask 扩展：
  - type: 'video' | 'image'
  - imageSettings: {
    - format: 'jpeg' | 'png' | 'webp'
    - quality: number // 0–100（统一滑块）
    - resolution: {
      - preset?: 'original' | '1080p' | '720p' | 'custom'
      - width?: number
      - height?: number
      - keepAspectRatio: boolean
      }
      }
- 说明：移除 pngMode、pngCompressionLevel 等字段，由后端基于 quality 做映射与派生。
- 命令与事件：
  - 新增 image_compress 命令（或复用 compress 并在内部按 type 分流）；
  - 进度与状态上报沿用既有事件结构。

## 6. 国际化与可访问性
- locales/en.ts、zh.ts 增加：
  - 图片设置面板标题与字段：格式、分辨率、质量（含 PNG 档位提示文案）。
- 继续遵循现有组件的键盘与可访问性规范。

## 7. 错误处理与边界情况
- 不支持或损坏的图片：返回明确错误并标记为 failed。
- 过大的图片：提示内存/时间开销，建议降低分辨率。
- 非法参数：前后端双重校验（质量范围、分辨率为正数）。

## 8. 性能与资源
- 优先采用高质量缩放，必要时支持“快速/高质”开关；
- 批量处理限制并发，避免阻塞 UI；
- PNG 无损路径与有损量化路径走各自最短处理链路。

## 9. 渐进式实施计划（里程碑）
- M1（基础能力）
  - 识别图片任务，切换到 ImageSettingsPanel（左列：格式+分辨率；右列：质量滑块）。
  - 支持 JPEG/PNG/WebP 基础编码；
  - 实现 PNG 的离散档位映射与参数生效（含 100/80/60/40/20/0）。
- M2（体验优化）
  - 错误处理与边界提示完善；
  - 图片质量说明文案与锚点高亮；
  - 可选：缩略图预估或对比预览。
- M3（批量与混合）
  - 批量任务对图片设置的覆盖策略；
  - 与视频任务混合时的调度与 UI 统一。

## 10. 验收标准
- 正确识别图片任务并显示图片设置面板（左列/右列布局符合）；
- 滑块 0/20/40/60/80/100 分别映射到：32/64/96/128/192 色与无损（-compression_level 90），与给定 ffmpeg 参数一致：
  - 80：-vf "split[s0][s1];[s0]palettegen=max_colors=192:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a"
  - 60（默认）：-vf "split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a"
  - 40：-vf "split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=full[p];[s1][p]paletteuse=dither=sierra2_4a"
  - 20：等价 64 色，0：等价 32 色（同链路）；
  - 100：无损 -compression_level 90；
- 已完成任务锁定规则生效；
- 批量任务执行正常，状态可视且无崩溃；
- JPEG/PNG/WebP 覆盖率 ≥ 95%，错误反馈清晰。