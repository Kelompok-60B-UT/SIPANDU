export type {
  Database,
  UserRole,
  TicketStatus,
  AttachmentType,
  Profile,
  Region,
  Category,
  Ticket,
  TicketAttachment,
  TicketTimeline,
  Notification,
} from '@/types/database.types'

export type { ActionResult } from '@/utils/action-result'

export interface RegionOption {
  id: number
  name: string
  rw: string
}

export interface CategoryOption {
  id: number
  name: string
  description: string | null
}

export interface PublicStats {
  total_tickets: number
  selesai: number
  diproses: number
  ditolak: number
}
