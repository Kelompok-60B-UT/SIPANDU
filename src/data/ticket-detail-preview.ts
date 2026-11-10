import { redirect, unstable_rethrow } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { getTicketById } from '@/data/tickets'
import { getFormOptions } from '@/app/actions/tickets'
import { listNotifications } from '@/app/actions/profile'
import { getRoleFromJwt, roleLabelId } from '@/utils/roles'
import { siteConfig } from '@/config/site'
import {
  PREVIEW_NOTIFICATIONS,
  PREVIEW_REGIONS,
  PREVIEW_TICKETS,
  PREVIEW_USER,
} from '@/data/warga-preview'
import type {
  AttachmentType,
  TicketStatus,
  UserRole,
} from '@/types/database.types'
import type { CategoryOption, RegionOption } from '@/types'

export interface TicketAttachmentView {
  id: number
  type: AttachmentType
  fileName: string
  mimeType: string
  sizeBytes: number
  storagePath: string | null
  previewUrl: string | null
  createdAt: string
  uploaderName: string
}

export interface TicketTimelineView {
  id: number
  fromStatus: TicketStatus | null
  toStatus: TicketStatus
  actorName: string
  actorRoleDisplay: string
  note: string | null
  createdAt: string
}

export interface TicketDetailView {
  id: number
  ticketNumber: string
  userId: string
  categoryId: number
  categoryName: string
  regionId: number
  regionName: string
  regionRw: string
  title: string
  description: string
  locationLandmark: string
  locationSubdetail: string
  status: TicketStatus
  reporterName: string
  handlerDisplay: string
  rejectionReason: string | null
  rating: number | null
  ratingComment: string | null
  ratedAt: string | null
  submittedAt: string | null
  verifiedAt: string | null
  processedAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  createdAt: string
  updatedAt: string
  attachments: TicketAttachmentView[]
  timeline: TicketTimelineView[]
}

export interface TicketDetailPageData {
  isPreview: boolean
  viewer: {
    userId: string
    fullName: string
    role: UserRole
    roleLabel: string
    regionLabel: string
    unreadCount: number
    avatarUrl?: string | null
  }
  ticket: TicketDetailView | null
  categories: CategoryOption[]
  regions: RegionOption[]
}

const PREVIEW_CATEGORIES: CategoryOption[] = [
  { id: 1, name: 'Drainase', description: 'Saluran air, got mampet, genangan.' },
  { id: 2, name: 'Kebersihan', description: 'Sampah dan kebersihan lingkungan.' },
  { id: 3, name: 'Penerangan', description: 'Lampu penerangan jalan umum.' },
  { id: 4, name: 'Infrastruktur', description: 'Jalan lingkungan, pos, fasilitas.' },
  { id: 5, name: 'Keamanan', description: 'Ketertiban dan ronda warga.' },
  { id: 6, name: 'Administrasi', description: 'Layanan surat pengantar RT/RW.' },
]

const PREVIEW_TICKET_261: TicketDetailView = {
  id: 261,
  ticketNumber: 'PG-2026-0261',
  userId: PREVIEW_USER.profile.id,
  categoryId: 1,
  categoryName: 'Drainase',
  regionId: 3,
  regionName: 'RT 03',
  regionRw: '06',
  title: 'Saluran air tersumbat di Gang Melati',
  description:
    'Saluran air di depan Gang Melati tersumbat daun dan sampah sejak 27 Oktober. Saat hujan, air meluap ke jalan dan mengganggu akses warga. Mohon bantuan pembersihan saluran.',
  locationLandmark: 'Gang Melati, depan rumah No. 12',
  locationSubdetail: 'Dekat pos RT 03 • RW 06 Parakan Saat, Bandung',
  status: 'selesai',
  reporterName: 'Dewi Lestari',
  handlerDisplay: 'Bambang Heryana • Ketua RW',
  rejectionReason: null,
  rating: null,
  ratingComment: null,
  ratedAt: null,
  submittedAt: '2026-10-28T01:15:00Z',
  verifiedAt: '2026-10-28T03:00:00Z',
  processedAt: '2026-10-29T02:00:00Z',
  completedAt: '2026-10-30T08:30:00Z',
  rejectedAt: null,
  createdAt: '2026-10-28T01:15:00Z',
  updatedAt: '2026-10-30T08:30:00Z',
  attachments: [
    {
      id: 1,
      type: 'laporan',
      fileName: 'dummysaluransebelum.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 218736,
      storagePath: null,
      previewUrl: '/dummysaluransebelum.jpg',
      createdAt: '2026-10-28T01:15:00Z',
      uploaderName: 'Dewi Lestari',
    },
    {
      id: 2,
      type: 'penyelesaian',
      fileName: 'dummysaluransesudah.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 214777,
      storagePath: null,
      previewUrl: '/dummysaluransesudah.jpg',
      createdAt: '2026-10-30T08:30:00Z',
      uploaderName: 'Bambang Heryana',
    },
  ],
  timeline: [
    {
      id: 1,
      fromStatus: 'draft',
      toStatus: 'terkirim',
      actorName: 'Dewi Lestari',
      actorRoleDisplay: 'Warga RT 03',
      note: 'Laporan dan 1 foto berhasil diterima. Nomor tiket PG-2026-0261 diterbitkan.',
      createdAt: '2026-10-28T01:15:00Z',
    },
    {
      id: 2,
      fromStatus: 'terkirim',
      toStatus: 'diverifikasi_rt',
      actorName: 'Agus Setiawan',
      actorRoleDisplay: 'Ketua RT 03',
      note: 'Lokasi dan kondisi sesuai laporan. Diteruskan ke RW untuk pembersihan saluran.',
      createdAt: '2026-10-28T03:00:00Z',
    },
    {
      id: 3,
      fromStatus: 'diverifikasi_rt',
      toStatus: 'diproses_rw',
      actorName: 'Bambang Heryana',
      actorRoleDisplay: 'Ketua RW 06',
      note: 'Tim kebersihan dijadwalkan membersihkan saluran air bersama warga.',
      createdAt: '2026-10-29T02:00:00Z',
    },
    {
      id: 4,
      fromStatus: 'diproses_rw',
      toStatus: 'selesai',
      actorName: 'Bambang Heryana',
      actorRoleDisplay: 'Ketua RW 06',
      note: 'Sampah dan endapan telah diangkat. Aliran air kembali lancar. Foto bukti penyelesaian dilampirkan.',
      createdAt: '2026-10-30T08:30:00Z',
    },
  ],
}

function buildPreviewTicketFromList(rawParam: string): TicketDetailView {
  const normalized = decodeURIComponent(rawParam).trim()
  const numericId = Number(normalized)

  if (
    numericId === 261 ||
    normalized.toUpperCase() === 'PG-2026-0261' ||
    normalized === '0261'
  ) {
    return PREVIEW_TICKET_261
  }

  const matched = PREVIEW_TICKETS.find(
    (item) =>
      item.id === numericId ||
      (item.ticket_number &&
        item.ticket_number.toUpperCase() === normalized.toUpperCase()),
  )

  if (!matched) {
    return PREVIEW_TICKET_261
  }

  const regionName = matched.regions?.name ?? 'RT 03'
  const regionRw = matched.regions?.rw ?? '06'
  const ticketNo = matched.ticket_number ?? `DRAF-${matched.id}`

  const timeline: TicketTimelineView[] = []
  if (matched.submitted_at) {
    timeline.push({
      id: 1,
      fromStatus: 'draft',
      toStatus: 'terkirim',
      actorName: 'Dewi Lestari',
      actorRoleDisplay: `Warga ${regionName}`,
      note: `Laporan dan 1 foto berhasil diterima. Nomor tiket ${ticketNo} diterbitkan.`,
      createdAt: matched.submitted_at,
    })
  }
  if (matched.verified_at) {
    timeline.push({
      id: 2,
      fromStatus: 'terkirim',
      toStatus: 'diverifikasi_rt',
      actorName: 'Agus Setiawan',
      actorRoleDisplay: `Ketua ${regionName}`,
      note: 'Lokasi dan kondisi sesuai laporan. Diteruskan ke RW untuk tindak lanjut lapangan.',
      createdAt: matched.verified_at,
    })
  }
  if (matched.processed_at) {
    timeline.push({
      id: 3,
      fromStatus: 'diverifikasi_rt',
      toStatus: 'diproses_rw',
      actorName: 'Bambang Heryana',
      actorRoleDisplay: `Ketua RW ${regionRw}`,
      note: 'Pengurus RW menjadwalkan petugas dan warga untuk penanganan di lokasi.',
      createdAt: matched.processed_at,
    })
  }
  if (matched.completed_at) {
    timeline.push({
      id: 4,
      fromStatus: 'diproses_rw',
      toStatus: 'selesai',
      actorName: 'Bambang Heryana',
      actorRoleDisplay: `Ketua RW ${regionRw}`,
      note: 'Penanganan selesai dilaksanakan. Foto bukti penyelesaian dilampirkan.',
      createdAt: matched.completed_at,
    })
  }
  if (matched.rejected_at) {
    timeline.push({
      id: 5,
      fromStatus: 'terkirim',
      toStatus: 'ditolak',
      actorName: 'Agus Setiawan',
      actorRoleDisplay: `Ketua ${regionName}`,
      note:
        matched.rejection_reason ??
        'Laporan belum dapat ditindaklanjuti sesuai ketentuan wilayah.',
      createdAt: matched.rejected_at,
    })
  }

  const handlerDisplay = matched.handler_rw_id
    ? 'Bambang Heryana • Ketua RW'
    : matched.handler_rt_id
      ? `Agus Setiawan • Ketua ${regionName}`
      : 'Menunggu verifikasi Ketua RT'

  const attachments: TicketAttachmentView[] = [
    {
      id: 1,
      type: 'laporan',
      fileName:
        matched.id === 266 ? 'dummysampah.jpg' : 'dummysaluransebelum.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 218736,
      storagePath: null,
      previewUrl:
        matched.id === 266 ? '/dummysampah.jpg' : '/dummysaluransebelum.jpg',
      createdAt: matched.submitted_at ?? matched.created_at,
      uploaderName: 'Dewi Lestari',
    },
  ]

  if (matched.status === 'selesai') {
    attachments.push({
      id: 2,
      type: 'penyelesaian',
      fileName: 'dummysaluransesudah.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 214777,
      storagePath: null,
      previewUrl: '/dummysaluransesudah.jpg',
      createdAt: matched.completed_at ?? matched.updated_at,
      uploaderName: 'Bambang Heryana',
    })
  }

  return {
    id: matched.id,
    ticketNumber: ticketNo,
    userId: matched.user_id,
    categoryId: matched.category_id,
    categoryName: matched.categories?.name ?? 'Umum',
    regionId: matched.region_id,
    regionName,
    regionRw,
    title: matched.title,
    description: matched.description,
    locationLandmark: matched.location_landmark ?? regionName,
    locationSubdetail: `Wilayah ${regionName} • RW ${regionRw} ${siteConfig.areaName}`,
    status: matched.status,
    reporterName: 'Dewi Lestari',
    handlerDisplay,
    rejectionReason: matched.rejection_reason,
    rating: matched.rating,
    ratingComment: matched.rating_comment,
    ratedAt: matched.rated_at,
    submittedAt: matched.submitted_at,
    verifiedAt: matched.verified_at,
    processedAt: matched.processed_at,
    completedAt: matched.completed_at,
    rejectedAt: matched.rejected_at,
    createdAt: matched.created_at,
    updatedAt: matched.updated_at,
    attachments,
    timeline,
  }
}

function formatTimelineActorRole(
  rawRole: string,
  regionName: string,
  regionRw: string,
): string {
  const normalized = rawRole.trim().toLowerCase()
  if (normalized === 'warga') return `Warga ${regionName}`
  if (normalized === 'ketua_rt') return `Ketua ${regionName}`
  if (normalized === 'ketua_rw') return `Ketua RW ${regionRw}`
  if (normalized === 'admin') return 'Admin SIPANDU'
  return rawRole
}

export async function getTicketDetailPageData(
  rawId: string,
): Promise<TicketDetailPageData> {
  if (!isSupabaseConfigured()) {
    const unreadCount = PREVIEW_NOTIFICATIONS.filter((n) => !n.is_read).length
    return {
      isPreview: true,
      viewer: {
        userId: PREVIEW_USER.profile.id,
        fullName: PREVIEW_USER.profile.full_name,
        role: PREVIEW_USER.role,
        roleLabel: roleLabelId(PREVIEW_USER.role),
        regionLabel: `${PREVIEW_USER.region.name} / RW ${PREVIEW_USER.region.rw}`,
        unreadCount,
      },
      ticket: buildPreviewTicketFromList(rawId),
      categories: PREVIEW_CATEGORIES,
      regions: PREVIEW_REGIONS,
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const viewerRole = getRoleFromJwt(user.app_metadata) ?? 'warga'
    const [profileRes, optionsRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      getFormOptions(),
      listNotifications(true),
    ])

    const categories = optionsRes.success ? optionsRes.data.categories : []
    const regions = optionsRes.success ? optionsRes.data.regions : []
    const unreadCount = unreadRes.success ? unreadRes.data.length : 0

  const viewerProfile = profileRes.data
  const viewerAvatarUrl =
    typeof user.user_metadata?.avatar_url === 'string' &&
    user.user_metadata.avatar_url.trim()
      ? user.user_metadata.avatar_url.trim()
      : null
  const viewerMetaName =
    typeof user.user_metadata?.full_name === 'string' &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null
  const viewerFullName =
    viewerProfile?.full_name || viewerMetaName || user.email || 'Pengguna'
  const viewerRegion =
    regions.find((r) => r.id === viewerProfile?.region_id) ?? null
  const viewerRegionLabel = viewerRegion
    ? `${viewerRegion.name} / RW ${viewerRegion.rw}`
    : viewerRole === 'ketua_rw'
      ? siteConfig.subHeaderLabel
      : viewerRole === 'admin'
        ? `Seluruh Wilayah ${siteConfig.rwShortLabel}`
        : siteConfig.rwShortLabel

  // Resolusi ID tiket angka atau nomor tiket resmi (contoh: PG-2026-0261)
  const decoded = decodeURIComponent(rawId).trim()
  let ticketId = Number(decoded)
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    const { data: byNumber } = await supabase
      .from('tickets')
      .select('id')
      .ilike('ticket_number', decoded)
      .maybeSingle()
    ticketId = byNumber?.id ?? 0
  }

  const rawTicket = ticketId > 0 ? await getTicketById(ticketId) : null

  if (!rawTicket) {
    return {
      isPreview: false,
      viewer: {
        userId: user.id,
        fullName: viewerFullName,
        role: viewerRole,
        roleLabel: roleLabelId(viewerRole),
        regionLabel: viewerRegionLabel,
        unreadCount,
        avatarUrl: viewerAvatarUrl,
      },
      ticket: null,
      categories,
      regions,
    }
  }

  const regionObj = rawTicket.regions as {
    id: number
    name: string
    rw: string
  } | null
  const categoryObj = rawTicket.categories as {
    id: number
    name: string
  } | null

  const regionName = regionObj?.name ?? 'RT -'
  const regionRw = regionObj?.rw ?? '06'

  // Kumpulkan ID pengguna terkait untuk pencarian nama lengkap
  const relatedIds = Array.from(
    new Set(
      [
        rawTicket.user_id,
        rawTicket.handler_rt_id,
        rawTicket.handler_rw_id,
        ...(rawTicket.ticket_attachments ?? []).map((a) => a.uploaded_by),
      ].filter((v): v is string => Boolean(v)),
    ),
  )

  const profileNameMap = new Map<string, string>()
  if (viewerProfile) {
    profileNameMap.set(viewerProfile.id, viewerProfile.full_name)
  }
  if (relatedIds.length > 0) {
    const { data: profilesList } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', relatedIds)
    for (const p of profilesList ?? []) {
      profileNameMap.set(p.id, p.full_name)
    }
  }

  const rawTimeline = rawTicket.ticket_timeline ?? []
  const timeline: TicketTimelineView[] = rawTimeline.map((entry) => ({
    id: entry.id,
    fromStatus: entry.from_status,
    toStatus: entry.to_status,
    actorName: entry.actor_name,
    actorRoleDisplay: formatTimelineActorRole(
      entry.actor_role,
      regionName,
      regionRw,
    ),
    note: entry.note,
    createdAt: entry.created_at,
  }))

  // Resolusi nama pelapor dan penanggung jawab dengan fallback riwayat timeline
  const submitEntry = rawTimeline.find(
    (e) => e.to_status === 'terkirim' || e.actor_role === 'warga',
  )
  const reporterName =
    profileNameMap.get(rawTicket.user_id) ??
    submitEntry?.actor_name ??
    'Warga Pelapor'

  const rwEntry = [...rawTimeline]
    .reverse()
    .find((e) => e.actor_role === 'ketua_rw')
  const rtEntry = [...rawTimeline]
    .reverse()
    .find((e) => e.actor_role === 'ketua_rt')
  const adminEntry = [...rawTimeline]
    .reverse()
    .find((e) => e.actor_role === 'admin')

  let handlerDisplay = 'Menunggu verifikasi Ketua RT'
  if (rawTicket.handler_rw_id) {
    const rwName =
      profileNameMap.get(rawTicket.handler_rw_id) ?? rwEntry?.actor_name
    handlerDisplay = rwName ? `${rwName} • Ketua RW` : `Ketua ${siteConfig.rwShortLabel}`
  } else if (rwEntry) {
    handlerDisplay = `${rwEntry.actor_name} • Ketua RW`
  } else if (rawTicket.handler_rt_id) {
    const rtName =
      profileNameMap.get(rawTicket.handler_rt_id) ?? rtEntry?.actor_name
    handlerDisplay = rtName
      ? `${rtName} • Ketua ${regionName}`
      : `Ketua ${regionName}`
  } else if (rtEntry) {
    handlerDisplay = `${rtEntry.actor_name} • Ketua ${regionName}`
  } else if (adminEntry) {
    handlerDisplay = `${adminEntry.actor_name} • Admin`
  }

  // Buat signed URL untuk berkas privat pada bucket lampiran (masa berlaku 1 jam)
  const rawAttachments = [...(rawTicket.ticket_attachments ?? [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )

  const attachments: TicketAttachmentView[] = await Promise.all(
    rawAttachments.map(async (att) => {
      let signedUrl: string | null = null
      if (att.storage_path) {
        const { data: signed } = await supabase.storage
          .from('ticket-attachments')
          .createSignedUrl(att.storage_path, 3600)
        signedUrl = signed?.signedUrl ?? null
      }

      const fallbackUploader =
        att.type === 'penyelesaian'
          ? rwEntry?.actor_name ?? adminEntry?.actor_name ?? 'Pengurus RW'
          : reporterName

      return {
        id: att.id,
        type: att.type,
        fileName: att.file_name,
        mimeType: att.mime_type,
        sizeBytes: att.size_bytes,
        storagePath: att.storage_path,
        previewUrl: signedUrl,
        createdAt: att.created_at,
        uploaderName:
          profileNameMap.get(att.uploaded_by) ?? fallbackUploader,
      }
    }),
  )

  return {
    isPreview: false,
    viewer: {
      userId: user.id,
      fullName: viewerFullName,
      role: viewerRole,
      roleLabel: roleLabelId(viewerRole),
      regionLabel: viewerRegionLabel,
      unreadCount,
      avatarUrl: viewerAvatarUrl,
    },
    ticket: {
      id: rawTicket.id,
      ticketNumber: rawTicket.ticket_number ?? `DRAF-${rawTicket.id}`,
      userId: rawTicket.user_id,
      categoryId: rawTicket.category_id,
      categoryName: categoryObj?.name ?? 'Umum',
      regionId: rawTicket.region_id,
      regionName,
      regionRw,
      title: rawTicket.title,
      description: rawTicket.description,
      locationLandmark:
        rawTicket.location_landmark ?? `Wilayah ${regionName}`,
      locationSubdetail: `Dekat wilayah ${regionName} • RW ${regionRw} ${siteConfig.areaName}`,
      status: rawTicket.status,
      reporterName,
      handlerDisplay,
      rejectionReason: rawTicket.rejection_reason,
      rating: rawTicket.rating,
      ratingComment: rawTicket.rating_comment,
      ratedAt: rawTicket.rated_at,
      submittedAt: rawTicket.submitted_at,
      verifiedAt: rawTicket.verified_at,
      processedAt: rawTicket.processed_at,
      completedAt: rawTicket.completed_at,
      rejectedAt: rawTicket.rejected_at,
      createdAt: rawTicket.created_at,
      updatedAt: rawTicket.updated_at,
      attachments,
      timeline,
    },
    categories,
    regions,
  }
  } catch (error) {
    unstable_rethrow(error)
    throw error
  }
}
