import { redirect, unstable_rethrow } from 'next/navigation'
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/utils/supabase/server'
import type { TicketStatus } from '@/types/database.types'
import type { DashboardStats } from '@/data/tickets'
import { PREVIEW_REGIONS } from '@/data/warga-preview'

export interface StaffAttachmentItem {
  id: number
  type: 'laporan' | 'penyelesaian'
  fileName: string
  sizeBytes: number
  previewUrl: string
  storagePath?: string
}

export interface StaffTimelineItem {
  id: number
  status: TicketStatus
  dateLabel: string
  actorNote: string
}

export interface StaffTicketItem {
  id: number
  ticketNumber: string
  title: string
  description: string
  locationLandmark: string
  categoryName: string
  regionId: number
  regionName: string
  reporterName: string
  status: TicketStatus
  dateShort: string
  submittedFullLabel: string
  defaultRtNote: string
  defaultRwNote: string
  rejectionReason: string | null
  rating: number | null
  ratingComment: string | null
  reportAttachments: StaffAttachmentItem[]
  proofAttachments: StaffAttachmentItem[]
  timeline: StaffTimelineItem[]
}

export interface StaffPendingResidentItem {
  id: string
  fullName: string
  phone: string | null
  address: string | null
  regionId: number | null
  regionName: string
  createdAt: string
  dateShort: string
  isVerified: boolean
  isActive: boolean
}

export interface StaffContextData {
  isPreview: boolean
  fullName: string
  avatarUrl?: string | null
  regionName: string
  rw: string
  unreadCount: number
  stats: DashboardStats
  tickets: StaffTicketItem[]
  pendingResidents: StaffPendingResidentItem[]
}

export const PREVIEW_RT_DATA: StaffContextData = {
  isPreview: true,
  fullName: 'Agus Setiawan',
  regionName: 'RT 03',
  rw: '06',
  unreadCount: 2,
  stats: {
    total: 34,
    draft: 0,
    terkirim: 6,
    diverifikasi_rt: 4,
    diproses_rw: 7,
    selesai: 16,
    ditolak: 1,
  },
  tickets: [
    {
      id: 266,
      ticketNumber: 'PG-2026-0266',
      title: 'Sampah menumpuk di Gang Melati',
      description:
        'Sampah menumpuk sejak kemarin di dekat tempat pembuangan Gang Melati. Bau mulai mengganggu dan belum ada pengangkutan.',
      locationLandmark: 'Gang Melati, dekat pos RT 03.',
      categoryName: 'Kebersihan',
      regionId: 3,
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      status: 'terkirim',
      dateShort: '31 Okt 2026',
      submittedFullLabel: '31 Oktober 2026, 08.15 WIB',
      defaultRtNote:
        'Lokasi sesuai RT 03. Mohon koordinasi pengangkutan sampah.',
      defaultRwNote: '',
      rejectionReason: null,
      rating: null,
      ratingComment: null,
      reportAttachments: [
        {
          id: 101,
          type: 'laporan',
          fileName: 'kondisi-gang-melati.jpg',
          sizeBytes: Math.round(1.8 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      proofAttachments: [],
      timeline: [
        {
          id: 1,
          status: 'terkirim',
          dateLabel: '31 Okt, 08.15',
          actorNote: 'Dewi Lestari mengirimkan pengaduan warga.',
        },
      ],
    },
    {
      id: 267,
      ticketNumber: 'PG-2026-0267',
      title: 'Tumpukan material menutup gang',
      description:
        'Tumpukan pasir dan karung sisa renovasi menutup separuh badan jalan gang sehingga kendaraan roda dua sulit melintas.',
      locationLandmark: 'Gang Anggrek No. 8, wilayah RT 03.',
      categoryName: 'Ketertiban',
      regionId: 3,
      regionName: 'RT 03',
      reporterName: 'Dedi Kurniawan',
      status: 'terkirim',
      dateShort: '31 Okt 2026',
      submittedFullLabel: '31 Oktober 2026, 09.40 WIB',
      defaultRtNote:
        'Lokasi berada di Gang Anggrek RT 03. Perlu penertiban bersama pengurus.',
      defaultRwNote: '',
      rejectionReason: null,
      rating: null,
      ratingComment: null,
      reportAttachments: [
        {
          id: 102,
          type: 'laporan',
          fileName: 'tumpukan-material-gang.jpg',
          sizeBytes: Math.round(1.4 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      proofAttachments: [],
      timeline: [
        {
          id: 2,
          status: 'terkirim',
          dateLabel: '31 Okt, 09.40',
          actorNote: 'Dedi Kurniawan mengirimkan pengaduan warga.',
        },
      ],
    },
  ],
  pendingResidents: [
    {
      id: 'res-rt1-01',
      fullName: 'Ahmad Fauzi',
      phone: '0813 9988 7766',
      address: 'Jl. Cisaranten No. 4',
      regionId: 1,
      regionName: 'RT 01',
      createdAt: '2026-10-31T11:00:00Z',
      dateShort: '31 Okt 2026',
      isVerified: false,
      isActive: true,
    },
    {
      id: 'res-rt3-01',
      fullName: 'Budi Santoso',
      phone: '0812 3456 7801',
      address: 'Jl. Parakansaat No. 14, Gang Melati',
      regionId: 3,
      regionName: 'RT 03',
      createdAt: '2026-10-31T09:30:00Z',
      dateShort: '31 Okt 2026',
      isVerified: false,
      isActive: true,
    },
    {
      id: 'res-rt5-01',
      fullName: 'Ratna Sari',
      phone: '0821 5566 7788',
      address: 'Gang Mawar No. 2',
      regionId: 5,
      regionName: 'RT 05',
      createdAt: '2026-10-29T16:20:00Z',
      dateShort: '29 Okt 2026',
      isVerified: true,
      isActive: true,
    },
  ],
}

export const PREVIEW_RW_DATA: StaffContextData = {
  isPreview: true,
  fullName: 'Bambang Heryana',
  regionName: 'RW 06 Parakansaat',
  rw: '06',
  unreadCount: 3,
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
      id: 265,
      ticketNumber: 'PG-2026-0265',
      title: 'Lampu jalan padam di Gang Mawar',
      description:
        'Lampu penerangan jalan umum di pertigaan Gang Mawar padam sejak dua malam lalu sehingga kondisi gang gelap pada malam hari.',
      locationLandmark: 'Pertigaan Gang Mawar RT 03.',
      categoryName: 'Penerangan',
      regionId: 3,
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      status: 'diverifikasi_rt',
      dateShort: '30 Okt 2026',
      submittedFullLabel: '30 Oktober 2026, 10.00 WIB',
      defaultRtNote: 'Lampu PJU tiang kedua padam, mohon pergantian bohlam.',
      defaultRwNote:
        'Petugas teknis RW dijadwalkan mengganti lampu PJU di pertigaan Gang Mawar.',
      rejectionReason: null,
      rating: null,
      ratingComment: null,
      reportAttachments: [
        {
          id: 201,
          type: 'laporan',
          fileName: 'lampu-gang-mawar.jpg',
          sizeBytes: Math.round(1.5 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      proofAttachments: [],
      timeline: [
        {
          id: 11,
          status: 'diverifikasi_rt',
          dateLabel: '30 Okt, 14.00',
          actorNote:
            'Agus Setiawan: titik lampu jalan di pertigaan Gang Mawar sudah dicek dan benar padam.',
        },
      ],
    },
    {
      id: 264,
      ticketNumber: 'PG-2026-0264',
      title: 'Jalan berlubang dekat pos ronda',
      description:
        'Terdapat lubang cukup dalam di depan pos ronda RT 03 yang membahayakan warga saat hujan.',
      locationLandmark: 'Depan pos ronda RT 03.',
      categoryName: 'Infrastruktur',
      regionId: 3,
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      status: 'diproses_rw',
      dateShort: '30 Okt 2026',
      submittedFullLabel: '30 Oktober 2026, 08.00 WIB',
      defaultRtNote: 'Lokasi sudah diperiksa dan perlu penambalan.',
      defaultRwNote:
        'Lubang telah ditambal oleh tim sarana. Akses jalan kembali aman dilalui warga.',
      rejectionReason: null,
      rating: null,
      ratingComment: null,
      reportAttachments: [
        {
          id: 202,
          type: 'laporan',
          fileName: 'jalan-berlubang-pos-ronda.jpg',
          sizeBytes: Math.round(1.9 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      proofAttachments: [
        {
          id: 301,
          type: 'penyelesaian',
          fileName: 'jalan-setelah-perbaikan.jpg',
          sizeBytes: Math.round(2.1 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      timeline: [
        {
          id: 21,
          status: 'diverifikasi_rt',
          dateLabel: '30 Okt, 10.20',
          actorNote:
            'Agus Setiawan: lokasi sudah diperiksa dan perlu penambalan.',
        },
        {
          id: 22,
          status: 'diproses_rw',
          dateLabel: '31 Okt, 09.00',
          actorNote: 'Tim sarana lingkungan ditugaskan untuk perbaikan.',
        },
      ],
    },
    {
      id: 263,
      ticketNumber: 'PG-2026-0263',
      title: 'Genangan air di Jalan Cempaka',
      description:
        'Saluran tepi jalan tersumbat daun kering sehingga air menggenang setiap selesai hujan sore.',
      locationLandmark: 'Jalan Cempaka RT 02.',
      categoryName: 'Drainase',
      regionId: 2,
      regionName: 'RT 02',
      reporterName: 'Siti Aminah',
      status: 'diproses_rw',
      dateShort: '29 Okt 2026',
      submittedFullLabel: '29 Oktober 2026, 16.20 WIB',
      defaultRtNote: 'Saluran perlu pengerukan sedimen di sisi timur.',
      defaultRwNote:
        'Pengerukan sedimen saluran Jalan Cempaka selesai dilakukan bersama warga RT 02.',
      rejectionReason: null,
      rating: null,
      ratingComment: null,
      reportAttachments: [
        {
          id: 203,
          type: 'laporan',
          fileName: 'genangan-jalan-cempaka.jpg',
          sizeBytes: Math.round(1.7 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      proofAttachments: [
        {
          id: 302,
          type: 'penyelesaian',
          fileName: 'saluran-cempaka-bersih.jpg',
          sizeBytes: Math.round(1.9 * 1024 * 1024),
          previewUrl: '/dummysampah.jpg',
        },
      ],
      timeline: [
        {
          id: 31,
          status: 'diverifikasi_rt',
          dateLabel: '29 Okt, 17.10',
          actorNote:
            'Ketua RT 02: genangan menutup akses pejalan kaki sepanjang 5 meter.',
        },
        {
          id: 32,
          status: 'diproses_rw',
          dateLabel: '30 Okt, 08.30',
          actorNote: 'Pembersihan saluran dijadwalkan oleh tim kebersihan RW.',
        },
      ],
    },
    {
      id: 261,
      ticketNumber: 'PG-2026-0261',
      title: 'Saluran air tersumbat di Gang Melati',
      description:
        'Saluran air di depan Gang Melati tersumbat daun dan sampah sejak 27 Oktober. Saat hujan, air meluap ke jalan dan mengganggu akses warga.',
      locationLandmark: 'Gang Melati, depan rumah No. 12 RT 03.',
      categoryName: 'Drainase',
      regionId: 3,
      regionName: 'RT 03',
      reporterName: 'Dewi Lestari',
      status: 'selesai',
      dateShort: '28 Okt 2026',
      submittedFullLabel: '28 Oktober 2026, 08.15 WIB',
      defaultRtNote: 'Lokasi dan kondisi sesuai laporan. Diteruskan ke RW.',
      defaultRwNote:
        'Sampah dan endapan telah diangkat. Aliran air kembali lancar.',
      rejectionReason: null,
      rating: 5,
      ratingComment:
        'Penanganan sangat cepat, saluran air sudah bersih dan lancar kembali. Terima kasih Pak RT dan Pak RW.',
      reportAttachments: [
        {
          id: 204,
          type: 'laporan',
          fileName: 'dummysaluransebelum.jpg',
          sizeBytes: 218736,
          previewUrl: '/dummysaluransebelum.jpg',
        },
      ],
      proofAttachments: [
        {
          id: 303,
          type: 'penyelesaian',
          fileName: 'dummysaluransesudah.jpg',
          sizeBytes: 214777,
          previewUrl: '/dummysaluransesudah.jpg',
        },
      ],
      timeline: [
        {
          id: 41,
          status: 'diverifikasi_rt',
          dateLabel: '28 Okt, 10.00',
          actorNote:
            'Agus Setiawan: Lokasi dan kondisi sesuai laporan. Diteruskan ke RW untuk pembersihan saluran.',
        },
        {
          id: 42,
          status: 'diproses_rw',
          dateLabel: '29 Okt, 09.00',
          actorNote:
            'Bambang Heryana: Tim kebersihan dijadwalkan membersihkan saluran air bersama warga.',
        },
        {
          id: 43,
          status: 'selesai',
          dateLabel: '30 Okt, 15.30',
          actorNote:
            'Bambang Heryana: Sampah dan endapan telah diangkat. Aliran air kembali lancar.',
        },
      ],
    },
  ],
  pendingResidents: [
    {
      id: 'res-rt1-01',
      fullName: 'Ahmad Fauzi',
      phone: '0813 9988 7766',
      address: 'Jl. Cisaranten No. 4',
      regionId: 1,
      regionName: 'RT 01',
      createdAt: '2026-10-31T11:00:00Z',
      dateShort: '31 Okt 2026',
      isVerified: false,
      isActive: true,
    },
    {
      id: 'res-rt3-01',
      fullName: 'Budi Santoso',
      phone: '0812 3456 7801',
      address: 'Jl. Parakansaat No. 14, Gang Melati',
      regionId: 3,
      regionName: 'RT 03',
      createdAt: '2026-10-31T09:30:00Z',
      dateShort: '31 Okt 2026',
      isVerified: false,
      isActive: true,
    },
    {
      id: 'res-rt5-01',
      fullName: 'Ratna Sari',
      phone: '0821 5566 7788',
      address: 'Gang Mawar No. 2',
      regionId: 5,
      regionName: 'RT 05',
      createdAt: '2026-10-29T16:20:00Z',
      dateShort: '29 Okt 2026',
      isVerified: true,
      isActive: true,
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

const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`
}

function formatFullWib(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const hh = String(wib.getUTCHours()).padStart(2, '0')
  const mm = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${wib.getUTCDate()} ${MONTHS_LONG[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${hh}.${mm} WIB`
}

function formatTimelineDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const hh = String(wib.getUTCHours()).padStart(2, '0')
  const mm = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]}, ${hh}.${mm}`
}

export async function getStaffDashboardData(
  targetRole: 'ketua_rt' | 'ketua_rw',
): Promise<StaffContextData> {
  const fallback =
    targetRole === 'ketua_rt' ? PREVIEW_RT_DATA : PREVIEW_RW_DATA

  if (!isSupabaseConfigured()) {
    return fallback
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const [profileRes, ticketsRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('tickets')
        .select(
          `
          *,
          categories (id, name),
          regions (id, name, rw),
          ticket_attachments (*),
          ticket_timeline (*)
        `,
        )
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .order('created_at', {
          referencedTable: 'ticket_timeline',
          ascending: true,
        })
        .limit(50),
      supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false),
    ])

    const rawTickets = ticketsRes.data ?? []

    const profile = profileRes.data
    const regionObj =
      PREVIEW_REGIONS.find((r) => r.id === profile?.region_id) ??
      (profile?.region_id
        ? { id: profile.region_id, name: `RT 0${profile.region_id}`, rw: '06' }
        : PREVIEW_REGIONS[2])

    // Ambil nama pelapor unik
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

    const allStoragePaths: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of rawTickets as any[]) {
      const attachments = Array.isArray(row.ticket_attachments)
        ? row.ticket_attachments
        : []
      for (const a of attachments) {
        if (typeof a.storage_path === 'string' && a.storage_path) {
          allStoragePaths.push(a.storage_path)
        }
      }
    }

    const signedUrlMap = new Map<string, string>()
    if (allStoragePaths.length > 0) {
      const { data: signedList } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrls(allStoragePaths, 3600)
      for (const item of signedList ?? []) {
        if (item.path && item.signedUrl) {
          signedUrlMap.set(item.path, item.signedUrl)
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedTickets: StaffTicketItem[] = rawTickets.map((row: any) => {
      if (row.status in stats) {
        stats[row.status as keyof DashboardStats]++
      }

      const attachments = Array.isArray(row.ticket_attachments)
        ? row.ticket_attachments
        : []
      const timelines = Array.isArray(row.ticket_timeline)
        ? row.ticket_timeline
        : []

      return {
        id: row.id,
        ticketNumber: row.ticket_number ?? `PG-${row.id}`,
        title: row.title,
        description: row.description,
        locationLandmark: row.location_landmark ?? row.regions?.name ?? 'RW 06',
        categoryName: row.categories?.name ?? 'Umum',
        regionId: row.region_id,
        regionName: row.regions?.name ?? regionObj.name,
        reporterName: reporterMap.get(row.user_id) ?? 'Warga RW 06',
        status: row.status,
        dateShort: formatShortDate(row.submitted_at ?? row.created_at),
        submittedFullLabel: formatFullWib(row.submitted_at ?? row.created_at),
        defaultRtNote: `Lokasi sesuai ${row.regions?.name ?? 'RT'}. Mohon tindak lanjut pengurus RW.`,
        defaultRwNote: '',
        rejectionReason: row.rejection_reason,
        rating: row.rating ?? null,
        ratingComment: row.rating_comment ?? null,
        reportAttachments: attachments
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((a: any) => a.type === 'laporan')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((a: any) => ({
            id: a.id,
            type: 'laporan' as const,
            fileName: a.file_name,
            sizeBytes: a.size_bytes,
            previewUrl: signedUrlMap.get(a.storage_path) ?? '',
            storagePath: a.storage_path,
          })),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeline: timelines.map((tl: any) => ({
          id: tl.id,
          status: tl.to_status,
          dateLabel: formatTimelineDate(tl.created_at),
          actorNote: tl.note
            ? `${tl.actor_name}: ${tl.note}`
            : `${tl.actor_name} memperbarui status tiket.`,
        })),
      }
    })

    const metaName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null
    const avatarUrl =
      typeof user.user_metadata?.avatar_url === 'string' &&
      user.user_metadata.avatar_url.trim()
        ? user.user_metadata.avatar_url.trim()
        : null

    const staffUserIds = new Set<string>()
    try {
      const adminClient = createAdminClient()
      const { data: userList } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      })
      if (userList?.users) {
        for (const u of userList.users) {
          const uRole = (u.app_metadata as Record<string, string>)?.sipandu_role
          if (uRole && uRole !== 'warga') {
            staffUserIds.add(u.id)
          }
        }
      }
    } catch {
      // ignore
    }

    let residentsQuery = supabase
      .from('profiles')
      .select('id, full_name, phone, address, region_id, is_rt_verified, is_active, created_at')
      .order('created_at', { ascending: false })

    if (targetRole === 'ketua_rt' && profile?.region_id) {
      residentsQuery = residentsQuery.eq('region_id', profile.region_id)
    }

    const { data: residentsData } = await residentsQuery.limit(100)

    const pendingResidents: StaffPendingResidentItem[] = (residentsData ?? [])
      .filter((r) => !staffUserIds.has(r.id))
      .map(
        (r) => {
          const reg = PREVIEW_REGIONS.find((p) => p.id === r.region_id)
          return {
            id: r.id,
            fullName: r.full_name || 'Warga Baru',
            phone: r.phone,
            address: r.address,
            regionId: r.region_id,
            regionName: reg ? reg.name : r.region_id ? `RT 0${r.region_id}` : 'RW 06',
            createdAt: r.created_at,
            dateShort: formatShortDate(r.created_at),
            isVerified: r.is_rt_verified ?? false,
            isActive: r.is_active ?? true,
          }
        },
      )

    return {
      isPreview: false,
      fullName:
        profile?.full_name || metaName || user.email?.split('@')[0] || 'Pengurus',
      avatarUrl,
      regionName:
        targetRole === 'ketua_rt' ? regionObj.name : 'RW 06 Parakansaat',
      rw: regionObj.rw,
      unreadCount: unreadRes.data?.length ?? 0,
      stats,
      tickets: mappedTickets,
      pendingResidents,
    }
  } catch (error) {
    unstable_rethrow(error)
    throw error
  }
}
