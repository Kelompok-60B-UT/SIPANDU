'use server'

import { revalidatePath } from 'next/cache'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import { MAX_FILE_SIZE_BYTES } from '@/utils/upload'
import type { AttachmentType } from '@/types/database.types'

export interface RegisterAttachmentParams {
  ticketId: number
  type: AttachmentType
  storagePath: string
  fileName: string
  mimeType: 'image/jpeg' | 'image/png'
  sizeBytes: number
}

export async function registerAttachment(
  params: RegisterAttachmentParams,
): Promise<ActionResult<{ id: number }>> {
  const { ticketId, type, storagePath, fileName, mimeType, sizeBytes } = params

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return err('Ukuran file tidak boleh melebihi 5 MB')
  }

  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
    return err('Format file hanya boleh berupa JPG atau PNG')
  }

  if (!isSupabaseConfigured()) {
    return ok({ id: Date.now() })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { data, error } = await supabase
    .from('ticket_attachments')
    .insert({
      ticket_id: ticketId,
      uploaded_by: user.id,
      type,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select('id')
    .single()

  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/dashboard/rw')
  return ok({ id: data.id })
}

export async function deleteAttachment(
  attachmentId: number,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { data: attachment, error: fetchError } = await supabase
    .from('ticket_attachments')
    .select('id, ticket_id, storage_path, type')
    .eq('id', attachmentId)
    .single()

  if (fetchError || !attachment) {
    return err('Lampiran tidak ditemukan')
  }

  const { error: deleteDbError } = await supabase
    .from('ticket_attachments')
    .delete()
    .eq('id', attachmentId)

  if (deleteDbError) return err(supabaseErrorToMessage(deleteDbError))

  await supabase.storage
    .from('ticket-attachments')
    .remove([attachment.storage_path])

  revalidatePath(`/tickets/${attachment.ticket_id}`)
  return okEmpty()
}
