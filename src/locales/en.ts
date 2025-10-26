export default {
  // Time units
  timeUnits: {
    seconds: 'seconds',
    minutes: 'minutes',
    hours: 'hours',
    secondsShort: 's',
    minutesShort: 'm',
    hoursShort: 'h'
  },

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
    disabled: 'Disabled',
    tip: 'Tip:',
    pleaseSelect: 'Please select'
  },

  // File Upload
  fileUpload: {
    title: 'Drop videos or images to start',
    subtitle: 'or click to select files',
    description: 'Batch import media and let Ziki detect video or image formats automatically.',
    supportedFormats: `Video: MP4 / MOV / MKV / AVI / WEBM
Image: JPG / PNG / WEBP / TIFF / SVG / HEIC / AVIF`,
    selectFiles: 'Choose Files',
    dragHere: 'Drag & drop ready',
    videoLabel: 'Video files',
    videoHint: 'Supports MP4, MOV, MKV, AVI, WEBM and other popular codecs',
    imageLabel: 'Image assets',
    imageHint: 'Supports JPG, PNG, WEBP, TIFF, SVG, HEIC, AVIF and more'
  },

  // Video Settings
  videoSettings: {
    format: 'Format',
    videoCodec: 'Codec',
    audioCodec: 'Audio Codec',
    audioSampleRate: 'Sample Rate',
    resolution: 'Resolution',
    quality: 'Quality',
    crf: 'CRF',
    bitrate: 'Bitrate',
    timeRange: 'Time Range',
    customTimeRange: 'Custom Range',
    startTime: 'Start Time',
    endTime: 'End Time',
    first30s: 'First 30s',
    first1min: 'First 1 min',
    middle30s: 'Middle 30s',
    random15s: 'Rand 15s',
    random30s: 'Rand 30s',
    random60s: 'Rand 60s',
    endTimePlaceholder: 'Leave empty for end of video',
    timeRangeHint: 'Tip: Set end time to 00:00:00 or leave empty to process until the end of video',
    hardwareAcceleration: 'Hardware Acceleration',
    cpuEncoding: 'CPU Encoding',
    gpuAcceleration: 'GPU',
    recommendedFormats: 'Recommended',
    otherFormats: 'Other Formats',
    incompatibleCodecs: 'Incompatible Codecs',
    incompatibleCodecsMessage: 'The selected video and audio codecs are not compatible with the output format. Please reselect.',
    qualityPoor: 'Poor',
    qualityFair: 'Fair',
    qualityGood: 'Good',
    qualityExcellent: 'Excellent',
    qualityLossless: 'Lossless',
    qualityBetter: 'better quality',
    qualitySame: 'no change',
    qualityWorse: 'more compression',
    qualityChange: 'Deviates {delta} step(s) from default → {direction}.',
    profileHint: 'Switches to the {profile} profile.',
    qvHint: 'Encoder flag -q:v {value}.',
    compress: 'Compress',
    compressing: 'Compressing...',
    resumeCompress: 'Continue',
    undo: 'Undo',
    original: 'Original',
    colorDepth: 'Color Depth',
    colors: 'colors',
    qualityVeryLow: 'Very Low',
    qualityLow: 'Low',
    qualityMedium: 'Medium',
    qualityHigh: 'High',
    qualityVeryHigh: 'Very High',
    bitDepth10Unavailable: 'Source bit depth insufficient. Up-conversion to 10-bit not supported.',
    bitDepth12Unavailable: 'Source bit depth insufficient. Up-conversion to 12-bit not supported.',
    viewSupportedList: 'Supported',
    supportedHardwareEncodersTitle: 'Supported Hardware Encoders',
    noHardwareEncoders: 'No hardware encoders supported',
    intelMacNoQvNotice: 'Note: Intel macOS does not support VideoToolbox quality mode. Hardware acceleration disabled.',
    lastChecked: 'Last checked: ',
    detecting: 'Detecting…',
    recheck: 'Re-check',
    detectingHardwareEncoders: 'Detecting hardware encoders...',
    cpuEncodingDesc: 'Highest compatibility, works on all devices, slower speed',
    gpuSupportedDesc: 'Hardware acceleration supported, faster speed',
    gpuUnsupportedDesc: 'Hardware acceleration not supported for current codec',
    selectVideoCodecFirst: 'Please select a video codec first',
    hardwareNotSupportedForCodec: 'Hardware acceleration not supported for current codec',
    selectOutputFormat: 'Select Output Format',
    selectVideoCodec: 'Select Video Codec',
    custom: 'Custom',
    customResolution: 'Custom Resolution',
    width: 'Width',
    height: 'Height',
    lockAspectRatio: 'Lock Aspect Ratio',
    selectResolution: 'Select Resolution',
    tagPopular: 'Popular',
    tagTenBitSupport: '10-bit Support',
    tagMoreEfficient: 'More Efficient',
    tagLegacy: 'Legacy',
    tagProfessional: 'Professional',
    tagApple: 'Apple',
    tagWindows: 'Windows',
    tagOpenSource: 'Open Source',
    tagMediumSize: 'Medium Size',
    tagLargestSize: 'Largest Size',
    tagSmallestSize: 'Smallest Size',
    tagGoogleDeveloped: 'Google',
    tagWebOptimized: 'Web Optimized',
    tagFlashDeveloped: 'Flash',
    tagOutdated: 'Outdated',
    tagHighQualityImage: 'High Quality Image',
    tagMainstream: 'Mainstream',
    tagAppleEcosystem: 'Apple Ecosystem',
    tagMultiTrackSubtitle: 'Multi-track',
    tagOldFormat: 'Legacy',
    tagLargeSize: 'Large Size',
    tagWindowsOptimized: 'Windows',
    pngPaletteWarning: 'Palette compression may cause color loss (for smaller file size, consider using JPG or WebP)'
   },

  // Task List
  taskList: {
    title: 'Tasks',
    noTasks: 'No tasks',
    noTasksDescription: 'Upload files to start compression',
    statusLabel: 'Status',
    status: {
      pending: 'Pending',
      paused: 'Paused',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed'
    },
    createdAt: 'Created At',
    progress: 'Progress',
    format: 'Format',
    resolution: 'Resolution',
    bitrate: 'Bitrate',
    originalSize: 'Original Size',
    compressedSize: 'Compressed Size',
    compressionRatio: 'Compression Ratio',
    duration: 'Duration',
    updatedAt: 'Updated At',
    openOutputFolder: 'Open Output Folder',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    delete: 'Delete',
    deleteTask: 'Delete Task',
    compressionComparison: 'Before/After',
    metric: 'Metric',
    before: 'Before',
    after: 'After',
    fileSize: 'File Size',
    frameRate: 'Frame Rate',
    audioCodec: 'Audio Codec',
    audioSampleRate: 'Sample Rate',
    colorDepth: 'Color Depth',
    statusPending: 'Pending',
    statusQueued: 'Queued',
    statusProcessing: 'Compressing...',
    statusPaused: 'Paused',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusCancelled: 'Cancelled',
    compressing: 'Compressing',
    noFilteredTasks: 'No tasks match filter',
    uploadHint: 'Upload files to start compression',
    fileInfo: 'File Info',
    pauseAllTasks: 'Pause All',
    startAllTasks: 'Start All',
    clearAllTasks: 'Clear All',
    pauseTask: 'Pause',
    startTask: 'Start',
    resumeTask: 'Resume',
    remaining: 'Left',
    remainingShort: 'left',
    clear: 'Clear',
    clearAllTasksConfirmActive: 'There are {count} active tasks. Clear all? This will stop all in-progress tasks.',
    clearAllTasksConfirmSimple: 'Clear all tasks? This will remove all tasks from the queue.',
    multiSelect: 'Multi-select',
    selectedCount: 'Selected',
    batchCompress: 'Compress All',
    completed: 'Completed'
  },

  // Output Folder
  outputFolder: {
    title: 'Output Settings',
    selectFolder: 'Select Folder',
    currentPath: 'Current Path',
    defaultPath: 'Default Path',
    fileNameFormat: 'File Name Format',
    optionOriginal: 'Original',
    optionWithTime: '+Time',
    optionWithRandom: '+Random',
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
    timeRange: 'Time Range',
    resetComparison: 'Reset',
    frameNumber: 'Frame {number}',
    noFrameSelected: 'No frame selected',
    frameAlt: 'Frame {number}'
  },

  // Theme
  theme: {
    light: 'Light',
    dark: 'Dark',
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
    networkError: 'Network error',
    outputPathUnavailable: 'Output folder is not accessible. Please reselect or check permissions.\nPath: {path}'
  },

  // Success Messages
  success: {
    compressionCompleted: 'Compression completed',
    fileSaved: 'File saved',
    settingsSaved: 'Settings saved'
  },

  // Toolbar
  toolbar: {
    addFiles: 'Add',
    startQueue: 'Start Queue',
    pauseQueue: 'Pause Queue',
    batchCompress: 'Batch'
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
    compressionStartFailed: 'Failed to start compression: {name}',
    compressionStartedImage: 'Started compression (image): {name}',
    compressionStartedVideo: 'Started compression (video): {name}',
    compressionCompletedImage: 'Compression completed (image): {name}',
    compressionError: 'Compression error: {name} - {error}'
  },

  // Window Buttons
  window: {
    minimize: 'Minimize',
    maximizeRestore: 'Maximize/Restore',
    maximize: 'Maximize',
    close: 'Close'
  }
};
