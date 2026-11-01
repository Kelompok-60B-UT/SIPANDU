'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { getRoleFromJwt, homePathForRole } from '@/utils/roles'
import { supabaseErrorToMessage } from '@/utils/action-result'

const LoginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(1, { message: 'Kata sandi wajib diisi' }),
})

const SignupSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(8, { message: 'Kata sandi minimal 8 karakter' }),
  full_name: z.string().min(2, { message: 'Nama lengkap minimal 2 karakter' }),
  phone: z
    .string()
    .min(9, { message: 'Nomor WhatsApp tidak valid' })
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .min(5, { message: 'Alamat tempat tinggal terlalu pendek' })
    .optional()
    .or(z.literal('')),
  region_id: z.coerce
    .number()
    .int()
    .positive({ message: 'Silakan pilih RT tempat tinggal Anda' }),
})

export type AuthResponse = {
  success?: string
  error?: string
}

export async function login(formData: FormData): Promise<AuthResponse | never> {
  const parsed = LoginSchema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        'Konfigurasi Supabase belum diatur. Silakan lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: supabaseErrorToMessage(error) }
  }

  const role = getRoleFromJwt(data.session?.user?.app_metadata ?? null)

  revalidatePath('/', 'layout')
  redirect(homePathForRole(role))
}

export async function signup(formData: FormData): Promise<AuthResponse> {
  const parsed = SignupSchema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    full_name: String(formData.get('full_name') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    region_id: formData.get('region_id'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        'Konfigurasi Supabase belum diatur. Silakan lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.',
    }
  }

  const { email, password, full_name, phone, address, region_id } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone: phone || null,
        address: address || null,
        region_id,
      },
    },
  })

  if (error) {
    return { error: supabaseErrorToMessage(error) }
  }

  revalidatePath('/', 'layout')
  return {
    success:
      'Pendaftaran berhasil! Silakan cek kotak masuk email Anda untuk konfirmasi akun.',
  }
}

export async function signOut(): Promise<never> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}
