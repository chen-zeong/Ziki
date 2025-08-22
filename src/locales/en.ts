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
    unknown: 'Unknown'
  },

  // File Upload
  fileUpload: {
    title: 'Drag video files here',
    subtitle: 'or click to select files',
    supportedFormats: 'Supported formats: MP4, AVI, MOV, MKV, WMV, FLV, WEBM',
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
    original: 'Original'
  },

  // Task List
  taskList: {
    title: 'Task List',
    noTasks: 'No tasks',
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
    deleteTask: 'Delete Task',
    compressionComparison: 'Before/After Comparison',
    fileSize: 'File Size',
    frameRate: 'Frame Rate',
    statusPending: 'Pending',
    statusQueued: 'Queued',
    statusProcessing: 'Processing',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    noFilteredTasks: 'No tasks match the filter criteria',
    uploadHint: 'Upload files to start compression',
    fileInfo: 'File Information'
  },

  // Output Folder
  outputFolder: {
    title: 'Output Folder Settings',
    selectFolder: 'Select Folder',
    currentPath: 'Current Path',
    defaultPath: 'Default Path'
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
    addFiles: 'Add Files'
  },

  // Status
  status: {
    noOutputPath: 'No output path set',
    ready: 'Ready',
    tasks: 'Tasks'
  }
};