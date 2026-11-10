import { z } from 'zod'


export const MAX_LAPORAN_PHOTOS = 3
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const
export const MAX_DESCRIPTION_LENGTH = 1000


export const CreateDraftSchema = z.object({
  title: z.string().min(5, { error: 'Judul minimal 5 karakter' }).max(200, { error: 'Judul maksimal 200 karakter' }),
  description: z.string().min(10, { error: 'Deskripsi minimal 10 karakter' }).max(MAX_DESCRIPTION_LENGTH, { error: `Deskripsi maksimal ${MAX_DESCRIPTION_LENGTH} karakter` }),
  category_id: z.coerce.number().int().positive({ error: 'Kategori wajib dipilih' }),
  region_id: z.coerce.number().int().positive({ error: 'RT lokasi wajib dipilih' }),
  location_landmark: z.string().max(500).optional().or(z.literal('')),
})

export const UpdateDraftSchema = CreateDraftSchema.partial()

export const RejectTicketSchema = z.object({
  ticket_id: z.coerce.number().int().positive(),
  reason: z.string().min(5, { error: 'Alasan penolakan minimal 5 karakter' }),
})

export const RateTicketSchema = z.object({
  ticket_id: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5, { error: 'Rating harus antara 1 dan 5' }),
  comment: z.string().max(500).optional().or(z.literal('')),
})


export const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, { error: 'Nama minimal 2 karakter' }),
  phone: z.string().min(9, { error: 'Nomor WhatsApp tidak valid' }).optional().or(z.literal('')),
  address: z.string().min(5, { error: 'Alamat terlalu pendek' }).optional().or(z.literal('')),
})

export const ChangePasswordSchema = z.object({
  new_password: z.string().min(8, { error: 'Kata sandi minimal 8 karakter' }),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  error: 'Konfirmasi kata sandi tidak cocok',
  path: ['confirm_password'],
})


export const CreateStaffSchema = z.object({
  email: z.email({ error: 'Format email tidak valid' }),
  full_name: z.string().min(2),
  password: z.string().min(8, { error: 'Kata sandi minimal 8 karakter' }),
  role: z.enum(['ketua_rt', 'ketua_rw', 'admin']),
  region_id: z.coerce.number().int().positive().optional(),
})

export const SaveCategorySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().min(2, { error: 'Nama kategori minimal 2 karakter' }),
  description: z.string().max(500).optional().or(z.literal('')),
})


export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'File harus berformat JPG atau PNG'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Ukuran file maksimal 5 MB'
  }
  return null 
}
