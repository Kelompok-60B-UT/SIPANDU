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
