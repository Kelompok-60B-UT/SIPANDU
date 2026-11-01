'use server'

import { revalidatePath } from 'next/cache'
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/utils/supabase/server'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import { getRoleFromJwt } from '@/utils/roles'
import { generateStoragePath, MAX_FILE_SIZE_BYTES } from '@/utils/upload'
import type { AttachmentType } from '@/types/database.types'

export interface RegisterAttachmentParams {
  ticketId: number
  type: AttachmentType
  storagePath: string
  fileName: string
  mimeType: 'image/jpeg' | 'image/png'
  sizeBytes: number
}

export async function uploadAttachment(
  formData: FormData,
): Promise<
  ActionResult<{ id: number; storagePath: string; signedUrl: string | null }>
> {
  const ticketId = Number(formData.get('ticket_id'))
  const typeRaw = String(formData.get('type') ?? 'laporan')
  const type: AttachmentType =
    typeRaw === 'penyelesaian' ? 'penyelesaian' : 'laporan'
  const file = formData.get('file') as File | null

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return err('ID tiket tidak valid')
  }
  if (!file || file.size <= 0) {
    return err('File lampiran tidak ditemukan')
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return err('Ukuran file tidak boleh melebihi 5 MB')
  }
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return err('Format file hanya boleh berupa JPG atau PNG')
  }

  const storagePath = generateStoragePath(ticketId, type, file.name)

  if (!isSupabaseConfigured()) {
    return ok({
      id: Date.now(),
      storagePath,
      signedUrl: null,
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const role = getRoleFromJwt(user.app_metadata) ?? 'warga'

  if (type === 'penyelesaian' && role !== 'ketua_rw' && role !== 'admin') {
    return err(
      'Hanya Ketua RW atau Admin yang dapat mengunggah foto bukti penyelesaian',
    )
  }

  let dbClient = supabase
  try {
    dbClient = createAdminClient()
  } catch {
    dbClient = supabase
  }

  // Periksa tiket & batas maksimal 3 foto per jenis lampiran
  const { data: ticket, error: ticketErr } = await dbClient
    .from('tickets')
    .select('id, user_id, status')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) {
    return err('Tiket pengaduan tidak ditemukan')
  }

  if (type === 'laporan' && role !== 'admin' && ticket.user_id !== user.id) {
    return err('Anda hanya dapat mengunggah foto laporan pada tiket milik sendiri')
  }

  const { count: existingCount } = await dbClient
    .from('ticket_attachments')
    .select('*', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)
    .eq('type', type)

  if ((existingCount ?? 0) >= 3) {
    return err(
      type === 'penyelesaian'
        ? 'Maksimal 3 foto bukti penyelesaian yang dapat dilampirkan.'
        : 'Maksimal 3 foto laporan yang dapat dilampirkan.',
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await dbClient.storage
    .from('ticket-attachments')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return err(supabaseErrorToMessage(uploadError))
  }

  const { data: inserted, error: insertError } = await dbClient
    .from('ticket_attachments')
    .insert({
      ticket_id: ticketId,
      uploaded_by: user.id,
      type,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type as 'image/jpeg' | 'image/png',
      size_bytes: file.size,
    })
    .select('id')
    .single()

  if (insertError) {
    await dbClient.storage.from('ticket-attachments').remove([storagePath])
    return err(supabaseErrorToMessage(insertError))
  }

  const { data: signed } = await dbClient.storage
    .from('ticket-attachments')
    .createSignedUrl(storagePath, 3600)

  revalidatePath(`/tickets/${ticketId}`)
  revalidatePath('/dashboard/warga')
  revalidatePath('/dashboard/rt')
  revalidatePath('/dashboard/rw')
  revalidatePath('/dashboard/admin')

  return ok({
    id: inserted.id,
    storagePath,
    signedUrl: signed?.signedUrl ?? null,
  })
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

  const role = getRoleFromJwt(user.app_metadata) ?? 'warga'
  if (type === 'penyelesaian' && role !== 'ketua_rw' && role !== 'admin') {
    return err(
      'Hanya Ketua RW atau Admin yang dapat mengunggah foto bukti penyelesaian',
    )
  }

  let dbClient = supabase
  try {
    dbClient = createAdminClient()
  } catch {
    dbClient = supabase
  }

  const { data, error } = await dbClient
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
  revalidatePath('/dashboard/warga')
  revalidatePath('/dashboard/rt')
  revalidatePath('/dashboard/rw')
  revalidatePath('/dashboard/admin')
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

  const role = getRoleFromJwt(user.app_metadata) ?? 'warga'

  let dbClient = supabase
  try {
    dbClient = createAdminClient()
  } catch {
    dbClient = supabase
  }

  const { data: attachment, error: fetchError } = await dbClient
    .from('ticket_attachments')
    .select('id, ticket_id, storage_path, type, uploaded_by')
    .eq('id', attachmentId)
    .single()

  if (fetchError || !attachment) {
    return err('Lampiran tidak ditemukan')
  }

  if (
    role !== 'admin' &&
    role !== 'ketua_rw' &&
    attachment.uploaded_by !== user.id
  ) {
    return err('Anda tidak memiliki izin untuk menghapus lampiran ini')
  }

  const { error: deleteDbError } = await dbClient
    .from('ticket_attachments')
    .delete()
    .eq('id', attachmentId)

  if (deleteDbError) return err(supabaseErrorToMessage(deleteDbError))

  if (attachment.storage_path) {
    await dbClient.storage
      .from('ticket-attachments')
      .remove([attachment.storage_path])
  }

  revalidatePath(`/tickets/${attachment.ticket_id}`)
  revalidatePath('/dashboard/warga')
  revalidatePath('/dashboard/rt')
  revalidatePath('/dashboard/rw')
  revalidatePath('/dashboard/admin')
  return okEmpty()
}
