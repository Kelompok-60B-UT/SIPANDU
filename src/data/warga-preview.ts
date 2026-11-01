import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { getRoleFromJwt } from '@/utils/roles'
import type { Notification, Profile, UserRole } from '@/types/database.types'
import type { RegionOption } from '@/types'
import type { DashboardStats, TicketListItem } from '@/data/tickets'

export interface WargaUserContext {
  isPreview: boolean
  email: string
  role: UserRole
  profile: Profile
  region: RegionOption
}

export const PREVIEW_REGIONS: RegionOption[] = [
  { id: 1, name: 'RT 01', rw: '06' },
  { id: 2, name: 'RT 02', rw: '06' },
  { id: 3, name: 'RT 03', rw: '06' },
  { id: 4, name: 'RT 04', rw: '06' },
  { id: 5, name: 'RT 05', rw: '06' },
  { id: 6, name: 'RT 06', rw: '06' },
  { id: 7, name: 'RT 07', rw: '06' },
  { id: 8, name: 'RT 08', rw: '06' },
]

export const PREVIEW_USER: WargaUserContext = {
  isPreview: true,
  email: 'dewi.lestari@gmail.com',
  role: 'warga',
  profile: {
    id: 'preview-warga-id',
    full_name: 'Dewi Lestari',
    phone: '0812 3456 7890',
    address: 'Jl. Parakansaat, Gang Melati No. 12',
    region_id: 3,
    is_active: true,
    is_rt_verified: true,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-31T08:00:00Z',
  },
  region: { id: 3, name: 'RT 03', rw: '06' },
}

export const PREVIEW_STATS: DashboardStats = {
  total: 5,
  draft: 0,
  terkirim: 1,
  diverifikasi_rt: 1,
  diproses_rw: 1,
  selesai: 1,
  ditolak: 1,
}

export const PREVIEW_TICKETS: TicketListItem[] = [
  {
    id: 266,
    ticket_number: 'PG-2026-0266',
    user_id: 'preview-warga-id',
    category_id: 2,
    region_id: 3,
    title: 'Sampah menumpuk di Gang Melati',
    description: 'Tumpukan sampah belum terangkut selama beberapa hari di ujung Gang Melati.',
    location_landmark: 'Gang Melati',
    status: 'terkirim',
    handler_rt_id: null,
    handler_rw_id: null,
    rejection_reason: null,
    rating: null,
    rating_comment: null,
    submitted_at: '2026-10-31T08:15:00Z',
    verified_at: null,
    processed_at: null,
    completed_at: null,
    rejected_at: null,
    rated_at: null,
    created_at: '2026-10-31T08:15:00Z',
    updated_at: '2026-10-31T08:15:00Z',
    categories: { id: 2, name: 'Kebersihan' },
    regions: { id: 3, name: 'RT 03', rw: '06' },
  },
  {
    id: 265,
    ticket_number: 'PG-2026-0265',
    user_id: 'preview-warga-id',
    category_id: 1,
    region_id: 3,
    title: 'Lampu jalan padam di Gang Mawar',
    description: 'Lampu penerangan jalan umum di pertigaan Gang Mawar padam sejak malam kemarin.',
    location_landmark: 'Gang Mawar',
    status: 'diverifikasi_rt',
    handler_rt_id: 'preview-rt-id',
    handler_rw_id: null,
    rejection_reason: null,
    rating: null,
    rating_comment: null,
    submitted_at: '2026-10-30T10:00:00Z',
    verified_at: '2026-10-30T14:00:00Z',
    processed_at: null,
    completed_at: null,
    rejected_at: null,
    rated_at: null,
    created_at: '2026-10-30T10:00:00Z',
    updated_at: '2026-10-30T14:00:00Z',
    categories: { id: 1, name: 'Penerangan' },
    regions: { id: 3, name: 'RT 03', rw: '06' },
  },
  {
    id: 264,
    ticket_number: 'PG-2026-0264',
    user_id: 'preview-warga-id',
    category_id: 1,
    region_id: 3,
    title: 'Jalan berlubang dekat pos ronda',
    description: 'Terdapat lubang cukup dalam di depan pos ronda RT 03 yang membahayakan pengendara.',
    location_landmark: 'Dekat pos ronda RT 03',
    status: 'diproses_rw',
    handler_rt_id: 'preview-rt-id',
    handler_rw_id: 'preview-rw-id',
    rejection_reason: null,
    rating: null,
    rating_comment: null,
    submitted_at: '2026-10-30T08:00:00Z',
    verified_at: '2026-10-30T09:30:00Z',
    processed_at: '2026-10-30T13:00:00Z',
    completed_at: null,
    rejected_at: null,
    rated_at: null,
    created_at: '2026-10-30T08:00:00Z',
    updated_at: '2026-10-30T13:00:00Z',
    categories: { id: 1, name: 'Infrastruktur' },
    regions: { id: 3, name: 'RT 03', rw: '06' },
  },
  {
    id: 261,
    ticket_number: 'PG-2026-0261',
    user_id: 'preview-warga-id',
    category_id: 1,
    region_id: 3,
    title: 'Saluran air tersumbat di Gang Melati',
    description:
      'Saluran air di depan Gang Melati tersumbat daun dan sampah sejak 27 Oktober. Saat hujan, air meluap ke jalan dan mengganggu akses warga. Mohon bantuan pembersihan saluran.',
    location_landmark: 'Gang Melati, depan rumah No. 12',
    status: 'selesai',
    handler_rt_id: 'preview-rt-id',
    handler_rw_id: 'preview-rw-id',
    rejection_reason: null,
    rating: null,
    rating_comment: null,
    submitted_at: '2026-10-28T01:15:00Z',
    verified_at: '2026-10-28T03:00:00Z',
    processed_at: '2026-10-29T02:00:00Z',
    completed_at: '2026-10-30T08:30:00Z',
    rejected_at: null,
    rated_at: null,
    created_at: '2026-10-28T01:15:00Z',
    updated_at: '2026-10-30T08:30:00Z',
    categories: { id: 1, name: 'Drainase' },
    regions: { id: 3, name: 'RT 03', rw: '06' },
  },
  {
    id: 262,
    ticket_number: 'PG-2026-0262',
    user_id: 'preview-warga-id',
    category_id: 1,
    region_id: 3,
    title: 'Perbaikan jalan di luar RW 06',
    description: 'Usulan perbaikan jalan di perbatasan luar RW 06.',
    location_landmark: 'Luar batas RW 06',
    status: 'ditolak',
    handler_rt_id: 'preview-rt-id',
    handler_rw_id: null,
    rejection_reason:
      'Lokasi berada di luar wilayah RW 06. Silakan lapor ke pengurus wilayah setempat.',
    rating: null,
    rating_comment: null,
    submitted_at: '2026-10-28T07:30:00Z',
    verified_at: null,
    processed_at: null,
    completed_at: null,
    rejected_at: '2026-10-28T10:15:00Z',
    rated_at: null,
    created_at: '2026-10-28T07:30:00Z',
    updated_at: '2026-10-28T10:15:00Z',
    categories: { id: 1, name: 'Infrastruktur' },
    regions: { id: 3, name: 'RT 03', rw: '06' },
  },
]

export const PREVIEW_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    user_id: 'preview-warga-id',
    ticket_id: 261,
    message: 'Tiket #0261 selesai ditangani|Bukti penyelesaian tersedia',
    is_read: false,
    created_at: '2026-10-30T08:30:00Z',
  },
  {
    id: 2,
    user_id: 'preview-warga-id',
    ticket_id: 265,
    message: 'Tiket #0265 diteruskan ke RW|Diverifikasi oleh Ketua RT 03',
    is_read: false,
    created_at: '2026-10-30T07:00:00Z',
  },
]

export async function getWargaUserContext(): Promise<WargaUserContext> {
  if (!isSupabaseConfigured()) {
    return PREVIEW_USER
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return PREVIEW_USER

    const role = getRoleFromJwt(user.app_metadata) ?? 'warga'
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return {
        ...PREVIEW_USER,
        isPreview: false,
        email: user.email ?? PREVIEW_USER.email,
        role,
      }
    }

    let region =
      PREVIEW_REGIONS.find((r) => r.id === profile.region_id) ??
      PREVIEW_REGIONS[2]

    if (profile.region_id) {
      const { data: regionRow } = await supabase
        .from('regions')
        .select('id, name, rw')
        .eq('id', profile.region_id)
        .single()
      if (regionRow) region = regionRow
    }

    return {
      isPreview: false,
      email: user.email ?? '',
      role,
      profile,
      region,
    }
  } catch {
    return PREVIEW_USER
  }
}
