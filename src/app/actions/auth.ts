'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import { getRoleFromJwt, homePathForRole } from '@/utils/roles'
import { supabaseErrorToMessage } from '@/utils/action-result'

export type AuthResponse = {
  success?: string
  error?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(formData: FormData): Promise<AuthResponse | never> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Format email tidak valid' }
  }
  if (!password) {
    return { error: 'Kata sandi wajib diisi' }
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        'Konfigurasi Supabase belum diatur. Silakan lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: supabaseErrorToMessage(error) }
  }

  const role = getRoleFromJwt(data.session?.user?.app_metadata ?? null)

  revalidatePath('/', 'layout')
  redirect(homePathForRole(role))
}

export async function signup(formData: FormData): Promise<AuthResponse> {
  const full_name = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const region_id = Number(formData.get('region_id'))
  const password = String(formData.get('password') ?? '')

  if (full_name.length < 2) {
    return { error: 'Nama lengkap minimal 2 karakter' }
  }
  if (phone && phone.replace(/\D/g, '').length < 9) {
    return { error: 'Nomor WhatsApp tidak valid' }
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Format email tidak valid' }
  }
  if (address && address.length < 5) {
    return { error: 'Alamat tempat tinggal terlalu pendek' }
  }
  if (!Number.isInteger(region_id) || region_id <= 0) {
    return { error: 'Silakan pilih RT tempat tinggal Anda' }
  }
  if (password.length < 8) {
    return { error: 'Kata sandi minimal 8 karakter' }
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        'Konfigurasi Supabase belum diatur. Silakan lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local.',
    }
  }

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
