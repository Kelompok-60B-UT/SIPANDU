import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/utils/validation'
import type { AttachmentType } from '@/types/database.types'

export { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES }

export function generateStoragePath(
  ticketId: number,
  type: AttachmentType,
  fileName: string,
): string {
  const sanitized = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
  const timestamp = Date.now()
  return `${type}/${ticketId}/${timestamp}_${sanitized}`
}

export function validateAttachment(file: { size: number; type: string }): {
  valid: boolean
  error?: string
} {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'Ukuran file tidak boleh melebihi 5 MB' }
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return { valid: false, error: 'Format file hanya boleh berupa JPG atau PNG' }
  }

  return { valid: true }
}

/**
 * Kompresi gambar ringan berbasis HTMLCanvasElement di browser.
 * Menyesuaikan dimensi maksimal dan kualitas encoding JPG/PNG
 * agar ukuran payload di bawah target (~2.5 MB) dan aman dari batas Vercel serverless (~4.5 MB),
 * sambil tetap menerima file input asli pengguna hingga 5 MB.
 */
export async function compressImageFile(
  file: File,
  options: {
    maxDimension?: number
    quality?: number
    targetMaxSizeBytes?: number
  } = {},
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file
  }

  const {
    maxDimension = 1920,
    quality = 0.82,
    targetMaxSizeBytes = 2.5 * 1024 * 1024,
  } = options

  // Jika file sudah kecil (< 1.5 MB), tidak perlu kompresi ulang
  if (file.size < 1.5 * 1024 * 1024) {
    return file
  }

  return new Promise<File>((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Untuk PNG berukuran besar (> targetMaxSizeBytes), konversi ke JPEG agar kompresi lossy efektif
      const outputType =
        file.type === 'image/png' && file.size > targetMaxSizeBytes
          ? 'image/jpeg'
          : file.type

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }

          // Jika ukuran blob tidak lebih kecil dari file asli, tetap gunakan file asli
          if (blob.size >= file.size) {
            resolve(file)
            return
          }

          const outputFileName =
            outputType === 'image/jpeg' && !file.name.match(/\.(jpe?g)$/i)
              ? file.name.replace(/\.[^/.]+$/, '.jpg')
              : file.name

          const compressedFile = new File([blob], outputFileName, {
            type: outputType,
            lastModified: Date.now(),
          })

          resolve(compressedFile)
        },
        outputType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}
