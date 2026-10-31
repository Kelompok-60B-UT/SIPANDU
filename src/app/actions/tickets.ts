'use server'

import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import {
  err,
  ok,
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
  } catch {
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
  } catch {
    return err('Gagal memuat statistik publik')
  }
}
