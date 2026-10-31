'use server'

import 'server-only'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/server'
import { createClient } from '@/utils/supabase/server'
import {
  CreateStaffSchema,
  SaveCategorySchema,
} from '@/utils/validation'
import {
  err,
  ok,
  okEmpty,
  supabaseErrorToMessage,
  type ActionResult,
} from '@/utils/action-result'
import type { UserRole } from '@/types/database.types'


async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const role = (user.app_metadata as Record<string, string>)?.sipandu_role
  if (role !== 'admin') return null
  return user.id
}


export async function createStaff(formData: FormData): Promise<ActionResult<{ user_id: string }>> {
  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin untuk membuat akun staf')

  const parsed = CreateStaffSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    password: formData.get('password'),
    role: formData.get('role'),
    region_id: formData.get('region_id') ?? undefined,
  })
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')

  const { email, full_name, password, role, region_id } = parsed.data
  const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, region_id },
    app_metadata: { sipandu_role: role },
  })

  if (error) return err(supabaseErrorToMessage(error))

    if (region_id) {
    await admin.from('profiles').update({ region_id, full_name }).eq('id', data.user.id)
  }

  revalidatePath('/dashboard/admin')
  return ok({ user_id: data.user.id })
}


export async function setStaffActive(
  userId: string,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')
  if (adminId === userId) return err('Tidak dapat mengubah status akun sendiri')

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ is_active: isActive }).eq('id', userId)
  if (error) return err(supabaseErrorToMessage(error))

    const authError = isActive
    ? (await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })).error
    : (await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })).error

  if (authError) return err(supabaseErrorToMessage(authError))

  revalidatePath('/dashboard/admin')
  return okEmpty()
}


export async function saveCategory(formData: FormData): Promise<ActionResult<{ id: number }>> {
  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  const parsed = SaveCategorySchema.safeParse({
    id: formData.get('id') ?? undefined,
    name: formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')

  const supabase = await createClient()
  const { id, ...rest } = parsed.data

  if (id) {
    const { error } = await supabase.from('categories').update(rest).eq('id', id)
    if (error) return err(supabaseErrorToMessage(error))
    revalidatePath('/dashboard/admin')
    return ok({ id })
  } else {
    const { data, error } = await supabase.from('categories').insert(rest).select('id').single()
    if (error) return err(supabaseErrorToMessage(error))
    revalidatePath('/dashboard/admin')
    return ok({ id: data.id })
  }
}


export async function setCategoryActive(
  categoryId: number,
  isActive: boolean,
): Promise<ActionResult<undefined>> {
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
  param?: boolean | number,
): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const isVerified = typeof param === "boolean" ? param : true

  const { error } = await supabase.rpc("verify_resident", {
    p_user_id: userId,
    p_is_verified: isVerified,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/rt")
  return okEmpty()
}


export async function listUsers(
  role?: UserRole,
): Promise<ActionResult<Array<{ id: string; email: string; role: string; full_name: string; is_active: boolean }>>> {
  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return err(supabaseErrorToMessage(error))

  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, is_active')

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const users = (data.users as Array<{ id: string; email?: string; app_metadata: Record<string, unknown> }>)
    .map((u) => {
      const userRole = (u.app_metadata as Record<string, string>)?.sipandu_role ?? 'warga'
      const profile = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        role: userRole,
        full_name: profile?.full_name ?? '',
        is_active: profile?.is_active ?? true,
      }
    })
    .filter((u) => !role || u.role === role)

  return ok(users)
}
