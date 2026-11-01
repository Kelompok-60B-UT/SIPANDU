'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import {
  CreateDraftSchema,
  UpdateDraftSchema,
  RejectTicketSchema,
  RateTicketSchema,
} from '@/utils/validation'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import type { CategoryOption, PublicStats, RegionOption, Ticket } from '@/types'

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
  const parsed = CreateDraftSchema.safeParse({
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    category_id: formData.get('category_id'),
    region_id: formData.get('region_id'),
    location_landmark: String(formData.get('location_landmark') ?? '').trim(),
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
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

  const { title, description, category_id, region_id, location_landmark } =
    parsed.data

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
  const titleRaw = String(formData.get('title') ?? '').trim()
  const descRaw = String(formData.get('description') ?? '').trim()
  const catRaw = formData.get('category_id')
  const regRaw = formData.get('region_id')
  const landmarkRaw = String(formData.get('location_landmark') ?? '').trim()

  const parsed = UpdateDraftSchema.safeParse({
    ...(titleRaw ? { title: titleRaw } : {}),
    ...(descRaw ? { description: descRaw } : {}),
    ...(catRaw ? { category_id: catRaw } : {}),
    ...(regRaw ? { region_id: regRaw } : {}),
    location_landmark: landmarkRaw,
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { location_landmark, ...rest } = parsed.data
  const { error } = await supabase
    .from('tickets')
    .update({
      ...rest,
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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

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
  const parsed = RejectTicketSchema.safeParse({
    ticket_id: formData.get('ticket_id'),
    reason: String(formData.get('reason') ?? '').trim(),
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('reject_ticket', {
    p_ticket_id: parsed.data.ticket_id,
    p_reason: parsed.data.reason,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rt')
  revalidatePath(`/tickets/${parsed.data.ticket_id}`)
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
  const commentRaw = String(
    formData.get('rating_comment') ?? formData.get('comment') ?? '',
  ).trim()

  const parsed = RateTicketSchema.safeParse({
    ticket_id: formData.get('ticket_id'),
    rating: formData.get('rating'),
    comment: commentRaw,
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('rate_ticket', {
    p_ticket_id: parsed.data.ticket_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment || undefined,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath(`/tickets/${parsed.data.ticket_id}`)
  return okEmpty()
}

export type ListTicketsOptions = {
  status?: string
  page?: number
  perPage?: number
}

export async function listTickets(
  options: ListTicketsOptions = {},
): Promise<ActionResult<Ticket[]>> {
  if (!isSupabaseConfigured()) {
    return ok([])
  }

  const { status, page = 1, perPage = 20 } = options
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const supabase = await createClient()
  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status as Ticket['status'])
  }

  const { data, error } = await query
  if (error) return err(supabaseErrorToMessage(error))
  return ok(data)
}

export async function getTicketDetail(ticketId: number): Promise<
  ActionResult<
    Ticket & {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ticket_attachments: any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ticket_timeline: any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categories: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      regions: any
    }
  >
> {
  if (!isSupabaseConfigured()) {
    return err('Supabase belum dikonfigurasi')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      ticket_attachments(*),
      ticket_timeline(*),
      categories(id, name),
      regions(id, name, rw)
    `,
    )
    .eq('id', ticketId)
    .order('created_at', {
      referencedTable: 'ticket_timeline',
      ascending: true,
    })
    .single()

  if (error) return err(supabaseErrorToMessage(error))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ok(data as any)
}

export async function getStatusCounts(): Promise<
  ActionResult<Record<string, number>>
> {
  if (!isSupabaseConfigured()) {
    return ok({})
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('tickets').select('status')

  if (error) return err(supabaseErrorToMessage(error))

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return ok(counts)
}
