'use server'

import { revalidatePath } from 'next/cache'
import { createClient, isSupabaseConfigured } from '@/utils/supabase/server'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import type { Notification, Profile } from '@/types/database.types'

export async function getProfile(): Promise<ActionResult<Profile>> {
  if (!isSupabaseConfigured()) {
    return err('Supabase belum dikonfigurasi')
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return err(supabaseErrorToMessage(error))
  return ok(data)
}

export async function updateProfile(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const full_name = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()

  if (full_name.length < 2) {
    return err('Nama lengkap minimal 2 karakter')
  }
  if (phone && phone.replace(/\D/g, '').length < 9) {
    return err('Nomor telepon tidak valid')
  }
  if (address && address.length < 5) {
    return err('Alamat lengkap terlalu pendek')
  }

  if (!isSupabaseConfigured()) {
    return okEmpty()
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone: phone || null,
      address: address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/profile')
  revalidatePath('/dashboard/warga')
  return okEmpty()
}

export async function changePassword(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const newPassword = String(
    formData.get('new_password') ?? formData.get('password') ?? '',
  )
  const confirmPassword = formData.get('confirm_password')

  if (newPassword.length < 8) {
    return err('Kata sandi baru minimal 8 karakter')
  }
  if (confirmPassword !== null && String(confirmPassword) !== newPassword) {
    return err('Konfirmasi kata sandi tidak cocok')
  }

  if (!isSupabaseConfigured()) {
    return err('Konfigurasi Supabase belum diatur pada .env.local')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) return err(supabaseErrorToMessage(error))
  return okEmpty()
}

export async function listNotifications(
  unreadOnly = false,
): Promise<ActionResult<Notification[]>> {
  if (!isSupabaseConfigured()) {
    return err('Supabase belum dikonfigurasi')
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query
  if (error) return err(supabaseErrorToMessage(error))
  return ok(data)
}

export async function markNotificationsRead(
  notificationIds?: number[],
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) {
    return okEmpty()
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)

  if (notificationIds && notificationIds.length > 0) {
    query = query.in('id', notificationIds)
  }

  const { error } = await query
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/', 'layout')
  return okEmpty()
}
