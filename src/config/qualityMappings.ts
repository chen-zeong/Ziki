// 编码器质量参数映射配置

export interface QualityMapping {
  paramType: 'crf' | 'qv' | 'profile';
  values: number[] | string[]; // 对应5个质量等级的参数值
  defaultIndex: number; // 默认质量等级索引 (0-4)
}

export interface EncoderConfig {
  software: QualityMapping;
  hardware?: QualityMapping; // 硬件加速时的参数（通用）
  hardwareVendors?: Record<'nvidia' | 'intel' | 'amd', QualityMapping>; // Windows等平台的厂商细分
}

// 质量等级定义 (0-4 对应 极低-极高)
export const QUALITY_LEVELS = [
  { name: '极低质量', range: [2, 20] },
  { name: '低质量', range: [21, 40] },
  { name: '中等质量', range: [41, 60] },
  { name: '高质量', range: [61, 85] },
  { name: '极高质量', range: [86, 98] }
];

// 将各种可能的编码器名称规范化为映射表中使用的键
function normalizeCodecName(codec: string): string {
  const cleaned = (codec || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleaned.includes('h264') || cleaned.includes('x264')) return 'h264';
  if (cleaned.includes('h265') || cleaned.includes('hevc') || cleaned.includes('x265')) return 'h265';
  if (cleaned.includes('prores')) return 'prores';
  if (cleaned.includes('av1')) return 'av1';
  if (cleaned.includes('vp9')) return 'vp9';
  // WMV9：兼容 wmv9/wmv2/含 wmv 的名称
  if (cleaned.includes('wmv9') || cleaned.includes('wmv2') || cleaned.includes('wmv')) return 'wmv9';
  return cleaned;
}

// 编码器参数映射配置
export const ENCODER_QUALITY_MAPPINGS: Record<string, EncoderConfig> = {
  // H.264 编码器
  'h264': {
    software: {
      paramType: 'crf',
      values: [32, 28, 23, 20, 18], // 极低到极高质量的CRF值 (CRF越大质量越低)
      defaultIndex: 2 // 默认高质量 (CRF 23)
    },
    hardware: {
      paramType: 'qv',
      values: [40, 55, 70, 75, 80], // -q:v 值（数值越大画质越高）
      defaultIndex: 2 // 默认值改为 q:v 70
    },
    hardwareVendors: {
      nvidia: { paramType: 'qv', values: [40, 55, 70, 75, 80], defaultIndex: 2 }, // NVENC 默认 q:v 70
      intel:  { paramType: 'qv', values: [40, 55, 70, 75, 80], defaultIndex: 2 }, // QSV 默认 q:v 70
      amd:    { paramType: 'qv', values: [40, 55, 70, 75, 80], defaultIndex: 2 }  // AMF 默认 q:v 70
    }
  },
  
  // H.265 编码器
  'h265': {
    software: {
      paramType: 'crf',
      values: [32, 28, 23, 20, 18],
      defaultIndex: 2
    },
    hardware: {
      paramType: 'qv',
      values: [40, 55, 70, 75, 80],
      defaultIndex: 2
    },
    hardwareVendors: {
      // Windows 厂商分支：使用 CRF 语义映射，便于与软件编码保持一致
      nvidia: { paramType: 'crf', values: [32, 28, 23, 20, 18], defaultIndex: 2 }, // NVENC -> 后端映射到 -cq
      intel:  { paramType: 'crf', values: [32, 28, 23, 20, 18], defaultIndex: 2 }, // QSV   -> 后端映射到 -global_quality
      amd:    { paramType: 'crf', values: [32, 28, 23, 20, 18], defaultIndex: 2 }  // AMF   -> 后端映射到 -q:v（近似）
     }
  },
  
  // ProRes 编码器
  'prores': {
    software: {
      paramType: 'profile',
      values: ['proxy', 'lt', 'standard', 'hq', '4444'], // ProRes profiles
      defaultIndex: 3 // 默认 hq (高质量)
    }
  },
  
  // AV1 编码器
  'av1': {
    software: {
      paramType: 'crf',
      values: [40, 35, 28, 23, 18],
      defaultIndex: 3
    },
    hardware: {
      paramType: 'qv',
      values: [40, 55, 70, 75, 80],
      defaultIndex: 2
    }
  },
  
  // VP9 编码器
  'vp9': {
    software: {
      paramType: 'crf',
      values: [40, 35, 28, 23, 18],
      defaultIndex: 3
    }
  },

  // WMV9 编码器（-q:v 0-31，0最高，默认5）
  'wmv9': {
    software: {
      paramType: 'qv',
      values: [31, 24, 16, 8, 5], // 质量等级映射到 0-31（数值越小画质越高）
      defaultIndex: 4 // 默认使用 5（高质量）
    }
  }
};

// 将滑动条值 (0-100) 转换为质量等级索引 (0-4)
export function getQualityLevelIndex(sliderValue: number): number {
  for (let i = 0; i < QUALITY_LEVELS.length; i++) {
    const [min, max] = QUALITY_LEVELS[i].range;
    if (sliderValue >= min && sliderValue <= max) {
      return i;
    }
  }
  return 2; // 默认返回中等质量
}

// 获取编码器的质量参数（支持连续调节）
export function getEncoderQualityParam(
  codec: string,
  isHardwareAccelerated: boolean,
  sliderValue: number
): { paramType: string; value: number | string } {
  // 标准化编码器名称
  const normalizedCodec = normalizeCodecName(codec);
  
  const encoderConfig = ENCODER_QUALITY_MAPPINGS[normalizedCodec];
  
  if (!encoderConfig) {
    console.log('Unknown encoder, available encoders:', Object.keys(ENCODER_QUALITY_MAPPINGS));
    // 未知编码器，返回默认CRF
    return { paramType: 'crf', value: 23 };
  }
  
  // 先选择通用的软件/硬件映射
  let mapping = (isHardwareAccelerated && encoderConfig.hardware) 
    ? encoderConfig.hardware 
    : encoderConfig.software;

  // 如果是硬件加速并且存在按厂商细分，则根据codec名称判断使用哪一家
  if (isHardwareAccelerated && encoderConfig.hardwareVendors) {
    const raw = (codec || '').toLowerCase();
    let vendor: 'nvidia' | 'intel' | 'amd' | null = null;
    if (raw.includes('nvenc') || raw.includes('cuda')) vendor = 'nvidia';
    else if (raw.includes('qsv')) vendor = 'intel';
    else if (raw.includes('amf')) vendor = 'amd';

    if (vendor && encoderConfig.hardwareVendors[vendor]) {
      mapping = encoderConfig.hardwareVendors[vendor];
    }
  }
  
  // 对于ProRes profile，仍然使用离散值
  if (mapping.paramType === 'profile') {
    const qualityIndex = getQualityLevelIndex(sliderValue);
    const clampedIndex = Math.max(0, Math.min(4, qualityIndex));
    return {
      paramType: mapping.paramType,
      value: mapping.values[clampedIndex]
    };
  }
  
  // 对于 WMV9 的 -q:v（0-31，数值越小质量越高），需要反向映射
  if (normalizedCodec === 'wmv9' && mapping.paramType === 'qv') {
    const worst = 31; // 最差
    const best = 0;  // 最好（支持到0）
    const normalizedSlider = (sliderValue - 2) / 96; // 0-1
    const interpolatedValue = worst + (best - worst) * normalizedSlider; // 滑块越大，值越小
    const roundedValue = Math.max(0, Math.min(31, Math.round(interpolatedValue)));
    return { paramType: mapping.paramType, value: roundedValue };
  }
  
  // 对于数值参数（CRF、qv），使用线性插值实现连续调节
  const values = mapping.values as number[];
  // 根据参数类型选择映射方向
  const isCRF = mapping.paramType === 'crf';
  const minValue = isCRF ? Math.max(...values) : Math.min(...values); // CRF: 大为差; QV: 小为差
  const maxValue = isCRF ? Math.min(...values) : Math.max(...values); // CRF: 小为优; QV: 大为优
  
  // 将滑块值(2-98)映射到参数范围
  const normalizedSlider = (sliderValue - 2) / 96; // 0-1
  const interpolatedValue = minValue + (maxValue - minValue) * normalizedSlider;
  const roundedValue = Math.round(interpolatedValue);
  
  return {
    paramType: mapping.paramType,
    value: roundedValue
  };
}

// 获取编码器的默认质量参数
export function getDefaultQualityParam(
  codec: string,
  isHardwareAccelerated: boolean
): { paramType: string; value: number | string; sliderValue: number } {
  const normalizedCodec = normalizeCodecName(codec);
  const encoderConfig = ENCODER_QUALITY_MAPPINGS[normalizedCodec];
  
  if (!encoderConfig) {
    return { paramType: 'crf', value: 23, sliderValue: 60 };
  }
  
  // 先选择通用的软件/硬件映射
  let mapping = (isHardwareAccelerated && encoderConfig.hardware) 
    ? encoderConfig.hardware 
    : encoderConfig.software;

  // 如果是硬件加速并且存在按厂商细分，则根据codec名称判断使用哪一家
  if (isHardwareAccelerated && encoderConfig.hardwareVendors) {
    const raw = (codec || '').toLowerCase();
    let vendor: 'nvidia' | 'intel' | 'amd' | null = null;
    if (raw.includes('nvenc') || raw.includes('cuda')) vendor = 'nvidia';
    else if (raw.includes('qsv')) vendor = 'intel';
    else if (raw.includes('amf')) vendor = 'amd';

    if (vendor && encoderConfig.hardwareVendors[vendor]) {
      mapping = encoderConfig.hardwareVendors[vendor];
    }
  }
  
  // WMV9 默认值：-q:v 5，对应滑块位置约 83
  if (normalizedCodec === 'wmv9' && mapping.paramType === 'qv') {
    return { paramType: 'qv', value: 5, sliderValue: 83 };
  }
  
  const defaultIndex = mapping.defaultIndex;

  // 计算默认滑块值
  let sliderValue: number;
  if (mapping.paramType === 'profile') {
    const qualityLevel = QUALITY_LEVELS[defaultIndex];
    sliderValue = Math.round((qualityLevel.range[0] + qualityLevel.range[1]) / 2);
  } else {
    const values = mapping.values as number[];
    const isCRF = mapping.paramType === 'crf';
    const minValue = isCRF ? Math.max(...values) : Math.min(...values);
    const maxValue = isCRF ? Math.min(...values) : Math.max(...values);
    const target = values[defaultIndex] as number;
    const t = (maxValue === minValue) ? 1 : (target - minValue) / (maxValue - minValue);
    sliderValue = Math.max(2, Math.min(98, Math.round(t * 96 + 2)));
  }
  
  return {
    paramType: mapping.paramType,
    value: mapping.values[defaultIndex],
    sliderValue
  };
}