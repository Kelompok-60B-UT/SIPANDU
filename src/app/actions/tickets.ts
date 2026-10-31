'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
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
import type { Ticket } from '@/types/database.types'


export async function createDraft(
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const parsed = CreateDraftSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    category_id: formData.get('category_id'),
    region_id: formData.get('region_id'),
    location_landmark: formData.get('location_landmark'),
  })
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Anda harus login untuk membuat pengaduan')

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      user_id: user.id,
      status: 'draft',
      ...parsed.data,
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
  const parsed = UpdateDraftSchema.safeParse({
    title: formData.get('title') ?? undefined,
    description: formData.get('description') ?? undefined,
    category_id: formData.get('category_id') ?? undefined,
    region_id: formData.get('region_id') ?? undefined,
    location_landmark: formData.get('location_landmark') ?? undefined,
  })
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan, silakan login kembali')

  const { error } = await supabase
    .from('tickets')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('user_id', user.id)
    .eq('status', 'draft')

  if (error) return err(supabaseErrorToMessage(error))
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}


export async function deleteDraft(ticketId: number): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
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


export async function submitTicket(ticketId: number): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { error } = await supabase.rpc('submit_ticket', { p_ticket_id: ticketId })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/warga')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}


export async function verifyTicket(ticketId: number): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('verify_ticket', { p_ticket_id: ticketId })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rt')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}


export async function rejectTicket(formData: FormData): Promise<ActionResult<undefined>> {
  const parsed = RejectTicketSchema.safeParse({
    ticket_id: formData.get('ticket_id'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')

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


export async function processTicket(ticketId: number): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('process_ticket', { p_ticket_id: ticketId })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rw')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}


export async function completeTicket(ticketId: number): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('complete_ticket', { p_ticket_id: ticketId })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/rw')
  revalidatePath(`/tickets/${ticketId}`)
  return okEmpty()
}


export async function rateTicket(formData: FormData): Promise<ActionResult<undefined>> {
  const parsed = RateTicketSchema.safeParse({
    ticket_id: formData.get('ticket_id'),
    rating: formData.get('rating'),
    comment: formData.get('comment'),
  })
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')

  const supabase = await createClient()
  const { error } = await supabase.rpc('rate_ticket', {
    p_ticket_id: parsed.data.ticket_id,
    p_rating: parsed.data.rating as unknown as never, 
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      ticket_attachments(*),
      ticket_timeline(* order by created_at asc),
      categories(id, name),
      regions(id, name, rw)
    `)
    .eq('id', ticketId)
    .single()

  if (error) return err(supabaseErrorToMessage(error))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ok(data as any)
}


export async function getStatusCounts(): Promise<ActionResult<Record<string, number>>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tickets')
    .select('status')

  if (error) return err(supabaseErrorToMessage(error))

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return ok(counts)
}

// getPublicStats — bisa dipanggil tanpa auth

export async function getPublicStats(): Promise<ActionResult<unknown>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('public_stats')
  if (error) return err(supabaseErrorToMessage(error))
  return ok(data)
}


export async function getFormOptions(): Promise<
  ActionResult<{
    regions: Array<{ id: number; name: string; rw: string }>
    categories: Array<{ id: number; name: string; description: string | null }>
  }>
> {
  const supabase = await createClient()
  const [regionsRes, categoriesRes] = await Promise.all([
    supabase.from('regions').select('id, name, rw').eq('is_active', true).order('name'),
    supabase.from('categories').select('id, name, description').eq('is_active', true).order('name'),
  ])

  if (regionsRes.error) return err(supabaseErrorToMessage(regionsRes.error))
  if (categoriesRes.error) return err(supabaseErrorToMessage(categoriesRes.error))

  return ok({ regions: regionsRes.data, categories: categoriesRes.data })
}
