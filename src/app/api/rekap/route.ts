import { connection, NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { getRoleFromJwt } from '@/utils/roles'

export async function GET() {
  await connection()

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      generated_at: new Date().toISOString(),
      rw: '06',
      mode: 'preview',
      total_tickets: 128,
      summary: {
        per_status: {
          terkirim: 12,
          diverifikasi_rt: 18,
          diproses_rw: 26,
          selesai: 68,
          ditolak: 4,
        },
        per_region: {
          'RT 01': 21,
          'RT 02': 24,
          'RT 03': 34,
          'RT 04': 18,
          'RT 05': 16,
          'RT 06': 15,
        },
        per_category: {
          Kebersihan: 32,
          Drainase: 28,
          Penerangan: 24,
          Infrastruktur: 22,
          Ketertiban: 14,
          'Layanan lainnya': 8,
        },
      },
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  const role = getRoleFromJwt(user.app_metadata)
  if (role !== 'ketua_rw' && role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(
      `
      id,
      ticket_number,
      title,
      description,
      status,
      rating,
      created_at,
      submitted_at,
      completed_at,
      categories (name),
      regions (name, rw)
    `,
    )
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const perRegion: Record<string, number> = {}
  const perCategory: Record<string, number> = {}
  const perStatus: Record<string, number> = {}

  for (const t of tickets ?? []) {
    const reg = t.regions as { name: string } | null
    const cat = t.categories as { name: string } | null
    const regName = reg?.name ?? 'Tidak Diketahui'
    const catName = cat?.name ?? 'Lainnya'

    perRegion[regName] = (perRegion[regName] ?? 0) + 1
    perCategory[catName] = (perCategory[catName] ?? 0) + 1
    perStatus[t.status] = (perStatus[t.status] ?? 0) + 1
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    rw: '06',
    total_tickets: tickets?.length ?? 0,
    summary: {
      per_status: perStatus,
      per_region: perRegion,
      per_category: perCategory,
    },
    tickets,
  })
}
