import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import type { Ticket, TicketStatus } from '@/types/database.types'

export interface TicketListItem extends Ticket {
  categories: { id: number; name: string } | null
  regions: { id: number; name: string; rw: string } | null
}

export interface GetTicketsFilter {
  status?: TicketStatus
  regionId?: number
  categoryId?: number
  search?: string
  limit?: number
  offset?: number
}

export interface DashboardStats {
  total: number
  draft: number
  terkirim: number
  diverifikasi_rt: number
  diproses_rw: number
  selesai: number
  ditolak: number
}

export async function getTickets(
  filter: GetTicketsFilter = {},
): Promise<{ tickets: TicketListItem[]; total: number }> {
  if (!isSupabaseConfigured()) {
    return { tickets: [], total: 0 }
  }

  const supabase = await createClient()
  const { limit = 20, offset = 0, status, regionId, categoryId, search } = filter

  let query = supabase
    .from('tickets')
    .select(
      `
      *,
      categories (id, name),
      regions (id, name, rw)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (regionId) query = query.eq('region_id', regionId)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)

  return {
    tickets: (data ?? []) as unknown as TicketListItem[],
    total: count ?? 0,
  }
}

export async function getTicketById(ticketId: number) {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      categories (id, name),
      regions (id, name, rw),
      ticket_attachments (*),
      ticket_timeline (* order by created_at asc)
    `,
    )
    .eq('id', ticketId)
    .single()

  if (error) return null
  return data
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const stats: DashboardStats = {
    total: 0,
    draft: 0,
    terkirim: 0,
    diverifikasi_rt: 0,
    diproses_rw: 0,
    selesai: 0,
    ditolak: 0,
  }

  if (!isSupabaseConfigured()) return stats

  const supabase = await createClient()
  const { data, error } = await supabase.from('tickets').select('status')

  if (error) throw new Error(error.message)

  stats.total = data.length
  for (const row of data) {
    if (row.status in stats) {
      stats[row.status as keyof DashboardStats]++
    }
  }

  return stats
}
