'use server'

import { revalidatePath } from 'next/cache'
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/utils/supabase/server'
import { UpdateProfileSchema, ChangePasswordSchema } from '@/utils/validation'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import type { Notification, Profile } from '@/types/database.types'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

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

export async function updateProfileAvatar(
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string | null }>> {
  const remove = formData.get('remove') === 'true'
  const file = formData.get('avatar') as File | null
  const fallbackDataUrl = String(formData.get('avatar_data_url') ?? '').trim()

  if (!isSupabaseConfigured()) {
    return ok({ avatarUrl: remove ? null : fallbackDataUrl || null })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const oldPath =
    typeof user.user_metadata?.avatar_path === 'string'
      ? user.user_metadata.avatar_path
      : null

  if (remove) {
    try {
      const admin = createAdminClient()
      const { data: existingFiles } = await admin.storage
        .from(AVATAR_BUCKET)
        .list(user.id)
      const pathsToRemove = (existingFiles ?? []).map(
        (f) => `${user.id}/${f.name}`,
      )
      if (oldPath && !pathsToRemove.includes(oldPath)) {
        pathsToRemove.push(oldPath)
      }
      if (pathsToRemove.length > 0) {
        await admin.storage.from(AVATAR_BUCKET).remove(pathsToRemove)
      }
    } catch {
      // Abaikan jika service role tidak tersedia
    }

    const { error: metaErr } = await supabase.auth.updateUser({
      data: { avatar_url: null, avatar_path: null },
    })
    if (metaErr) return err(supabaseErrorToMessage(metaErr))

    revalidatePath('/profile')
    revalidatePath('/dashboard/warga')
    return ok({ avatarUrl: null })
  }

  if (file && file.size > 0) {
    if (file.size > MAX_AVATAR_BYTES) {
      return err('Ukuran foto profil maksimal 2 MB.')
    }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      return err('Format foto profil harus JPG atau PNG.')
    }

    try {
      const admin = createAdminClient()
      const { data: bucket } = await admin.storage.getBucket(AVATAR_BUCKET)
      if (!bucket) {
        await admin.storage.createBucket(AVATAR_BUCKET, {
          public: true,
          fileSizeLimit: MAX_AVATAR_BYTES,
          allowedMimeTypes: ['image/jpeg', 'image/png'],
        })
      }

      // Hapus seluruh foto profil lama milik user agar selalu tergantikan (replace)
      const { data: existingFiles } = await admin.storage
        .from(AVATAR_BUCKET)
        .list(user.id)
      const pathsToRemove = (existingFiles ?? []).map(
        (f) => `${user.id}/${f.name}`,
      )
      if (oldPath && !pathsToRemove.includes(oldPath)) {
        pathsToRemove.push(oldPath)
      }
      if (pathsToRemove.length > 0) {
        await admin.storage.from(AVATAR_BUCKET).remove(pathsToRemove)
      }

      const ext = file.type === 'image/png' ? 'png' : 'jpg'
      const newPath = `${user.id}/avatar-${Date.now()}.${ext}`
      const arrayBuffer = await file.arrayBuffer()

      const { error: upErr } = await admin.storage
        .from(AVATAR_BUCKET)
        .upload(newPath, arrayBuffer, {
          contentType: file.type,
          upsert: true,
        })

      if (!upErr) {
        const {
          data: { publicUrl },
        } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(newPath)

        const { error: metaErr } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl, avatar_path: newPath },
        })
        if (metaErr) return err(supabaseErrorToMessage(metaErr))

        revalidatePath('/profile')
        revalidatePath('/dashboard/warga')
        return ok({ avatarUrl: publicUrl })
      }
    } catch {
      // Fallback ke penyimpanan user_metadata data URL jika storage admin belum tersedia
    }
  }

  if (fallbackDataUrl) {
    const { error: metaErr } = await supabase.auth.updateUser({
      data: { avatar_url: fallbackDataUrl, avatar_path: null },
    })
    if (metaErr) return err(supabaseErrorToMessage(metaErr))

    revalidatePath('/profile')
    revalidatePath('/dashboard/warga')
    return ok({ avatarUrl: fallbackDataUrl })
  }

  return err('Tidak ada file foto profil yang dipilih.')
}

export async function updateProfile(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = UpdateProfileSchema.safeParse({
    full_name: String(formData.get('full_name') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
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

  const { full_name, phone, address } = parsed.data
  const regionRaw = formData.get('region_id')
  const nextRegionId =
    regionRaw !== null && Number(regionRaw) > 0 ? Number(regionRaw) : undefined
  const kelurahan = String(formData.get('kelurahan') ?? '').trim() || undefined
  const city = String(formData.get('city') ?? '').trim() || undefined

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

  if (nextRegionId !== undefined) {
    try {
      const admin = createAdminClient()
      await admin
        .from('profiles')
        .update({
          region_id: nextRegionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    } catch {
      // Abaikan jika service role belum diset
    }
  }

  await supabase.auth.updateUser({
    data: {
      full_name,
      phone: phone || null,
      address: address || null,
      ...(nextRegionId !== undefined ? { region_id: nextRegionId } : {}),
      ...(kelurahan ? { kelurahan } : {}),
      ...(city ? { city } : {}),
    },
  })

  revalidatePath('/profile')
  revalidatePath('/dashboard/warga')
  revalidatePath('/tickets/new')
  return okEmpty()
}

export async function changePassword(
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const newPassword = String(
    formData.get('new_password') ?? formData.get('password') ?? '',
  )
  const confirmRaw = formData.get('confirm_password')
  const confirmPassword =
    confirmRaw !== null ? String(confirmRaw) : newPassword

  const parsed = ChangePasswordSchema.safeParse({
    new_password: newPassword,
    confirm_password: confirmPassword,
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
  }

  if (!isSupabaseConfigured()) {
    return err('Konfigurasi Supabase belum diatur pada .env.local')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
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
