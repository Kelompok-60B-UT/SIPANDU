'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import type { CategoryOption, PublicStats, RegionOption } from '@/types'

const FALLBACK_REGIONS: RegionOption[] = [
  { id: 1, name: 'RT 01', rw: '06' },
  { id: 2, name: 'RT 02', rw: '06' },
  { id: 3, name: 'RT 03', rw: '06' },
  { id: 4, name: 'RT 04', rw: '06' },
  { id: 5, name: 'RT 05', rw: '06' },
  { id: 6, name: 'RT 06', rw: '06' },
  { id: 7, name: 'RT 07', rw: '06' },
  { id: 8, name: 'RT 08', rw: '06' },
]

const FALLBACK_CATEGORIES: CategoryOption[] = [
  {
    id: 1,
    name: 'Infrastruktur',
    description: 'Jalan rusak, drainase, penerangan jalan, dll.',
  },
  {
    id: 2,
    name: 'Kebersihan',
    description: 'Sampah, kebersihan lingkungan, got mampet, dll.',
  },
  {
    id: 3,
    name: 'Keamanan',
    description: 'Tindak kriminal, gangguan keamanan, dll.',
  },
  {
    id: 4,
    name: 'Sosial',
    description: 'Masalah sosial warga, bantuan sosial, dll.',
  },
  {
    id: 5,
    name: 'Administrasi',
    description: 'Surat menyurat, KTP, KK, sertifikat, dll.',
  },
  {
    id: 6,
    name: 'Lainnya',
    description: 'Pengaduan di luar kategori yang tersedia',
  },
]

export async function getFormOptions(): Promise<
  ActionResult<{
    regions: RegionOption[]
    categories: CategoryOption[]
  }>
> {
  if (!isSupabaseConfigured()) {
    return ok({
      regions: FALLBACK_REGIONS,
      categories: FALLBACK_CATEGORIES,
    })
  }

  try {
    const supabase = await createClient()
    const [regionsRes, categoriesRes] = await Promise.all([
      supabase
        .from('regions')
        .select('id, name, rw')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('categories')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name'),
    ])

    if (regionsRes.error) return err(supabaseErrorToMessage(regionsRes.error))
    if (categoriesRes.error) {
      return err(supabaseErrorToMessage(categoriesRes.error))
    }

    return ok({
      regions: regionsRes.data.length > 0 ? regionsRes.data : FALLBACK_REGIONS,
      categories:
        categoriesRes.data.length > 0
          ? categoriesRes.data
          : FALLBACK_CATEGORIES,
    })
  } catch (error) {
    unstable_rethrow(error)
    return ok({
      regions: FALLBACK_REGIONS,
      categories: FALLBACK_CATEGORIES,
    })
  }
}

export async function getPublicStats(): Promise<ActionResult<PublicStats>> {
  if (!isSupabaseConfigured()) {
    return err('Supabase belum dikonfigurasi')
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('public_stats')
    if (error || !data || typeof data !== 'object') {
      return err(supabaseErrorToMessage(error))
    }
    return ok(data as unknown as PublicStats)
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal memuat statistik publik')
  }
}

export async function createDraft(
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category_id = Number(formData.get('category_id'))
  const region_id = Number(formData.get('region_id'))
  const location_landmark = String(
    formData.get('location_landmark') ?? '',
  ).trim()

  if (title.length < 5 || title.length > 100) {
    return err('Judul pengaduan harus antara 5 hingga 100 karakter')
  }
  if (description.length < 10 || description.length > 1000) {
    return err('Detail keluhan harus antara 10 hingga 1000 karakter')
  }
  if (!Number.isInteger(category_id) || category_id <= 0) {
    return err('Kategori wajib dipilih')
  }
  if (!Number.isInteger(region_id) || region_id <= 0) {
    return err('RT lokasi kejadian wajib dipilih')
  }

  if (!isSupabaseConfigured()) {
    return ok({ id: Date.now() })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Anda harus masuk untuk membuat pengaduan')

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      user_id: user.id,
      status: 'draft',
      title,
      description,
      category_id,
      region_id,
      location_landmark: location_landmark || null,
    })
    .select('id')
    .single()

  if (error) return err(supabaseErrorToMessage(error))
  revalidatePath('/dashboard/warga')
  return ok({ id: data.id })
}

export async function updateDraft(
  ticketId: number,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category_id = Number(formData.get('category_id'))
  const region_id = Number(formData.get('region_id'))
  const location_landmark = String(
    formData.get('location_landmark') ?? '',
  ).trim()

  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { error } = await supabase
    .from('tickets')
    .update({
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(category_id > 0 ? { category_id } : {}),
      ...(region_id > 0 ? { region_id } : {}),
      location_landmark: location_landmark || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .eq('status', 'draft')

  if (error) return err(supabaseErrorToMessage(error))
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}

export async function deleteDraft(
  ticketId: number,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .eq('status', 'draft')

  if (error) return err(supabaseErrorToMessage(error))
  revalidatePath('/dashboard/warga')
  return okEmpty()
}

export async function submitTicket(
  ticketId: number,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_ticket', {
    p_ticket_id: ticketId,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/warga')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}

export async function verifyTicket(
  ticketId: number,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('verify_ticket', {
    p_ticket_id: ticketId,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rt')
  revalidatePath('/dashboard/rw')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}

export async function rejectTicket(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const ticketId = Number(formData.get('ticket_id'))
  const reason = String(formData.get('reason') ?? '').trim()

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return err('ID tiket tidak valid')
  }
  if (reason.length < 5 || reason.length > 500) {
    return err('Alasan penolakan wajib diisi (minimal 5 karakter)')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('reject_ticket', {
    p_ticket_id: ticketId,
    p_reason: reason,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rt')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}

export async function processTicket(
  ticketId: number,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('process_ticket', {
    p_ticket_id: ticketId,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rw')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}

export async function completeTicket(
  ticketId: number,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('complete_ticket', {
    p_ticket_id: ticketId,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rw')
  revalidatePath('/dashboard/warga')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}

export async function rateTicket(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const ticketId = Number(formData.get('ticket_id'))
  const rating = Number(formData.get('rating'))
  const comment = String(
    formData.get('rating_comment') ?? formData.get('comment') ?? '',
  ).trim()

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return err('ID tiket tidak valid')
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return err('Penilaian harus berupa angka 1 sampai 5')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('rate_ticket', {
    p_ticket_id: ticketId,
    p_rating: rating,
    p_comment: comment || undefined,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}
