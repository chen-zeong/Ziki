export default {
  // 通用
  common: {
    confirm: '确定',
    cancel: '取消',
    clear: '清除',
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
    unknown: '未知'
  },

  // 文件上传
  fileUpload: {
    title: '拖拽视频文件到此处',
    subtitle: '或点击选择文件',
    supportedFormats: '支持格式：MP4, AVI, MOV, MKV, WMV, FLV, WEBM',
    selectFiles: '选择文件',
    dragHere: '拖拽文件到此处'
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
    original: '原始'
  },

  // 任务列表
  taskList: {
    title: '任务列表',
    noTasks: '暂无任务',
    status: {
      pending: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败'
    },
    originalSize: '原始大小',
    compressedSize: '压缩后大小',
    compressionRatio: '压缩比',
    duration: '时长',
    details: '详细信息',
    openOutputFolder: '打开输出文件夹',
    deleteTask: '删除任务',
    compressionComparison: '压缩前后对比',
    fileSize: '文件大小',
    frameRate: '帧率',
    statusPending: '等待中',
    statusQueued: '排队中',
    statusProcessing: '压缩中',
    statusCompleted: '压缩完成',
    statusFailed: '压缩失败',
    noFilteredTasks: '没有符合筛选条件的任务',
    uploadHint: '上传文件开始压缩',
    fileInfo: '文件信息'
  },

  // 输出文件夹
  outputFolder: {
    title: '输出文件夹设置',
    selectFolder: '选择文件夹',
    currentPath: '当前路径',
    defaultPath: '默认路径'
  },

  // 视频对比
  videoComparison: {
    original: '原始',
    compressed: '压缩后',
    preview: '预览',
    frameSelector: '帧选择器',
    selectFrame: '选择帧',
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
    addFiles: '添加文件'
  },

  // 状态
  status: {
    noOutputPath: '未设置输出路径',
    ready: '就绪',
    tasks: '任务'
  }
};