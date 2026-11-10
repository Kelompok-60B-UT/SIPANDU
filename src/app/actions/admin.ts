'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/utils/supabase/server'
import { CreateStaffSchema, SaveCategorySchema } from '@/utils/validation'
import { siteConfig } from '@/config/site'
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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const role = (user.app_metadata as Record<string, string> | undefined)
    ?.sipandu_role
  if (role !== 'admin') return null

  // Validasi tambahan: akun admin wajib memiliki profil aktif
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (profErr || !profile || profile.is_active === false) {
    return null
  }

  return user.id
}

type AdminCountResult =
  | { success: true; count: number }
  | { success: false; error: string }

async function getActiveAdminsCount(
  adminClient: ReturnType<typeof createAdminClient>,
  excludeUserId?: string,
): Promise<AdminCountResult> {
  const PAGE_SIZE = 100
  let page = 1
  const allAdminUserIds: string[] = []
  const now = new Date()

  try {
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage: PAGE_SIZE,
      })

      if (error) {
        return {
          success: false,
          error: `Gagal memuat pengguna pada halaman ${page}: ${error.message}`,
        }
      }

      if (!data || !data.users) {
        return {
          success: false,
          error: `Respons data pengguna pada halaman ${page} kosong atau tidak valid`,
        }
      }

      for (const u of data.users) {
        const role = (u.app_metadata as Record<string, string> | undefined)
          ?.sipandu_role
        const isNotBanned =
          !u.banned_until || new Date(u.banned_until) <= now
        const isNotDeleted = !(u as { deleted_at?: string | null }).deleted_at

        if (
          role === 'admin' &&
          isNotBanned &&
          isNotDeleted &&
          (!excludeUserId || u.id !== excludeUserId)
        ) {
          allAdminUserIds.push(u.id)
        }
      }

      if (data.users.length < PAGE_SIZE) {
        break
      }

      page++
    }
  } catch (err) {
    return {
      success: false,
      error: `Pengecualian saat memuat pengguna auth: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  if (allAdminUserIds.length === 0) {
    return { success: true, count: 0 }
  }

  try {
    const { data: activeProfiles, error: profErr } = await adminClient
      .from('profiles')
      .select('id')
      .in('id', allAdminUserIds)
      .eq('is_active', true)

    if (profErr || !activeProfiles) {
      return {
        success: false,
        error: `Gagal memverifikasi keaktifan profil admin: ${profErr?.message ?? 'Data profil kosong'}`,
      }
    }

    return { success: true, count: activeProfiles.length }
  } catch (err) {
    return {
      success: false,
      error: `Pengecualian saat memverifikasi profil admin: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

async function isTargetAdmin(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data?.user) return false
  const u = data.user as {
    app_metadata?: Record<string, unknown>
    banned_until?: string | null
    deleted_at?: string | null
  }
  const role = u.app_metadata?.sipandu_role
  if (role !== 'admin') return false
  if (u.deleted_at) return false
  if (u.banned_until && new Date(u.banned_until).getTime() > Date.now()) {
    return false
  }

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('is_active')
    .eq('id', userId)
    .single()

  if (profErr || !profile) return false
  return profile.is_active === true
}

export async function createStaff(
  formData: FormData,
): Promise<ActionResult<{ id: string; user_id: string }>> {
  const regionRaw = formData.get('region_id')
  const parsed = CreateStaffSchema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    full_name: String(formData.get('full_name') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    role: formData.get('role') ?? 'ketua_rt',
    region_id: regionRaw ? Number(regionRaw) : undefined,
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
  }

  const { email, full_name, password, role, region_id } = parsed.data
  const phone = String(formData.get('phone') ?? '').trim() || null
  const address = String(formData.get('address') ?? '').trim() || null

  if (!isSupabaseConfigured()) {
    const previewId = `preview-${Date.now()}`
    return ok({ id: previewId, user_id: previewId })
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
      is_rt_verified: true,
    })
    .eq('id', data.user.id)

  revalidatePath('/dashboard/admin')
  return ok({ id: data.user.id, user_id: data.user.id })
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

  if (!isActive) {
    const targetIsAdmin = await isTargetAdmin(admin, userId)
    if (targetIsAdmin) {
      const adminCountRes = await getActiveAdminsCount(admin, userId)
      if (!adminCountRes.success) {
        return err(
          `Gagal memverifikasi jumlah Admin: ${adminCountRes.error}. Tindakan dibatalkan demi keamanan.`,
        )
      }
      if (adminCountRes.count < 1) {
        return err(
          'Tidak dapat menonaktifkan akun Admin ini. Sistem wajib mempertahankan minimal 1 akun Admin aktif.',
        )
      }
    }
  }

  if (!isActive) {
    // Saat menonaktifkan: update Auth (ban) terlebih dahulu agar trigger database memeriksa invariant
    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: '876000h',
    })
    if (banErr) return err(supabaseErrorToMessage(banErr))

    const { error: profErr } = await admin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (profErr) {
      // Aksi kompensasi: unban kembali di Auth jika update profiles gagal
      const { error: rollbackErr } = await admin.auth.admin.updateUserById(
        userId,
        { ban_duration: 'none' },
      )
      if (rollbackErr) {
        console.error(
          `CRITICAL: Compensating unban failed for user ${userId}:`,
          rollbackErr,
        )
      }
      return err(supabaseErrorToMessage(profErr))
    }
  } else {
    // Saat mengaktifkan kembali: aktifkan profil terlebih dahulu, lalu lepas ban di Auth
    const { error: profErr } = await admin
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId)
    if (profErr) return err(supabaseErrorToMessage(profErr))

    const { error: unbanErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    })
    if (unbanErr) {
      // Aksi kompensasi: kembalikan is_active ke false
      const { error: rollbackErr } = await admin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)
      if (rollbackErr) {
        console.error(
          `CRITICAL: Compensating profile deactivate failed for user ${userId}:`,
          rollbackErr,
        )
      }
      return err(supabaseErrorToMessage(unbanErr))
    }
  }

  revalidatePath('/dashboard/admin')
  return okEmpty()
}

export async function deleteUserByAdmin(
  userId: string,
): Promise<ActionResult<undefined>> {
  const cleanUserId = userId.trim()
  if (!cleanUserId) {
    return err('ID pengguna tidak valid')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')
  if (adminId === cleanUserId) {
    return err('Tidak dapat menghapus akun Admin yang sedang digunakan')
  }

  try {
    const admin = createAdminClient()

    const targetIsAdmin = await isTargetAdmin(admin, cleanUserId)
    if (targetIsAdmin) {
      const adminCountRes = await getActiveAdminsCount(admin, cleanUserId)
      if (!adminCountRes.success) {
        return err(
          `Gagal memverifikasi jumlah Admin: ${adminCountRes.error}. Tindakan dibatalkan demi keamanan.`,
        )
      }
      if (adminCountRes.count < 1) {
        return err(
          'Tidak dapat menghapus akun Admin ini. Sistem wajib mempertahankan minimal 1 akun Admin aktif.',
        )
      }
    }

    // Bersihkan berkas foto profil pengguna pada bucket avatars (jika ada)
    try {
      const { data: avatarFiles } = await admin.storage
        .from('avatars')
        .list(cleanUserId)
      const avatarPaths = (avatarFiles ?? []).map(
        (f) => `${cleanUserId}/${f.name}`,
      )
      if (avatarPaths.length > 0) {
        await admin.storage.from('avatars').remove(avatarPaths)
      }
    } catch {
      // Abaikan bila bucket avatars belum ada
    }

    // Lepas referensi penanganan dan riwayat timeline pada tiket warga lain
    await admin
      .from('tickets')
      .update({ handler_rt_id: null })
      .eq('handler_rt_id', cleanUserId)

    await admin
      .from('tickets')
      .update({ handler_rw_id: null })
      .eq('handler_rw_id', cleanUserId)

    await admin
      .from('ticket_timeline')
      .update({ actor_id: null })
      .eq('actor_id', cleanUserId)

    // Bersihkan lampiran dan berkas penyimpanan tiket milik pengguna
    const { data: userTickets } = await admin
      .from('tickets')
      .select('id')
      .eq('user_id', cleanUserId)

    const userTicketIds = (userTickets ?? []).map((t) => t.id)

    if (userTicketIds.length > 0) {
      const { data: ticketAttachments } = await admin
        .from('ticket_attachments')
        .select('storage_path')
        .in('ticket_id', userTicketIds)

      const storagePaths = (ticketAttachments ?? [])
        .map((a) => a.storage_path)
        .filter((p): p is string => Boolean(p))

      if (storagePaths.length > 0) {
        await admin.storage.from('ticket-attachments').remove(storagePaths)
      }

      await admin
        .from('notifications')
        .delete()
        .in('ticket_id', userTicketIds)
      await admin
        .from('ticket_timeline')
        .delete()
        .in('ticket_id', userTicketIds)
      await admin
        .from('ticket_attachments')
        .delete()
        .in('ticket_id', userTicketIds)
      await admin.from('tickets').delete().in('id', userTicketIds)
    }

    // Alihkan kepemilikan berkas bukti pada tiket pihak lain ke akun admin agar dokumen tetap utuh
    await admin
      .from('ticket_attachments')
      .update({ uploaded_by: adminId })
      .eq('uploaded_by', cleanUserId)

    // Hapus notifikasi, profil, dan akun autentikasi pengguna
    await admin.from('notifications').delete().eq('user_id', cleanUserId)
    await admin.from('profiles').delete().eq('id', cleanUserId)

    const { error: authDelErr } =
      await admin.auth.admin.deleteUser(cleanUserId)
    if (authDelErr) {
      return err(supabaseErrorToMessage(authDelErr))
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/warga')
    return okEmpty()
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal menghapus akun pengguna')
  }
}

export async function saveCategory(
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const idRaw = formData.get('id')
  const parsed = SaveCategorySchema.safeParse({
    id: idRaw ? Number(idRaw) : undefined,
    name: String(formData.get('name') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || undefined,
  })
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Data tidak valid')
  }

  const { id, name, description } = parsed.data

  if (!isSupabaseConfigured()) {
    return ok({ id: id ?? Date.now() })
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  const supabase = await createClient()
  const payload = { name, description: description || null }

  if (id) {
    const { error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
    if (error) return err(supabaseErrorToMessage(error))
    revalidatePath('/dashboard/admin')
    return ok({ id })
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
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
  revalidatePath('/tickets/new')
  return okEmpty()
}

export async function deleteCategory(categoryId: number): Promise<
  ActionResult<{
    fallbackCategoryId: number
    fallbackCategoryName: string
    movedCount: number
  }>
> {
  if (!isSupabaseConfigured()) {
    return ok({
      fallbackCategoryId: 6,
      fallbackCategoryName: 'Layanan lainnya',
      movedCount: 0,
    })
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  try {
    const admin = createAdminClient()

    const { data: targetCat, error: targetErr } = await admin
      .from('categories')
      .select('id, name')
      .eq('id', categoryId)
      .single()

    if (targetErr || !targetCat) {
      return err('Kategori tidak ditemukan')
    }

    const lowerTarget = targetCat.name.trim().toLowerCase()
    if (lowerTarget === 'lainnya' || lowerTarget === 'layanan lainnya') {
      return err(
        'Kategori "Lainnya" merupakan kategori penampung utama dan tidak dapat dihapus.',
      )
    }

    // Cari kategori penampung "Lainnya" / "Layanan lainnya"
    const { data: allCats } = await admin
      .from('categories')
      .select('id, name, is_active')
      .neq('id', categoryId)
      .order('id', { ascending: true })

    let fallbackCat = (allCats ?? []).find((c) =>
      c.name.toLowerCase().includes('lainnya'),
    )

    if (!fallbackCat) {
      const { data: created, error: createErr } = await admin
        .from('categories')
        .insert({
          name: 'Lainnya',
          description: 'Pengaduan di luar kategori yang tersedia',
          is_active: true,
        })
        .select('id, name, is_active')
        .single()
      if (createErr || !created) {
        return err(
          createErr
            ? supabaseErrorToMessage(createErr)
            : 'Gagal menyiapkan kategori Lainnya',
        )
      }
      fallbackCat = created
    } else if (!fallbackCat.is_active) {
      await admin
        .from('categories')
        .update({ is_active: true })
        .eq('id', fallbackCat.id)
    }

    // Hitung laporan yang menggunakan kategori ini lalu pindahkan ke kategori Lainnya
    const { count: ticketCount } = await admin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)

    const movedCount = ticketCount ?? 0
    if (movedCount > 0) {
      const { error: moveErr } = await admin
        .from('tickets')
        .update({
          category_id: fallbackCat.id,
          updated_at: new Date().toISOString(),
        })
        .eq('category_id', categoryId)
      if (moveErr) return err(supabaseErrorToMessage(moveErr))
    }

    const { error: delErr } = await admin
      .from('categories')
      .delete()
      .eq('id', categoryId)
    if (delErr) return err(supabaseErrorToMessage(delErr))

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/warga')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/tickets/new')

    return ok({
      fallbackCategoryId: fallbackCat.id,
      fallbackCategoryName: fallbackCat.name,
      movedCount,
    })
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal menghapus kategori layanan')
  }
}

export async function updateUserRole(input: {
  userId: string
  role: UserRole
  regionId?: number | null
}): Promise<ActionResult<undefined>> {
  const validRoles: UserRole[] = ['warga', 'ketua_rt', 'ketua_rw', 'admin']
  if (!validRoles.includes(input.role)) {
    return err('Peran tidak valid')
  }

  if (!isSupabaseConfigured()) return okEmpty()

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')
  if (adminId === input.userId && input.role !== 'admin') {
    return err('Tidak dapat menurunkan peran akun Admin Anda sendiri')
  }

  try {
    const admin = createAdminClient()

    if (input.role !== 'admin') {
      const targetIsAdmin = await isTargetAdmin(admin, input.userId)
      if (targetIsAdmin) {
        const adminCountRes = await getActiveAdminsCount(admin, input.userId)
        if (!adminCountRes.success) {
          return err(
            `Gagal memverifikasi jumlah Admin: ${adminCountRes.error}. Tindakan dibatalkan demi keamanan.`,
          )
        }
        if (adminCountRes.count < 1) {
          return err(
            'Tidak dapat mengubah peran akun Admin ini. Sistem wajib mempertahankan minimal 1 akun Admin aktif.',
          )
        }
      }
    }

    const nextRegionId =
      input.role === 'warga' || input.role === 'ketua_rt'
        ? input.regionId && input.regionId > 0
          ? input.regionId
          : null
        : input.regionId && input.regionId > 0
          ? input.regionId
          : null

    const { error: authErr } = await admin.auth.admin.updateUserById(
      input.userId,
      {
        app_metadata: { sipandu_role: input.role },
        user_metadata: { region_id: nextRegionId },
      },
    )
    if (authErr) return err(supabaseErrorToMessage(authErr))

    const profileUpdate: {
      region_id: number | null
      updated_at: string
      is_rt_verified?: boolean
    } = {
      region_id: nextRegionId,
      updated_at: new Date().toISOString(),
    }
    if (input.role !== 'warga') {
      profileUpdate.is_rt_verified = true
    }

    const { error: profErr } = await admin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', input.userId)
    if (profErr) return err(supabaseErrorToMessage(profErr))

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/warga')
    return okEmpty()
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal memperbarui peran akun')
  }
}

export async function saveRegion(input: {
  id?: number
  name: string
  rw?: string
  isActive?: boolean
  leaderUserId?: string | null
}): Promise<
  ActionResult<{ id: number; name: string; rw: string; isActive: boolean }>
> {
  const name = input.name.trim()
  const rw = siteConfig.rwNumber
  const isActive = input.isActive ?? true

  if (name.length < 2) {
    return err('Nama RT wajib diisi (minimal 2 karakter)')
  }

  if (!isSupabaseConfigured()) {
    return ok({
      id: input.id ?? Date.now(),
      name,
      rw,
      isActive,
    })
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  try {
    const admin = createAdminClient()
    let regionId = input.id

    if (regionId) {
      const { error } = await admin
        .from('regions')
        .update({ name, rw, is_active: isActive })
        .eq('id', regionId)
      if (error) return err(supabaseErrorToMessage(error))
    } else {
      const { data, error } = await admin
        .from('regions')
        .insert({ name, rw, is_active: isActive })
        .select('id')
        .single()
      if (error || !data) {
        return err(
          error ? supabaseErrorToMessage(error) : 'Gagal menambahkan wilayah RT',
        )
      }
      regionId = data.id
    }

    if (input.leaderUserId && regionId) {
      const targetIsAdmin = await isTargetAdmin(admin, input.leaderUserId)
      if (targetIsAdmin) {
        const adminCountRes = await getActiveAdminsCount(
          admin,
          input.leaderUserId,
        )
        if (!adminCountRes.success) {
          return err(
            `Gagal memverifikasi jumlah Admin: ${adminCountRes.error}. Tindakan dibatalkan demi keamanan.`,
          )
        }
        if (adminCountRes.count < 1) {
          return err(
            'Akun ini adalah satu-satunya akun Admin aktif dan tidak dapat dialihkan menjadi Ketua RT.',
          )
        }
      }

      await admin.auth.admin.updateUserById(input.leaderUserId, {
        app_metadata: { sipandu_role: 'ketua_rt' },
        user_metadata: { region_id: regionId },
      })
      await admin
        .from('profiles')
        .update({
          region_id: regionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.leaderUserId)
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/warga')
    revalidatePath('/register')
    revalidatePath('/tickets/new')

    return ok({ id: regionId, name, rw, isActive })
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal menyimpan data wilayah RT')
  }
}

export async function deleteRegion(
  regionId: number,
): Promise<ActionResult<{ fallbackRegionId: number; fallbackRegionName: string }>> {
  if (!isSupabaseConfigured()) {
    return ok({ fallbackRegionId: 1, fallbackRegionName: 'RT 01' })
  }

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  try {
    const admin = createAdminClient()
    const { data: otherRegions } = await admin
      .from('regions')
      .select('id, name')
      .neq('id', regionId)
      .order('id', { ascending: true })

    if (!otherRegions || otherRegions.length === 0) {
      return err('Minimal harus ada 1 wilayah RT aktif di dalam sistem.')
    }

    const fallback = otherRegions[0]

    // Pindahkan warga & tiket yang terhubung ke wilayah penampung agar tidak melanggar FK
    await admin
      .from('profiles')
      .update({
        region_id: fallback.id,
        updated_at: new Date().toISOString(),
      })
      .eq('region_id', regionId)

    await admin
      .from('tickets')
      .update({
        region_id: fallback.id,
        updated_at: new Date().toISOString(),
      })
      .eq('region_id', regionId)

    const { error: delErr } = await admin
      .from('regions')
      .delete()
      .eq('id', regionId)
    if (delErr) return err(supabaseErrorToMessage(delErr))

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/warga')
    revalidatePath('/register')
    revalidatePath('/tickets/new')

    return ok({
      fallbackRegionId: fallback.id,
      fallbackRegionName: fallback.name,
    })
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal menghapus wilayah RT')
  }
}

export async function updateRwSettings(input: {
  rwNumber?: string
  rwAreaName?: string
  rwLeaderUserId?: string | null
}): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const adminId = await requireAdmin()
  if (!adminId) return err('Anda tidak memiliki izin')

  try {
    const admin = createAdminClient()

    if (input.rwLeaderUserId) {
      const targetIsAdmin = await isTargetAdmin(admin, input.rwLeaderUserId)
      if (targetIsAdmin) {
        const adminCountRes = await getActiveAdminsCount(
          admin,
          input.rwLeaderUserId,
        )
        if (!adminCountRes.success) {
          return err(
            `Gagal memverifikasi jumlah Admin: ${adminCountRes.error}. Tindakan dibatalkan demi keamanan.`,
          )
        }
        if (adminCountRes.count < 1) {
          return err(
            'Akun ini adalah satu-satunya akun Admin aktif dan tidak dapat dialihkan menjadi Ketua RW.',
          )
        }
      }

      await admin.auth.admin.updateUserById(input.rwLeaderUserId, {
        app_metadata: { sipandu_role: 'ketua_rw' },
      })
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/rw')
    revalidatePath('/dashboard/rt')
    revalidatePath('/dashboard/warga')
    return okEmpty()
  } catch (error) {
    unstable_rethrow(error)
    return err('Gagal menyimpan penetapan Ketua RW')
  }
}

export async function verifyResident(
  userId: string,
  param: boolean | number = true,
): Promise<ActionResult<undefined>> {
  if (!isSupabaseConfigured()) return okEmpty()

  const supabase = await createClient()
  const isVerified = typeof param === 'boolean' ? param : true

  const { error } = await supabase.rpc('verify_resident', {
    p_user_id: userId,
    p_is_verified: isVerified,
  })
  if (error) return err(supabaseErrorToMessage(error))

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/rt')
  revalidatePath('/dashboard/rw')
  revalidatePath('/dashboard/warga')
  return okEmpty()
}

export interface AdminUserItem {
  id: string
  email: string
  role: UserRole
  full_name: string
  region_id: number | null
  is_active: boolean
  is_rt_verified: boolean
  created_at?: string
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
      .select('id, full_name, region_id, is_active, is_rt_verified, created_at')

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
          is_rt_verified:
            userRole !== 'warga' ? true : (profile?.is_rt_verified ?? false),
          created_at: profile?.created_at,
        }
      })
      .filter((u) => !role || u.role === role)

    return ok(users)
  } catch (error) {
    unstable_rethrow(error)
    return err('Service role key belum dikonfigurasi untuk daftar akun')
  }
}
