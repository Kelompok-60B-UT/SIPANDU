'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { homePathForRole, getRoleFromJwt } from '@/utils/roles'
import { supabaseErrorToMessage } from '@/utils/action-result'

const LoginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(1, { message: 'Kata sandi wajib diisi' }),
})

const SignupSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(8, { message: 'Kata sandi minimal 8 karakter' }),
  full_name: z.string().min(2, { message: 'Nama lengkap minimal 2 karakter' }),
  phone: z.string().min(9, { message: 'Nomor WhatsApp tidak valid' }).optional().or(z.literal('')),
  address: z.string().min(5, { message: 'Alamat terlalu pendek' }).optional().or(z.literal('')),
  region_id: z.coerce.number().int().positive({ message: 'RT wajib dipilih' }),
})

export type AuthResponse = {
  success?: string
  error?: string
}

export async function login(formData: FormData): Promise<AuthResponse | never> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
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
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    region_id: formData.get('region_id'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }
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

  return { success: 'Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi akun.' }
}

export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
