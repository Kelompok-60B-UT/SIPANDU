import { unstable_rethrow } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { listUsers } from '@/app/actions/admin'
import type { TicketStatus, UserRole } from '@/types/database.types'
import type { DashboardStats } from '@/data/tickets'

export interface AdminTicketRow {
  id: number
  ticketNumber: string
  title: string
  categoryName: string
  regionName: string
  reporterName: string
  dateShort: string
  status: TicketStatus
  statusContextNote: string
  defaultAdminNote: string
}

export interface AdminAccountRow {
  id: string
  fullName: string
  email: string
  role: UserRole
  regionLabel: string
  permissionDesc: string
  isActive: boolean
}

export interface AdminRtInfo {
  id: number
  name: string
  leaderName: string
  residentCount: number
  isActive: boolean
}

export interface AdminCategorySummary {
  id: number
  name: string
  reportCount: number
  isActive: boolean
}

export interface AdminActivityLog {
  id: number
  text: string
}

export interface AdminDashboardData {
  isPreview: boolean
  adminName: string
  unreadCount: number
  residentTotal: number
  staffActiveTotal: number
  stats: DashboardStats
  tickets: AdminTicketRow[]
  accounts: AdminAccountRow[]
  rtRegions: AdminRtInfo[]
  categories: AdminCategorySummary[]
  activities: AdminActivityLog[]
}

export const PREVIEW_ADMIN_DATA: AdminDashboardData = {
  isPreview: true,
  adminName: 'Rina Marlina',
  unreadCount: 3,
  residentTotal: 386,
  staffActiveTotal: 8,
  stats: {
    total: 128,
    draft: 0,
    terkirim: 12,
    diverifikasi_rt: 18,
    diproses_rw: 26,
    selesai: 68,
    ditolak: 4,
  },
  tickets: [
    {
      id: 266,
      ticketNumber: 'PG-2026-0266',
      title: 'Sampah menumpuk di Gang Melati',
      categoryName: 'Kebersihan',
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      dateShort: '31 Okt 2026',
      status: 'terkirim',
      statusContextNote:
        'Dewi Lestari • RT 03. Laporan dikirim pada 31 Oktober, 08.15 WIB dan sedang menunggu verifikasi Ketua RT 03.',
      defaultAdminNote:
        'Membantu koordinasi pemeriksaan lokasi bersama Ketua RT 03 dan tim kebersihan.',
    },
    {
      id: 265,
      ticketNumber: 'PG-2026-0265',
      title: 'Lampu jalan padam di Gang Mawar',
      categoryName: 'Penerangan',
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      dateShort: '30 Okt 2026',
      status: 'diverifikasi_rt',
      statusContextNote:
        'Dewi Lestari • RT 03. Laporan telah diverifikasi oleh Agus Setiawan pada 30 Oktober, 14.00 WIB.',
      defaultAdminNote:
        'Membantu RW berkoordinasi dengan teknisi penerangan. Pemeriksaan lampu dijadwalkan hari ini.',
    },
    {
      id: 263,
      ticketNumber: 'PG-2026-0263',
      title: 'Genangan air di Jalan Cempaka',
      categoryName: 'Drainase',
      regionName: 'RT 02',
      reporterName: 'Siti Aminah',
      dateShort: '29 Okt 2026',
      status: 'diproses_rw',
      statusContextNote:
        'Siti Aminah • RT 02. Sedang ditangani oleh tim sarana lingkungan RW 06 sejak 30 Oktober, 08.30 WIB.',
      defaultAdminNote:
        'Pengerukan saluran Jalan Cempaka telah rampung dilakukan bersama pengurus RW.',
    },
  ],
  accounts: [
    {
      id: 'acc-warga-1',
      fullName: 'Dewi Lestari',
      email: 'dewi.lestari@email.com',
      role: 'warga',
      regionLabel: 'RT 03',
      permissionDesc: 'Buat & pantau laporan sendiri',
      isActive: true,
    },
    {
      id: 'acc-rt-3',
      fullName: 'Agus Setiawan',
      email: 'rt03@sipandu.test',
      role: 'ketua_rt',
      regionLabel: 'RT 03',
      permissionDesc: 'Verifikasi laporan RT 03',
      isActive: true,
    },
    {
      id: 'acc-rw-6',
      fullName: 'Bambang Heryana',
      email: 'rw06@sipandu.test',
      role: 'ketua_rw',
      regionLabel: 'RW 06',
      permissionDesc: 'Tindak lanjut & penyelesaian',
      isActive: true,
    },
    {
      id: 'acc-admin-1',
      fullName: 'Rina Marlina',
      email: 'admin@sipandu.test',
      role: 'admin',
      regionLabel: 'RW 06',
      permissionDesc: 'Kelola data & status langsung',
      isActive: true,
    },
  ],
  rtRegions: [
    {
      id: 1,
      name: 'RT 01',
      leaderName: 'Hendra Wijaya',
      residentCount: 62,
      isActive: true,
    },
    {
      id: 2,
      name: 'RT 02',
      leaderName: 'Slamet Raharjo',
      residentCount: 68,
      isActive: true,
    },
    {
      id: 3,
      name: 'RT 03',
      leaderName: 'Agus Setiawan',
      residentCount: 74,
      isActive: true,
    },
    {
      id: 4,
      name: 'RT 04',
      leaderName: 'Dadan Supriatna',
      residentCount: 61,
      isActive: true,
    },
    {
      id: 5,
      name: 'RT 05',
      leaderName: 'Asep Kurnia',
      residentCount: 64,
      isActive: true,
    },
    {
      id: 6,
      name: 'RT 06',
      leaderName: 'Taufik Hidayat',
      residentCount: 57,
      isActive: true,
    },
  ],
  categories: [
    { id: 1, name: 'Kebersihan', reportCount: 32, isActive: true },
    { id: 2, name: 'Drainase', reportCount: 28, isActive: true },
    { id: 3, name: 'Penerangan', reportCount: 24, isActive: true },
    { id: 4, name: 'Infrastruktur', reportCount: 22, isActive: true },
    { id: 5, name: 'Ketertiban', reportCount: 14, isActive: true },
    { id: 6, name: 'Layanan lainnya', reportCount: 8, isActive: true },
  ],
  activities: [
    {
      id: 1,
      text: '31 Okt, 09.00 • Bambang Heryana mengubah #0264 menjadi Diproses RW.',
    },
    {
      id: 2,
      text: '30 Okt, 15.30 • Bambang Heryana menyelesaikan #0261 dan mengunggah bukti.',
    },
  ],
}

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

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const hh = String(wib.getUTCHours()).padStart(2, '0')
  const mm = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]}, ${hh}.${mm}`
}

function permissionForRole(role: UserRole, regionLabel: string): string {
  switch (role) {
    case 'admin':
      return 'Kelola data & status langsung'
    case 'ketua_rw':
      return 'Tindak lanjut & penyelesaian'
    case 'ketua_rt':
      return `Verifikasi laporan ${regionLabel}`
    default:
      return 'Buat & pantau laporan sendiri'
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (!isSupabaseConfigured()) {
    return PREVIEW_ADMIN_DATA
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return PREVIEW_ADMIN_DATA

    const [profileRes, ticketsRes, regionsRes, categoriesRes, timelinesRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('tickets')
          .select(
            `
            *,
            categories (id, name),
            regions (id, name, rw)
          `,
          )
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('regions').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('ticket_timeline')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

    if (ticketsRes.error || !ticketsRes.data) {
      return PREVIEW_ADMIN_DATA
    }

    const userIds = Array.from(new Set(ticketsRes.data.map((t) => t.user_id)))
    const reporterMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: reporters } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      for (const r of reporters ?? []) {
        reporterMap.set(r.id, r.full_name)
      }
    }

    const stats: DashboardStats = {
      total: ticketsRes.data.length,
      draft: 0,
      terkirim: 0,
      diverifikasi_rt: 0,
      diproses_rw: 0,
      selesai: 0,
      ditolak: 0,
    }

    const catCount = new Map<number, number>()
    for (const row of ticketsRes.data) {
      if (row.status in stats) {
        stats[row.status as keyof DashboardStats]++
      }
      catCount.set(row.category_id, (catCount.get(row.category_id) ?? 0) + 1)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tickets: AdminTicketRow[] = ticketsRes.data.map((row: any) => {
      const repName = reporterMap.get(row.user_id) ?? 'Warga RW 06'
      const regName = row.regions?.name ?? 'RT -'
      return {
        id: row.id,
        ticketNumber: row.ticket_number ?? `PG-${row.id}`,
        title: row.title,
        categoryName: row.categories?.name ?? 'Umum',
        regionName: regName,
        reporterName: repName,
        dateShort: formatShortDate(row.submitted_at ?? row.created_at),
        status: row.status,
        statusContextNote: `${repName} • ${regName}. Status tiket saat ini sedang berada pada tahap ${row.status}.`,
        defaultAdminNote:
          'Membantu koordinasi tindak lanjut penanganan laporan warga.',
      }
    })

    const regionMap = new Map(
      (regionsRes.data ?? []).map((r) => [r.id, r.name]),
    )

    const usersRes = await listUsers()
    const accounts: AdminAccountRow[] = usersRes.success
      ? usersRes.data.map((u) => {
          const regLabel = u.region_id
            ? (regionMap.get(u.region_id) ?? 'RW 06')
            : 'RW 06'
          return {
            id: u.id,
            fullName: u.full_name || u.email,
            email: u.email,
            role: u.role,
            regionLabel: regLabel,
            permissionDesc: permissionForRole(u.role, regLabel),
            isActive: u.is_active,
          }
        })
      : PREVIEW_ADMIN_DATA.accounts

    const residentTotal = accounts.filter((a) => a.role === 'warga').length
    const staffActiveTotal = accounts.filter(
      (a) => a.role !== 'warga' && a.isActive,
    ).length

    const rtRegions: AdminRtInfo[] =
      regionsRes.data && regionsRes.data.length > 0
        ? regionsRes.data.map((r) => ({
            id: r.id,
            name: r.name,
            leaderName:
              accounts.find(
                (a) => a.role === 'ketua_rt' && a.regionLabel === r.name,
              )?.fullName ?? 'Ketua RT',
            residentCount: accounts.filter(
              (a) => a.role === 'warga' && a.regionLabel === r.name,
            ).length,
            isActive: r.is_active,
          }))
        : PREVIEW_ADMIN_DATA.rtRegions

    const categories: AdminCategorySummary[] =
      categoriesRes.data && categoriesRes.data.length > 0
        ? categoriesRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            reportCount: catCount.get(c.id) ?? 0,
            isActive: c.is_active,
          }))
        : PREVIEW_ADMIN_DATA.categories

    const activities: AdminActivityLog[] =
      timelinesRes.data && timelinesRes.data.length > 0
        ? timelinesRes.data.map((tl) => ({
            id: tl.id,
            text: `${formatActivityTime(tl.created_at)} • ${tl.actor_name} mengubah status tiket #${tl.ticket_id} menjadi ${tl.to_status}.`,
          }))
        : PREVIEW_ADMIN_DATA.activities

    return {
      isPreview: false,
      adminName: profileRes.data?.full_name ?? PREVIEW_ADMIN_DATA.adminName,
      unreadCount: stats.terkirim,
      residentTotal,
      staffActiveTotal,
      stats,
      tickets,
      accounts,
      rtRegions,
      categories,
      activities,
    }
  } catch (error) {
    unstable_rethrow(error)
    return PREVIEW_ADMIN_DATA
  }
}
