import { connection, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { getRoleFromJwt } from '@/utils/roles'
import { statusLabelId } from '@/utils/transition'
import { siteConfig } from '@/config/site'
import type { TicketStatus } from '@/types/database.types'

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const day = String(wib.getUTCDate()).padStart(2, '0')
  const month = MONTHS_SHORT[wib.getUTCMonth()]
  const year = wib.getUTCFullYear()
  const hours = String(wib.getUTCHours()).padStart(2, '0')
  const mins = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year} ${hours}.${mins} WIB`
}

interface RawExportTicket {
  ticketNumber: string
  title: string
  categoryName: string
  regionName: string
  rw: string
  reporterName: string
  phone: string
  status: TicketStatus
  locationLandmark: string
  description: string
  submittedAt: string | null
  verifiedAt: string | null
  processedAt: string | null
  completedAt: string | null
  rating: number | null
  ratingComment: string | null
  rejectionReason: string | null
}

const PREVIEW_TICKETS_RAW: RawExportTicket[] = [
  {
    ticketNumber: 'PG-2026-0266',
    title: 'Sampah menumpuk di Gang Melati',
    categoryName: 'Kebersihan',
    regionName: 'RT 03',
    rw: siteConfig.rwNumber,
    reporterName: 'Dewi Lestari',
    phone: '0812 3456 7890',
    status: 'terkirim',
    locationLandmark: 'Gang Melati',
    description:
      'Tumpukan sampah belum terangkut selama beberapa hari di ujung Gang Melati.',
    submittedAt: '2026-10-31T08:15:00Z',
    verifiedAt: null,
    processedAt: null,
    completedAt: null,
    rating: null,
    ratingComment: null,
    rejectionReason: null,
  },
  {
    ticketNumber: 'PG-2026-0265',
    title: 'Lampu jalan padam di Gang Mawar',
    categoryName: 'Penerangan',
    regionName: 'RT 03',
    rw: siteConfig.rwNumber,
    reporterName: 'Dewi Lestari',
    phone: '0812 3456 7890',
    status: 'diverifikasi_rt',
    locationLandmark: 'Gang Mawar',
    description:
      'Lampu penerangan jalan umum di pertigaan Gang Mawar padam sejak malam kemarin.',
    submittedAt: '2026-10-30T10:00:00Z',
    verifiedAt: '2026-10-30T14:00:00Z',
    processedAt: null,
    completedAt: null,
    rating: null,
    ratingComment: null,
    rejectionReason: null,
  },
  {
    ticketNumber: 'PG-2026-0264',
    title: 'Jalan berlubang dekat pos ronda',
    categoryName: 'Infrastruktur',
    regionName: 'RT 03',
    rw: siteConfig.rwNumber,
    reporterName: 'Dewi Lestari',
    phone: '0812 3456 7890',
    status: 'diproses_rw',
    locationLandmark: 'Dekat pos ronda RT 03',
    description:
      'Terdapat lubang cukup dalam di depan pos ronda RT 03 yang membahayakan pengendara.',
    submittedAt: '2026-10-30T08:00:00Z',
    verifiedAt: '2026-10-30T09:30:00Z',
    processedAt: '2026-10-30T13:00:00Z',
    completedAt: null,
    rating: null,
    ratingComment: null,
    rejectionReason: null,
  },
  {
    ticketNumber: 'PG-2026-0263',
    title: 'Genangan air di Jalan Cempaka',
    categoryName: 'Drainase',
    regionName: 'RT 02',
    rw: siteConfig.rwNumber,
    reporterName: 'Siti Aminah',
    phone: '0813 9876 5432',
    status: 'diproses_rw',
    locationLandmark: 'Jalan Cempaka No. 4',
    description:
      'Saluran air tersumbat menyebabkan genangan di badan jalan saat hujan deras.',
    submittedAt: '2026-10-29T07:30:00Z',
    verifiedAt: '2026-10-29T09:00:00Z',
    processedAt: '2026-10-30T08:30:00Z',
    completedAt: null,
    rating: null,
    ratingComment: null,
    rejectionReason: null,
  },
  {
    ticketNumber: 'PG-2026-0261',
    title: 'Saluran air tersumbat di Gang Melati',
    categoryName: 'Drainase',
    regionName: 'RT 03',
    rw: siteConfig.rwNumber,
    reporterName: 'Dewi Lestari',
    phone: '0812 3456 7890',
    status: 'selesai',
    locationLandmark: 'Gang Melati No. 12',
    description:
      'Saluran air di depan Gang Melati tersumbat daun dan sampah sejak 27 Oktober.',
    submittedAt: '2026-10-28T01:15:00Z',
    verifiedAt: '2026-10-28T03:00:00Z',
    processedAt: '2026-10-29T02:00:00Z',
    completedAt: '2026-10-30T08:30:00Z',
    rating: 5,
    ratingComment:
      'Penanganan sangat cepat, saluran air sudah bersih dan lancar kembali.',
    rejectionReason: null,
  },
  {
    ticketNumber: 'PG-2026-0262',
    title: `Perbaikan jalan di luar ${siteConfig.rwShortLabel}`,
    categoryName: 'Infrastruktur',
    regionName: 'RT 03',
    rw: siteConfig.rwNumber,
    reporterName: 'Dewi Lestari',
    phone: '0812 3456 7890',
    status: 'ditolak',
    locationLandmark: `Luar batas ${siteConfig.rwShortLabel}`,
    description: `Usulan perbaikan jalan di perbatasan luar ${siteConfig.rwShortLabel}.`,
    submittedAt: '2026-10-28T07:30:00Z',
    verifiedAt: null,
    processedAt: null,
    completedAt: null,
    rating: null,
    ratingComment: null,
    rejectionReason:
      `Lokasi berada di luar wilayah ${siteConfig.rwShortLabel}. Silakan lapor ke pengurus wilayah setempat.`,
  },
]

export async function GET(request: Request) {
  await connection()

  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') ?? 'json').toLowerCase()
  const todayIso = new Date().toISOString().slice(0, 10)
  const rwSlug = siteConfig.rwShortLabel.toLowerCase().replace(/\s+/g, '')
  let baseFilename = `rekap-sipandu-${rwSlug}-${todayIso}`

  let rawTickets: RawExportTicket[] = []
  let totalTickets = 0
  let perStatus: Record<string, number> = {}
  let perRegion: Record<string, number> = {}
  let perCategory: Record<string, number> = {}

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Layanan basis data belum terkonfigurasi' },
        { status: 500 },
      )
    }

    rawTickets = PREVIEW_TICKETS_RAW
    totalTickets = 128
    perStatus = {
      terkirim: 12,
      diverifikasi_rt: 18,
      diproses_rw: 26,
      selesai: 68,
      ditolak: 4,
    }
    perRegion = {
      'RT 01': 21,
      'RT 02': 24,
      'RT 03': 34,
      'RT 04': 18,
      'RT 05': 16,
      'RT 06': 15,
    }
    perCategory = {
      Kebersihan: 32,
      Drainase: 28,
      Penerangan: 24,
      Infrastruktur: 22,
      Ketertiban: 14,
      'Layanan lainnya': 8,
    }
  } else {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 },
      )
    }

    const role = getRoleFromJwt(user.app_metadata)
    if (role !== 'ketua_rt' && role !== 'ketua_rw' && role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { data: callerProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, region_id, is_active, regions(name)')
      .eq('id', user.id)
      .single()

    if (profileErr || !callerProfile) {
      return NextResponse.json(
        { error: 'Profil pengguna tidak ditemukan' },
        { status: 403 },
      )
    }

    if (!callerProfile.is_active) {
      return NextResponse.json(
        { error: 'Akun Anda sedang dinonaktifkan' },
        { status: 403 },
      )
    }

    if (role === 'ketua_rt') {
      if (!callerProfile.region_id) {
        return NextResponse.json(
          { error: 'Wilayah RT belum diatur untuk akun Ketua RT ini' },
          { status: 403 },
        )
      }
      const regionData = callerProfile.regions as { name: string } | null
      const rtCode = (regionData?.name ?? `rt${callerProfile.region_id}`)
        .toLowerCase()
        .replace(/\s+/g, '')
      baseFilename = `rekap-sipandu-${rtCode}-${rwSlug}-${todayIso}`
    }

    let ticketsQuery = supabase
      .from('tickets')
      .select(
        `
        id,
        ticket_number,
        user_id,
        title,
        description,
        location_landmark,
        status,
        rejection_reason,
        rating,
        rating_comment,
        created_at,
        submitted_at,
        verified_at,
        processed_at,
        completed_at,
        rejected_at,
        categories (name),
        regions (name, rw)
      `,
      )
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (role === 'ketua_rt' && callerProfile.region_id) {
      ticketsQuery = ticketsQuery.eq('region_id', callerProfile.region_id)
    }

    const [ticketsRes, profilesRes] = await Promise.all([
      ticketsQuery,
      supabase.from('profiles').select('id, full_name, phone'),
    ])

    if (ticketsRes.error) {
      return NextResponse.json(
        { error: ticketsRes.error.message },
        { status: 500 },
      )
    }

    const profileMap = new Map<string, { full_name: string; phone: string | null }>()
    for (const p of profilesRes.data ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, phone: p.phone })
    }

    const tickets = ticketsRes.data ?? []
    totalTickets = tickets.length

    for (const t of tickets) {
      const reg = t.regions as { name: string; rw: string } | null
      const cat = t.categories as { name: string } | null
      const regName = reg?.name ?? 'RT -'
      const rwName = reg?.rw ?? siteConfig.rwNumber
      const catName = cat?.name ?? 'Lainnya'
      const reporter = profileMap.get(t.user_id)

      perRegion[regName] = (perRegion[regName] ?? 0) + 1
      perCategory[catName] = (perCategory[catName] ?? 0) + 1
      perStatus[t.status] = (perStatus[t.status] ?? 0) + 1

      rawTickets.push({
        ticketNumber: t.ticket_number ?? `PG-${t.id}`,
        title: t.title,
        categoryName: catName,
        regionName: regName,
        rw: rwName,
        reporterName: reporter?.full_name ?? 'Warga',
        phone: reporter?.phone ?? '-',
        status: t.status,
        locationLandmark: t.location_landmark ?? '-',
        description: t.description,
        submittedAt: t.submitted_at ?? t.created_at,
        verifiedAt: t.verified_at,
        processedAt: t.processed_at,
        completedAt: t.completed_at,
        rating: t.rating ?? null,
        ratingComment: t.rating_comment ?? null,
        rejectionReason: t.rejection_reason ?? null,
      })
    }
  }

  // Baris tabel pengaduan terformat untuk CSV & XLSX
  const tabularTicketRows = rawTickets.map((t) => ({
    'Nomor Tiket': t.ticketNumber,
    'Judul Laporan': t.title,
    'Kategori': t.categoryName,
    'Wilayah RT': t.regionName,
    'RW': t.rw,
    'Nama Pelapor': t.reporterName,
    'No. Telepon': t.phone,
    'Status': statusLabelId(t.status),
    'Patokan Lokasi': t.locationLandmark,
    'Deskripsi Laporan': t.description,
    'Tanggal Lapor': formatDateTime(t.submittedAt),
    'Tanggal Verifikasi RT': formatDateTime(t.verifiedAt),
    'Tanggal Diproses RW': formatDateTime(t.processedAt),
    'Tanggal Selesai': formatDateTime(t.completedAt),
    'Rating Warga': t.rating ? `${t.rating}/5` : '-',
    'Ulasan Rating': t.ratingComment ?? '-',
    'Catatan / Alasan Penolakan': t.rejectionReason ?? '-',
  }))

  // 1. FORMAT CSV
  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(tabularTicketRows)
    const csvData = XLSX.utils.sheet_to_csv(ws)
    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel membuka karakter teks secara presisi
    const csvWithBom = '\uFEFF' + csvData

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseFilename}.csv"`,
      },
    })
  }

  // 2. FORMAT XLSX (Excel multi-sheet)
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Daftar Pengaduan
    const wsTickets = XLSX.utils.json_to_sheet(tabularTicketRows)
    wsTickets['!cols'] = [
      { wch: 16 }, // Nomor Tiket
      { wch: 32 }, // Judul Laporan
      { wch: 18 }, // Kategori
      { wch: 14 }, // Wilayah RT
      { wch: 8 },  // RW
      { wch: 22 }, // Nama Pelapor
      { wch: 16 }, // No. Telepon
      { wch: 18 }, // Status
      { wch: 26 }, // Patokan Lokasi
      { wch: 45 }, // Deskripsi Laporan
      { wch: 22 }, // Tanggal Lapor
      { wch: 22 }, // Tanggal Verifikasi RT
      { wch: 22 }, // Tanggal Diproses RW
      { wch: 22 }, // Tanggal Selesai
      { wch: 14 }, // Rating Warga
      { wch: 35 }, // Ulasan Rating
      { wch: 35 }, // Catatan / Alasan Penolakan
    ]
    XLSX.utils.book_append_sheet(wb, wsTickets, 'Daftar Pengaduan')

    // Sheet 2: Ringkasan Status
    const statusTotal = Object.values(perStatus).reduce((a, b) => a + b, 0) || totalTickets
    const statusRows = Object.entries(perStatus).map(([stKey, count]) => {
      const pct = statusTotal > 0 ? ((count / statusTotal) * 100).toFixed(1) + '%' : '0%'
      return {
        'Status Penanganan': statusLabelId(stKey as TicketStatus),
        'Jumlah Laporan': count,
        'Persentase': pct,
      }
    })
    statusRows.push({
      'Status Penanganan': 'TOTAL SEMUA PENGADUAN',
      'Jumlah Laporan': statusTotal,
      'Persentase': '100.0%',
    })
    const wsStatus = XLSX.utils.json_to_sheet(statusRows)
    wsStatus['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsStatus, 'Ringkasan Status')

    // Sheet 3: Ringkasan Wilayah RT
    const regionRows = Object.entries(perRegion).map(([rtName, count]) => {
      const pct = statusTotal > 0 ? ((count / statusTotal) * 100).toFixed(1) + '%' : '0%'
      return {
        'Wilayah': `${rtName} (${siteConfig.rwShortLabel})`,
        'Jumlah Laporan': count,
        'Persentase': pct,
      }
    })
    const wsRegion = XLSX.utils.json_to_sheet(regionRows)
    wsRegion['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsRegion, 'Ringkasan Wilayah')

    // Sheet 4: Ringkasan Kategori
    const categoryRows = Object.entries(perCategory).map(([catName, count]) => {
      const pct = statusTotal > 0 ? ((count / statusTotal) * 100).toFixed(1) + '%' : '0%'
      return {
        'Kategori Layanan': catName,
        'Jumlah Laporan': count,
        'Persentase': pct,
      }
    })
    const wsCategory = XLSX.utils.json_to_sheet(categoryRows)
    wsCategory['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsCategory, 'Ringkasan Kategori')

    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${baseFilename}.xlsx"`,
      },
    })
  }

  // 3. DEFAULT: FORMAT JSON
  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      rw: siteConfig.rwNumber,
      total_tickets: totalTickets,
      summary: {
        per_status: perStatus,
        per_region: perRegion,
        per_category: perCategory,
      },
      tickets: rawTickets,
    },
    {
      headers: {
        'Content-Disposition': `attachment; filename="${baseFilename}.json"`,
      },
    },
  )
}
