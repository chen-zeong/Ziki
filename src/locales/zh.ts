export default {
  // Time units
  timeUnits: {
    seconds: '秒',
    minutes: '分',
    hours: '小时',
    secondsShort: 's',
    minutesShort: 'm',
    hoursShort: 'h'
  },

  // Common
  common: {
    confirm: '确认',
    cancel: '取消',
    clear: '清空',
    reset: '重置',
    close: '关闭',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    remove: '移除',
    upload: '上传',
    download: '下载',
    loading: '加载中...',
    processing: '处理中...',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    unknown: '未知',
    available: '可用',
    unavailable: '不可用',
    enabled: '已启用',
    disabled: '已禁用',
    tip: '提示：',
    pleaseSelect: '请选择'
  },

  // 文件上传
  fileUpload: {
    title: '拖放视频或图片即可开始',
    subtitle: '或点击选择文件',
    description: '支持批量导入，自动识别视频与图片格式，快速建立压缩任务。',
    supportedFormats: `视频：MP4 / MOV / MKV / AVI / WEBM
图片：JPG / PNG / WEBP / TIFF / SVG / HEIC / AVIF`,
    selectFiles: '选择文件',
    dragHere: '拖拽即可开始',
    videoLabel: '视频文件',
    videoHint: '支持 MP4、MOV、MKV、AVI、WEBM 等主流格式',
    imageLabel: '图片资源',
    imageHint: '支持 JPG、PNG、WEBP、TIFF、SVG、HEIC、AVIF 等'
  },

  // 视频设置
  videoSettings: {
    format: '视频格式',
    videoCodec: '视频编码',
    audioCodec: '音频编码',
    audioSampleRate: '音频采样率',
    resolution: '分辨率',
    quality: '画质',
    crf: 'CRF',
    bitrate: '码率',
    timeRange: '时间段',
    customTimeRange: '自定义时间段',
    startTime: '开始时间',
    endTime: '结束时间',
    first30s: '前30秒',
    first1min: '前1分钟',
    middle30s: '中间30秒',
    random30s: '随机30秒',
    random1min: '随机1分钟',
    random5min: '随机5分钟',
    endTimePlaceholder: '留空表示到视频末尾',
    timeRangeHint: '提示：结束时间设为 00:00:00 或留空表示处理到视频末尾',
    hardwareAcceleration: '硬件加速',
    cpuEncoding: 'CPU编码',
    gpuAcceleration: '显卡',
    recommendedFormats: '推荐格式',
    otherFormats: '其他格式',
    incompatibleCodecs: '编码组合不兼容',
    incompatibleCodecsMessage: '当前选择的视频编码和音频编码与输出格式不兼容，请重新选择。',
    qualityPoor: '较低',
    qualityFair: '一般',
    qualityGood: '良好',
    qualityExcellent: '优秀',
    qualityLossless: '无损',
    compress: '开始压缩',
    compressing: '压缩中...',
    resumeCompress: '继续压缩',
    undo: '撤销',
    original: '原始',
    colorDepth: '色彩深度',
    colors: '色',
    qualityVeryLow: '极低质量',
    qualityLow: '低质量',
    qualityMedium: '中等质量',
    qualityHigh: '高质量',
    qualityVeryHigh: '极高质量',
    qualityBetter: '更好的画质',
    qualitySame: '相同的画质',
    qualityWorse: '更差的画质',
    qualityChange: '与默认参数相比变化 {delta} 级，当前属于 {direction}。',
    profileHint: '使用 {profile} 编码配置',
    qvHint: '编码参数 -q:v {value}',
    bitDepth10Unavailable: '源视频位深不足，无法升到10bit（仅支持向下转换）',
    bitDepth12Unavailable: '源视频位深不足，无法升到12bit（仅支持向下转换）',
    viewSupportedList: '支持列表',
    supportedHardwareEncodersTitle: '支持的硬件编码格式',
    noHardwareEncoders: '当前系统不支持任何硬件编码格式',
    intelMacNoQvNotice: '注意: 根据系统限制, Intel 版本的 macOS 暂不支持使用 VideoToolbox 的质量模式 (-q:v), 本应用已禁用硬件加速.',
    lastChecked: '上次检测时间：',
    detecting: '检测中…',
    recheck: '重新检测',
    detectingHardwareEncoders: '正在检测硬件编码器，请稍候...',
    cpuEncodingDesc: '兼容性最高，适用于所有设备，速度较慢',
    gpuSupportedDesc: '当前编码格式支持硬件加速，速度更快',
    gpuUnsupportedDesc: '当前编码格式不支持硬件加速',
    selectVideoCodecFirst: '请先选择视频编码格式',
    hardwareNotSupportedForCodec: '当前编码格式不支持硬件加速',
    selectOutputFormat: '选择输出格式',
    selectVideoCodec: '选择视频编码',
    custom: '自定义',
    customResolution: '自定义分辨率',
    width: '宽度',
    height: '高度',
    lockAspectRatio: '等比例缩放',
    selectResolution: '选择分辨率',
    tagHighCompatibility: '高兼容性',
    tagPopular: '流行',
    tagHighEfficiency: '高效',
    tagTenBitSupport: '支持10bit',
    tagMoreEfficient: '更高效',
    tagComplexEncoding: '编码复杂',
    tagLegacy: '传统',
    tagProfessional: '专业',
    tagApple: '苹果',
    tagWindows: 'Windows',
    tagOpenSource: '开源',
    tagMediumSize: '体积中等',
    tagLargestSize: '体积最大',
    tagSmallestSize: '体积最小',
    tagGoogleDeveloped: '谷歌开发',
    tagWebOptimized: 'Web优化',
    tagFlashDeveloped: 'Flash开发',
    tagOutdated: '过时',
    tagHighQualityImage: '高质量动态图片',
    tagMainstream: '主流',
    tagStrongCompatibility: '兼容性强',
    tagAppleEcosystem: 'Apple生态',
    tagMultiTrackSubtitle: '多音轨字幕',
    tagOldFormat: '老牌格式',
    tagLargeSize: '体积大',
    tagWindowsOptimized: 'Windows优化',
    pngPaletteWarning: '使用调色板压缩，可能缺失部分色彩（若追求更小体积，建议改用JPG或WebP格式）'
   },
  // 任务列表
  taskList: {
    title: '任务列表',
    noTasks: '暂无任务',
    noTasksDescription: '上传文件开始压缩',
    statusLabel: '状态',
    status: {
      pending: '等待中',
      paused: '已暂停',
      processing: '处理中',
      completed: '已完成',
      failed: '失败'
    },
    createdAt: '创建时间',
    progress: '进度',
    format: '格式',
    resolution: '分辨率',
    bitrate: '码率',
    originalSize: '原始大小',
    compressedSize: '压缩后大小',
    compressionRatio: '压缩比',
    duration: '时长',
    updatedAt: '更新时间',
    details: '详细信息',
    openOutputFolder: '打开输出文件夹',
    showDetails: '显示详情',
    hideDetails: '隐藏详情',
    delete: '删除',
    deleteTask: '删除任务',
    compressionComparison: '压缩前后对比',
    metric: '项目',
    before: '压缩前',
    after: '压缩后',
    fileSize: '文件大小',
    frameRate: '帧率',
    audioCodec: '音频编码',
    audioSampleRate: '音频采样率',
    colorDepth: '色彩深度',
    statusPending: '等待中',
    statusQueued: '排队中',
    statusProcessing: '压缩中',
    statusPaused: '已暂停',
    statusCompleted: '压缩完成',
    statusFailed: '压缩失败',
    statusCancelled: '已取消',
    compressing: '压缩中',
    noFilteredTasks: '没有符合筛选条件的任务',
    uploadHint: '上传文件开始压缩',
    fileInfo: '文件信息',
    pauseAllTasks: '暂停所有任务',
    startAllTasks: '开始所有任务',
    clearAllTasks: '清空所有任务',
    pauseTask: '暂停任务',
    startTask: '开始任务',
    resumeTask: '恢复任务',
    remaining: '剩余',
    remainingShort: '剩余',
    clear: '清空',
    clearAllTasksConfirmActive: '当前有 {count} 个任务正在进行中，确定要清空所有任务吗？这将停止所有进行中的任务，并从队列中删除。',
    clearAllTasksConfirmSimple: '确定要清空所有任务吗？这将从队列中删除所有任务。',
    multiSelect: '多选',
    selectedCount: '已选择',
    completed: '完成'
  },

  // 输出文件夹
  outputFolder: {
    title: '输出文件夹设置',
    selectFolder: '选择文件夹',
    currentPath: '当前路径',
    defaultPath: '默认路径',
    fileNameFormat: '输出文件名格式',
    optionOriginal: '原文件名',
    optionWithTime: '+时间',
    optionWithRandom: '+随机编号',
    descOriginal: '保持原始文件名',
    descWithTime: '文件名_20240101_120000',
    descWithRandom: '文件名_abc123',
    deleteCompressedFileOnTaskDelete: '同步删除压缩文件',
    deleteCompressedFileOnTaskDeleteDesc: '删除任务记录时同时删除对应的压缩文件'
  },

  // 视频对比
  videoComparison: {
    original: '原始',
    compressed: '压缩后',
    preview: '预览',
    frameSelector: '帧选择器',
    selectFrame: '选择帧',
    timeRange: '时间段',
    resetComparison: '重置比较',
    frameNumber: '第 {number} 帧',
    noFrameSelected: '未选择',
    frameAlt: '帧 {number}'
  },

  // 主题
  theme: {
    light: '浅色模式',
    dark: '深色模式',
    toggle: '切换主题'
  },

  // 语言
  language: {
    chinese: '中文',
    english: 'English',
    switch: '切换语言'
  },

  // 错误信息
  errors: {
    fileNotSupported: '不支持的文件格式',
    compressionFailed: '压缩失败',
    fileNotFound: '文件未找到',
    invalidTimeRange: '无效的时间范围',
    networkError: '网络错误'
  },

  // 成功信息
  success: {
    compressionCompleted: '压缩完成',
    fileSaved: '文件已保存',
    settingsSaved: '设置已保存'
  },

  // 工具栏
  toolbar: {
    addFiles: '添加',
    startQueue: '开始队列',
    pauseQueue: '暂停队列',
    batchCompress: '批量压缩'
  },

  // 状态
  status: {
    noOutputPath: '未设置输出路径',
    ready: '就绪',
    tasks: '任务',
    pending: '等待中',
    queued: '排队中',
    processing: '压缩中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败'
  },

  // 日志面板
  logPanel: {
    open: '打开日志',
    close: '关闭日志',
    title: '日志',
    clear: '清空日志',
    empty: '暂无日志',
    copy: '复制',
    copied: '已复制'
  },

  // 日志消息（业务文案）
  logMessages: {
    ffmpegCommand: 'FFmpeg 命令：{name}',
    resumeFailed: '恢复失败：{name}',
    paused: '已暂停：{name}',
    importFailed: '导入失败：无法解析视频元数据。\n文件：{name}\n原因：{reason}',
    compressionFailedImage: '压缩失败（图片）：{name}',
    compressionFailedVideo: '压缩失败（视频）：{name}',
    compressionStartFailed: '压缩启动失败：{name}',
    compressionStartedImage: '开始压缩（图片）：{name}',
    compressionStartedVideo: '开始压缩（视频）：{name}',
    compressionCompletedImage: '压缩完成（图片）：{name}',
    compressionError: '压缩错误：{name} - {error}'
  },

  // 窗口按钮
  window: {
    minimize: '最小化',
    maximizeRestore: '最大化/还原',
    maximize: '最大化',
    close: '关闭'
  }
};
