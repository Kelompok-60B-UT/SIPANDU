export type ActionResult<T = undefined> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never }

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function okEmpty(): ActionResult<undefined> {
  return { success: true, data: undefined }
}

export function err(message: string): ActionResult<never> {
  return { success: false, error: message }
}

export function supabaseErrorToMessage(
  error: { message?: string; code?: string } | null,
): string {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui'

  const msg = error.message ?? ''
  const code = error.code ?? ''

  if (msg.includes('Invalid login credentials')) {
    return 'Email atau kata sandi salah'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda'
  }
  if (msg.includes('User already registered') || code === '23505') {
    if (msg.includes('email') || msg.includes('User already registered')) {
      return 'Email ini sudah terdaftar'
    }
    return 'Data sudah terdaftar di sistem'
  }
  if (msg.includes('Password should be at least')) {
    return 'Kata sandi minimal 8 karakter'
  }
  if (msg.includes('Unable to validate email address')) {
    return 'Format email tidak valid'
  }
  if (msg.includes('Token has expired')) {
    return 'Sesi telah berakhir, silakan masuk kembali'
  }
  if (code === '42501' || msg.includes('permission denied')) {
    return 'Anda tidak memiliki izin untuk melakukan tindakan ini'
  }
  if (msg.includes('new row violates row-level security')) {
    return 'Akses ditolak'
  }
  if (msg.includes('Tiket tidak ditemukan')) return 'Tiket tidak ditemukan'
  if (msg.includes('Alasan penolakan wajib')) return 'Alasan penolakan wajib diisi'
  if (msg.includes('Minimal satu foto')) {
    return 'Minimal satu foto bukti penyelesaian wajib diunggah'
  }
  if (msg.includes('Rating sudah diberikan')) {
    return 'Anda sudah memberikan penilaian sebelumnya'
  }

  if (/[a-zA-Z]/.test(msg) && msg.length < 200) return msg

  return 'Terjadi kesalahan. Silakan coba lagi'
}
