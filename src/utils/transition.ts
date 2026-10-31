import type { TicketStatus } from '@/types/database.types'

export function statusLabelId(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    draft: 'Draf',
    terkirim: 'Terkirim',
    diverifikasi_rt: 'Diverifikasi RT',
    diproses_rw: 'Diproses RW',
    selesai: 'Selesai',
    ditolak: 'Ditolak',
  }
  return labels[status] ?? status
}

export function statusColorClass(status: TicketStatus): string {
  const colors: Record<TicketStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    terkirim: 'bg-blue-100 text-blue-700',
    diverifikasi_rt: 'bg-purple-100 text-purple-700',
    diproses_rw: 'bg-amber-100 text-amber-700',
    selesai: 'bg-green-100 text-green-700',
    ditolak: 'bg-red-100 text-red-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  const allowed: Partial<Record<TicketStatus, TicketStatus[]>> = {
    draft: ['terkirim'],
    terkirim: ['diverifikasi_rt', 'ditolak'],
    diverifikasi_rt: ['diproses_rw'],
    diproses_rw: ['selesai'],
  }
  return (allowed[from] ?? []).includes(to)
}
