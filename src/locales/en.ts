export default {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    clear: 'Clear',
    reset: 'Reset',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    upload: 'Upload',
    download: 'Download',
    loading: 'Loading...',
    processing: 'Processing...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    unknown: 'Unknown',
    available: 'Available',
    unavailable: 'Unavailable',
    enabled: 'Enabled',
    disabled: 'Disabled'
  },

  // File Upload
  fileUpload: {
    title: 'Drag video files here',
    subtitle: 'or click to select files',
    supportedFormats: `MP4, AVI, MOV, MKV, WMV, FLV, WEBM
M4V, M4S, MPG, 3GP, ASF, VOB, OGV, RM, F4V,
JPG, PNG, BMP, TIFF, WEBP, SVG etc.`,
    selectFiles: 'Select Files',
    dragHere: 'Drag files here'
  },

  // Video Settings
  videoSettings: {
    format: 'Video Format',
    videoCodec: 'Video Codec',
    audioCodec: 'Audio Codec',
    audioSampleRate: 'Audio Sample Rate',
    resolution: 'Resolution',
    quality: 'Quality',
    crf: 'CRF',
    bitrate: 'Bitrate',
    timeRange: 'Time Range',
    customTimeRange: 'Custom Time Range',
    startTime: 'Start Time',
    endTime: 'End Time',
    first30s: 'First 30s',
    first1min: 'First 1 min',
    middle30s: 'Middle 30s',
    random30s: 'Random 30s',
    random1min: 'Random 1 min',
    random5min: 'Random 5 min',
    endTimePlaceholder: 'Leave empty for end of video',
    timeRangeHint: 'Tip: Set end time to 00:00:00 or leave empty to process until the end of video',
    hardwareAcceleration: 'Hardware Acceleration',
    cpuEncoding: 'CPU Encoding',
    gpuAcceleration: 'GPU Acceleration',
    recommendedFormats: 'Recommended Formats',
    otherFormats: 'Other Formats',
    incompatibleCodecs: 'Incompatible Codec Combination',
    incompatibleCodecsMessage: 'The selected video and audio codecs are not compatible with the output format. Please reselect.',
    qualityPoor: 'Poor',
    qualityFair: 'Fair',
    qualityGood: 'Good',
    qualityExcellent: 'Excellent',
    qualityLossless: 'Lossless',
    compress: 'Start Compression',
    compressing: 'Compressing...',
    original: 'Original',
    colorDepth: 'Color Depth',
    qualityVeryLow: 'Very Low Quality',
    qualityLow: 'Low Quality',
    qualityMedium: 'Medium Quality',
    qualityHigh: 'High Quality',
    qualityVeryHigh: 'Very High Quality',
    bitDepth10Unavailable: 'Source bit depth is insufficient. Up-conversion to 10-bit is not supported (down-conversion only).',
    bitDepth12Unavailable: 'Source bit depth is insufficient. Up-conversion to 12-bit is not supported (down-conversion only).',
    viewSupportedList: 'View Supported List',
    supportedHardwareEncodersTitle: 'Supported Hardware Encoders',
    noHardwareEncoders: 'No hardware encoders are supported on this system',
    intelMacNoQvNotice: 'Note: Due to system limitations, Intel macOS does not support VideoToolbox quality mode (-q:v). Hardware acceleration is disabled.',
    lastChecked: 'Last checked: ',
    detecting: 'Detecting…',
    recheck: 'Re-check',
    detectingHardwareEncoders: 'Detecting hardware encoders, please wait...',
    cpuEncodingDesc: 'Highest compatibility, works on all devices, slower speed',
    gpuSupportedDesc: 'Hardware acceleration supported for current codec, faster speed',
    gpuUnsupportedDesc: 'Hardware acceleration is not supported for current codec',
    selectVideoCodecFirst: 'Please select a video codec first',
    hardwareNotSupportedForCodec: 'Hardware acceleration is not supported for the current codec'
  },

  // Task List
  taskList: {
    title: 'Task List',
    noTasks: 'No tasks',
    noTasksDescription: 'Upload files to start compression',
    status: {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed'
    },
    originalSize: 'Original Size',
    compressedSize: 'Compressed Size',
    compressionRatio: 'Compression Ratio',
    duration: 'Duration',
    details: 'Details',
    openOutputFolder: 'Open Output Folder',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    delete: 'Delete',
    deleteTask: 'Delete Task',
    compressionComparison: 'Before/After Comparison',
    fileSize: 'File Size',
    frameRate: 'Frame Rate',
    audioCodec: 'Audio Codec',
    audioSampleRate: 'Audio Sample Rate',
    colorDepth: 'Color Depth',
    statusPending: 'Pending',
    statusQueued: 'Queued',
    statusProcessing: 'Processing',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    noFilteredTasks: 'No tasks match the filter criteria',
    uploadHint: 'Upload files to start compression',
    fileInfo: 'File Information',
    pauseAllTasks: 'Pause All Tasks',
    startAllTasks: 'Start All Tasks',
    clearAllTasks: 'Clear All Tasks',
    pauseTask: 'Pause Task',
    startTask: 'Start Task',
    resumeTask: 'Resume Task',
    remaining: 'Remaining',
    clear: 'Clear'
  },

  // Output Folder
  outputFolder: {
    title: 'Output Folder Settings',
    selectFolder: 'Select Folder',
    currentPath: 'Current Path',
    defaultPath: 'Default Path',
    fileNameFormat: 'Output File Name Format',
    optionOriginal: 'Original Name',
    optionWithTime: 'Original Name\n+Time',
    optionWithRandom: 'Original Name\n+Random',
    descOriginal: 'Keep original file name',
    descWithTime: 'filename_20240101_120000',
    descWithRandom: 'filename_abc123'
  },

  // Video Comparison
  videoComparison: {
    original: 'Original',
    compressed: 'Compressed',
    preview: 'Preview',
    frameSelector: 'Frame Selector',
    selectFrame: 'Select Frame',
    resetComparison: 'Reset Comparison',
    frameNumber: 'Frame {number}',
    noFrameSelected: 'No frame selected',
    frameAlt: 'Frame {number}'
  },

  // Theme
  theme: {
    light: 'Light Mode',
    dark: 'Dark Mode',
    toggle: 'Toggle Theme'
  },

  // Language
  language: {
    chinese: '中文',
    english: 'English',
    switch: 'Switch Language'
  },

  // Error Messages
  errors: {
    fileNotSupported: 'File format not supported',
    compressionFailed: 'Compression failed',
    fileNotFound: 'File not found',
    invalidTimeRange: 'Invalid time range',
    networkError: 'Network error'
  },

  // Success Messages
  success: {
    compressionCompleted: 'Compression completed',
    fileSaved: 'File saved',
    settingsSaved: 'Settings saved'
  },

  // Toolbar
  toolbar: {
    addFiles: 'Add Files',
    startQueue: 'Start Queue',
    pauseQueue: 'Pause Queue',
    batchCompress: 'Batch Compress'
  },

  // Status
  status: {
    noOutputPath: 'No output path set',
    ready: 'Ready',
    tasks: 'Tasks',
    pending: 'Pending',
    queued: 'Queued',
    processing: 'Processing',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Failed'
  },

  // Log Panel
  logPanel: {
    open: 'Open Logs',
    close: 'Close Logs',
    title: 'Logs',
    clear: 'Clear Logs',
    empty: 'No logs yet',
    copy: 'Copy',
    copied: 'Copied'
  },

  // Log Messages (business)
  logMessages: {
    ffmpegCommand: 'FFmpeg command: {name}',
    resumeFailed: 'Resume failed: {name}',
    paused: 'Paused: {name}',
    importFailed: 'Import failed: Unable to parse video metadata.\nFile: {name}\nReason: {reason}',
    compressionFailedImage: 'Compression failed (image): {name}',
    compressionFailedVideo: 'Compression failed (video): {name}',
    compressionStartFailed: 'Failed to start compression: {name}'
  },

  // Window Buttons
  window: {
    minimize: 'Minimize',
    maximizeRestore: 'Maximize/Restore',
    close: 'Close'
  }
};