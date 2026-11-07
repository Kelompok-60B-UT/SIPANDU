import { redirect, unstable_rethrow } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { listUsers } from '@/app/actions/admin'
import { siteConfig } from '@/config/site'
import type { TicketStatus, UserRole } from '@/types/database.types'
import type { DashboardStats } from '@/data/tickets'
import type { StaffAttachmentItem } from '@/data/staff-preview'

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
  rating: number | null
  ratingComment: string | null
  proofAttachments: StaffAttachmentItem[]
}

export interface AdminAccountRow {
  id: string
  fullName: string
  email: string
  role: UserRole
  regionId?: number | null
  regionLabel: string
  permissionDesc: string
  isActive: boolean
  isVerified: boolean
  createdAt?: string
}

export interface AdminRtInfo {
  id: number
  name: string
  rw?: string
  leaderName: string
  leaderUserId?: string | null
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
  avatarUrl?: string | null
  rwNumber?: string
  rwAreaName?: string
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
  rwNumber: siteConfig.rwNumber,
  rwAreaName: siteConfig.areaName,
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
      rating: null,
      ratingComment: null,
      proofAttachments: [],
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
      rating: null,
      ratingComment: null,
      proofAttachments: [],
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
      rating: null,
      ratingComment: null,
      proofAttachments: [
        {
          id: 302,
          type: 'penyelesaian',
          fileName: 'saluran-cempaka-bersih.jpg',
          sizeBytes: Math.round(1.9 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
    },
    {
      id: 261,
      ticketNumber: 'PG-2026-0261',
      title: 'Saluran air tersumbat di Gang Melati',
      categoryName: 'Drainase',
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      dateShort: '28 Okt 2026',
      status: 'selesai',
      statusContextNote:
        'Dewi Lestari • RT 03. Laporan telah selesai ditangani oleh RW 06 dan telah dinilai oleh warga.',
      defaultAdminNote:
        'Sampah dan endapan telah diangkat. Aliran air kembali lancar.',
      rating: 5,
      ratingComment:
        'Penanganan sangat cepat, saluran air sudah bersih dan lancar kembali.',
      proofAttachments: [
        {
          id: 303,
          type: 'penyelesaian',
          fileName: 'dummysaluransesudah.jpg',
          sizeBytes: 214777,
          previewUrl: '/dummysaluransesudah.jpg',
        },
      ],
    },
  ],
  accounts: [
    {
      id: 'acc-warga-1',
      fullName: 'Dewi Lestari',
      email: 'dewi.lestari@email.com',
      role: 'warga',
      regionId: 3,
      regionLabel: 'RT 03',
      permissionDesc: 'Buat & pantau laporan sendiri',
      isActive: true,
      isVerified: true,
    },
    {
      id: 'acc-warga-pending-1',
      fullName: 'Budi Santoso',
      email: 'budi.santoso@email.com',
      role: 'warga',
      regionId: 3,
      regionLabel: 'RT 03',
      permissionDesc: 'Menunggu persetujuan pengurus',
      isActive: true,
      isVerified: false,
    },
    {
      id: 'acc-rt-3',
      fullName: 'Agus Setiawan',
      email: 'rt03@sipandu.test',
      role: 'ketua_rt',
      regionId: 3,
      regionLabel: 'RT 03',
      permissionDesc: 'Verifikasi laporan RT 03',
      isActive: true,
      isVerified: true,
    },
    {
      id: 'acc-rw-6',
      fullName: 'Bambang Heryana',
      email: 'rw06@sipandu.test',
      role: 'ketua_rw',
      regionLabel: 'RW 06',
      permissionDesc: 'Tindak lanjut & penyelesaian',
      isActive: true,
      isVerified: true,
    },
    {
      id: 'acc-admin-1',
      fullName: 'Rina Marlina',
      email: 'admin@sipandu.test',
      role: 'admin',
      regionLabel: 'RW 06',
      permissionDesc: 'Kelola data & status langsung',
      isActive: true,
      isVerified: true,
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

    if (!user) {
      redirect('/login')
    }

    const [profileRes, ticketsRes, regionsRes, categoriesRes, timelinesRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('tickets')
          .select(
            `
            *,
            categories (id, name),
            regions (id, name, rw),
            ticket_attachments (*)
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

    const rawTickets = ticketsRes.data ?? []

    const userIds = Array.from(new Set(rawTickets.map((t) => t.user_id)))
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
      total: rawTickets.length,
      draft: 0,
      terkirim: 0,
      diverifikasi_rt: 0,
      diproses_rw: 0,
      selesai: 0,
      ditolak: 0,
    }

    const catCount = new Map<number, number>()
    const allProofPaths: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of rawTickets as any[]) {
      if (row.status in stats) {
        stats[row.status as keyof DashboardStats]++
      }
      catCount.set(row.category_id, (catCount.get(row.category_id) ?? 0) + 1)
      const attachments = Array.isArray(row.ticket_attachments)
        ? row.ticket_attachments
        : []
      for (const a of attachments) {
        if (
          a.type === 'penyelesaian' &&
          typeof a.storage_path === 'string' &&
          a.storage_path
        ) {
          allProofPaths.push(a.storage_path)
        }
      }
    }

    const signedUrlMap = new Map<string, string>()
    if (allProofPaths.length > 0) {
      const { data: signedList } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrls(allProofPaths, 3600)
      for (const item of signedList ?? []) {
        if (item.path && item.signedUrl) {
          signedUrlMap.set(item.path, item.signedUrl)
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tickets: AdminTicketRow[] = rawTickets.map((row: any) => {
      const repName = reporterMap.get(row.user_id) ?? `Warga ${siteConfig.rwShortLabel}`
      const regName = row.regions?.name ?? 'RT -'
      const attachments = Array.isArray(row.ticket_attachments)
        ? row.ticket_attachments
        : []
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
        rating: row.rating ?? null,
        ratingComment: row.rating_comment ?? null,
        proofAttachments: attachments
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((a: any) => a.type === 'penyelesaian')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((a: any) => ({
            id: a.id,
            type: 'penyelesaian' as const,
            fileName: a.file_name,
            sizeBytes: a.size_bytes,
            previewUrl: signedUrlMap.get(a.storage_path) ?? '',
            storagePath: a.storage_path,
          })),
      }
    })

    const regionMap = new Map(
      (regionsRes.data ?? []).map((r) => [r.id, r.name]),
    )

    const usersRes = await listUsers()
    let accounts: AdminAccountRow[] = []
    if (usersRes.success) {
      accounts = usersRes.data.map((u) => {
        const regLabel = u.region_id
          ? (regionMap.get(u.region_id) ?? siteConfig.rwShortLabel)
          : siteConfig.rwShortLabel
        return {
          id: u.id,
          fullName: u.full_name || u.email,
          email: u.email,
          role: u.role,
          regionId: u.region_id,
          regionLabel: regLabel,
          permissionDesc: permissionForRole(u.role, regLabel),
          isActive: u.is_active,
          isVerified: u.role !== 'warga' ? true : u.is_rt_verified,
          createdAt: u.created_at,
        }
      })
    } else {
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, region_id, is_active, is_rt_verified, created_at')
        .limit(200)
      accounts = (fallbackProfiles ?? []).map((p) => {
        const regLabel = p.region_id
          ? (regionMap.get(p.region_id) ?? siteConfig.rwShortLabel)
          : siteConfig.rwShortLabel
        const role: UserRole = p.id === user.id ? 'admin' : 'warga'
        return {
          id: p.id,
          fullName: p.full_name || 'Pengguna SIPANDU',
          email: p.id === user.id ? (user.email ?? '-') : '-',
          role,
          regionId: p.region_id,
          regionLabel: regLabel,
          permissionDesc: permissionForRole(role, regLabel),
          isActive: p.is_active,
          isVerified: role !== 'warga' ? true : (p.is_rt_verified ?? false),
          createdAt: p.created_at,
        }
      })
    }

    const residentTotal = accounts.filter((a) => a.role === 'warga').length
    const staffActiveTotal = accounts.filter(
      (a) => a.role !== 'warga' && a.isActive,
    ).length

    const rtRegions: AdminRtInfo[] =
      regionsRes.data && regionsRes.data.length > 0
        ? regionsRes.data.map((r) => {
            const rtLeader = accounts.find(
              (a) =>
                a.role === 'ketua_rt' &&
                (a.regionId === r.id || a.regionLabel === r.name),
            )
            return {
              id: r.id,
              name: r.name,
              rw: r.rw,
              leaderName: rtLeader?.fullName ?? 'Belum ditetapkan',
              leaderUserId: rtLeader?.id ?? null,
              residentCount: accounts.filter(
                (a) =>
                  a.role === 'warga' &&
                  (a.regionId === r.id || a.regionLabel === r.name),
              ).length,
              isActive: r.is_active,
            }
          })
        : []

    const categories: AdminCategorySummary[] =
      categoriesRes.data && categoriesRes.data.length > 0
        ? categoriesRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            reportCount: catCount.get(c.id) ?? 0,
            isActive: c.is_active,
          }))
        : []

    const activities: AdminActivityLog[] = (timelinesRes.data ?? []).map(
      (tl) => ({
        id: tl.id,
        text: `${formatActivityTime(tl.created_at)} • ${tl.actor_name} mengubah status tiket #${tl.ticket_id} menjadi ${tl.to_status}.`,
      }),
    )

    const metaAdminName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null
    const avatarUrl =
      typeof user.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url.trim()
        ? user.user_metadata.avatar_url.trim()
        : null
    const rwNumber = siteConfig.rwNumber
    const rwAreaName = siteConfig.areaName

    return {
      isPreview: false,
      adminName:
        profileRes.data?.full_name ||
        metaAdminName ||
        user.email?.split('@')[0] ||
        'Admin',
      avatarUrl,
      rwNumber,
      rwAreaName,
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
    throw error
  }
}
