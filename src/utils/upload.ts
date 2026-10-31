import type { AttachmentType } from '@/types/database.types'

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const

export function generateStoragePath(
  ticketId: number,
  type: AttachmentType,
  fileName: string,
): string {
  const sanitized = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
  return `${type}/${ticketId}/${Date.now()}_${sanitized}`
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
