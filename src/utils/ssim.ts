import { ssim } from 'ssim.js'

type CachedImage = {
  element: HTMLImageElement
  width: number
  height: number
}

const imageCache = new Map<string, Promise<CachedImage>>()

const loadImage = (source: string): Promise<CachedImage> => {
  if (!imageCache.has(source)) {
    const promise = new Promise<CachedImage>((resolve, reject) => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        const width = image.naturalWidth || image.width
        const height = image.naturalHeight || image.height
        if (!width || !height) {
          reject(new Error('Image dimensions are zero.'))
          return
        }
        resolve({ element: image, width, height })
      }
      image.onerror = () => reject(new Error('Failed to load image for SSIM calculation.'))
      image.src = source
    })
    imageCache.set(source, promise)
  }
  return imageCache.get(source)!
}

const extractImageData = (image: HTMLImageElement, width: number, height: number): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Unable to create 2D context for SSIM calculation.')
  }
  context.drawImage(image, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

export const calculateSSIM = async (before: string, after: string): Promise<number> => {
  if (!before || !after) {
    return 0
  }

  const [original, compressed] = await Promise.all([loadImage(before), loadImage(after)])
  const width = Math.min(original.width, compressed.width)
  const height = Math.min(original.height, compressed.height)

  if (!width || !height) {
    return 0
  }

  const originalData = extractImageData(original.element, width, height)
  const compressedData = extractImageData(compressed.element, width, height)

  const result = ssim(originalData, compressedData)
  const value = typeof result?.mssim === 'number' ? result.mssim : 0

  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}
