'use server'

import { revalidatePath } from 'next/cache'
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/utils/supabase/server'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import type { UserRole } from '@/types/database.types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const role = (user.app_metadata as Record<string, string> | undefined)
    ?.sipandu_role
  if (role !== 'admin') return null
  return user.id
}

export async function createStaff(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const email = String(formData.get('email') ?? '').trim()
  const full_name = String(formData.get('full_name') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const role = String(formData.get('role') ?? 'ketua_rt') as UserRole
  const regionRaw = formData.get('region_id')
  const region_id = regionRaw ? Number(regionRaw) : null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const address = String(formData.get('address') ?? '').trim() || null

  if (full_name.length < 2) {
    return err('Nama lengkap minimal 2 karakter')
  }
  if (!EMAIL_REGEX.test(email)) {
    return err('Format email tidak valid')
  }
  if (password.length < 8) {
    return err('Kata sandi minimal 8 karakter')
  }

  if (!isSupabaseConfigured()) {
    return ok({ id: `preview-${Date.now()}` })
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin untuk membuat akun staf')

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, region_id, phone, address },
    app_metadata: { sipandu_role: role },
  })

  if (error) return err(supabaseErrorToMessage(error))

  await admin
    .from('profiles')
    .update({
      full_name,
      region_id: region_id && region_id > 0 ? region_id : null,
      phone,
      address,
    })
    .eq('id', data.user.id)

  revalidatePath('/dashboard/admin')
  return ok({ id: data.user.id })
}

export async function setStaffActive(
  userId: string,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')
  if (adminId === userId) return err('Tidak dapat mengubah status akun sendiri')

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) return err(supabaseErrorToMessage(error))

  const authError = isActive
    ? (await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' }))
        .error
    : (
        await admin.auth.admin.updateUserById(userId, {
          ban_duration: '876000h',
        })
      ).error

  if (authError) return err(supabaseErrorToMessage(authError))

  revalidatePath('/dashboard/admin')
  return okEmpty()
}

export async function saveCategory(
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const idRaw = formData.get('id')
  const id = idRaw ? Number(idRaw) : undefined
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null

  if (name.length < 2) {
    return err('Nama kategori minimal 2 karakter')
  }

  if (!isSupabaseConfigured()) {
    return ok({ id: id ?? Date.now() })
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  const supabase = await createClient()

  if (id) {
    const { error } = await supabase
      .from('categories')
      .update({ name, description })
      .eq('id', id)
    if (error) return err(supabaseErrorToMessage(error))
    revalidatePath('/dashboard/admin')
    return ok({ id })
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description })
    .select('id')
    .single()
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/admin')
  return ok({ id: data.id })
}

export async function setCategoryActive(
  categoryId: number,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', categoryId)

  if (error) return err(supabaseErrorToMessage(error))
  revalidatePath('/dashboard/admin')
  return okEmpty()
}

export async function verifyResident(
  userId: string,
  isVerified = true,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const { error } = await supabase.rpc('verify_resident', {
    p_user_id: userId,
    p_is_verified: isVerified,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/rt')
  return okEmpty()
}

export interface AdminUserItem {
  id: string
  email: string
  role: UserRole
  full_name: string
  region_id: number | null
  is_active: boolean
}

export async function listUsers(
  role?: UserRole,
): Promise<ActionResult<AdminUserItem[]>> {
  if (!isSupabaseConfigured()) {
    return err('Supabase belum dikonfigurasi')
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error) return err(supabaseErrorToMessage(error))

    const supabase = await createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, region_id, is_active')

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const users: AdminUserItem[] = (
      data.users as Array<{
        id: string
        email?: string
        app_metadata: Record<string, unknown>
      }>
    )
      .map((u) => {
        const rawRole = (u.app_metadata as Record<string, string>)?.sipandu_role
        const userRole: UserRole =
          rawRole === 'admin' ||
          rawRole === 'ketua_rw' ||
          rawRole === 'ketua_rt' ||
          rawRole === 'warga'
            ? rawRole
            : 'warga'
        const profile = profileMap.get(u.id)
        return {
          id: u.id,
          email: u.email ?? '',
          role: userRole,
          full_name: profile?.full_name ?? '',
          region_id: profile?.region_id ?? null,
          is_active: profile?.is_active ?? true,
        }
      })
      .filter((u) => !role || u.role === role)

    return ok(users)
  } catch {
    return err('Service role key belum dikonfigurasi untuk daftar akun')
  }
}
