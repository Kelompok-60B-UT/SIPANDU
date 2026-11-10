'use server'

import { revalidatePath } from 'next/cache'
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/utils/supabase/server'
import { getRoleFromJwt } from '@/utils/roles'
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

function isProductionEnv(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.ENVIRONMENT === 'production'
  )
}

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

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('is_active, is_rt_verified, region_id')
    .eq('id', user.id)
    .single()

  if (profileError || !currentProfile) {
    return err('Profil pengguna tidak ditemukan')
  }

  if (currentProfile.is_active === false) {
    return err('Akun Anda sedang dinonaktifkan')
  }

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
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/admin')
    revalidatePath('/', 'layout')
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

      // Hapus foto profil lama pengguna agar digantikan dengan foto baru
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

        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata ?? {}),
            avatar_url: publicUrl,
            avatar_path: newPath,
          },
        })

        const { error: metaErr } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl, avatar_path: newPath },
        })
        if (metaErr) return err(supabaseErrorToMessage(metaErr))

        revalidatePath('/profile')
        revalidatePath('/dashboard/warga')
        revalidatePath('/dashboard/rt')
        revalidatePath('/dashboard/rw')
        revalidatePath('/dashboard/admin')
        revalidatePath('/', 'layout')
        return ok({ avatarUrl: publicUrl })
      }
    } catch {
      // Cadangan penyimpanan data URL pada metadata jika storage belum siap
    }
  }

  if (fallbackDataUrl) {
    try {
      const admin = createAdminClient()
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          avatar_url: fallbackDataUrl,
          avatar_path: null,
        },
      })
    } catch {
      // Abaikan jika service role tidak tersedia
    }

    const { error: metaErr } = await supabase.auth.updateUser({
      data: { avatar_url: fallbackDataUrl, avatar_path: null },
    })
    if (metaErr) return err(supabaseErrorToMessage(metaErr))

    revalidatePath('/profile')
    revalidatePath('/dashboard/warga')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/admin')
    revalidatePath('/', 'layout')
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
    if (isProductionEnv()) {
      return err('Layanan autentikasi belum dikonfigurasi pada lingkungan produksi')
    }
    return okEmpty()
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('Sesi tidak ditemukan')

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('is_active, is_rt_verified, region_id')
    .eq('id', user.id)
    .single()

  if (profileError || !currentProfile) {
    return err('Profil pengguna tidak ditemukan')
  }

  if (currentProfile.is_active === false) {
    return err('Akun Anda sedang dinonaktifkan')
  }

  const role = getRoleFromJwt(user.app_metadata) ?? 'warga'
  const { full_name, phone, address } = parsed.data
  const regionRaw = formData.get('region_id')
  const nextRegionId =
    regionRaw !== null && Number(regionRaw) > 0 ? Number(regionRaw) : undefined
  const kelurahan = String(formData.get('kelurahan') ?? '').trim() || undefined
  const city = String(formData.get('city') ?? '').trim() || undefined
  const nowIso = new Date().toISOString()

  // Hanya izinkan perubahan region_id jika Admin ATAU warga yang belum terverifikasi (pending)
  const canChangeRegion =
    role === 'admin' ||
    (role === 'warga' && currentProfile.is_rt_verified === false)

  const effectiveRegionId: number | null | undefined = canChangeRegion
    ? nextRegionId !== undefined
      ? nextRegionId
      : currentProfile.region_id
    : currentProfile.region_id

  let updatedWithAdmin = false
  try {
    const admin = createAdminClient()
    const upsertPayload: {
      id: string
      full_name: string
      phone: string | null
      address: string | null
      updated_at: string
      region_id?: number | null
    } = {
      id: user.id,
      full_name,
      phone: phone || null,
      address: address || null,
      updated_at: nowIso,
      ...(effectiveRegionId !== undefined
        ? { region_id: effectiveRegionId }
        : {}),
    }

    const { error: adminProfErr } = await admin
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'id' })

    if (!adminProfErr) {
      updatedWithAdmin = true
    }

    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        full_name,
        phone: phone || null,
        address: address || null,
        ...(effectiveRegionId !== undefined
          ? { region_id: effectiveRegionId }
          : {}),
        ...(kelurahan ? { kelurahan } : {}),
        ...(city ? { city } : {}),
      },
    })
  } catch {
    // Fallback ke client biasa bila service role belum tersedia
  }

  if (!updatedWithAdmin) {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone: phone || null,
        address: address || null,
        updated_at: nowIso,
        ...(effectiveRegionId !== undefined
          ? { region_id: effectiveRegionId }
          : {}),
      })
      .eq('id', user.id)

    if (error) return err(supabaseErrorToMessage(error))
  }

  await supabase.auth.updateUser({
    data: {
      full_name,
      phone: phone || null,
      address: address || null,
      ...(effectiveRegionId !== undefined
        ? { region_id: effectiveRegionId }
        : {}),
      ...(kelurahan ? { kelurahan } : {}),
      ...(city ? { city } : {}),
    },
  })

  revalidatePath('/profile')
  revalidatePath('/dashboard/warga')
  revalidatePath('/dashboard/rt')
  revalidatePath('/dashboard/rw')
  revalidatePath('/dashboard/admin')
  revalidatePath('/tickets/new')
  revalidatePath('/', 'layout')
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
    if (isProductionEnv()) {
      return err('Layanan autentikasi belum dikonfigurasi pada lingkungan produksi')
    }
    return okEmpty()
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
    if (isProductionEnv()) {
      return err('Layanan autentikasi belum dikonfigurasi pada lingkungan produksi')
    }
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
