import { SupabaseClient } from '@supabase/supabase-js'

export interface CleanupError {
  resource: 'profile' | 'storage' | 'timeline' | 'attachment' | 'notification' | 'ticket' | 'user'
  identifier: string | number
  error: string
}

export interface CleanupParams {
  createdTicketIds: number[]
  createdUserIds: string[]
  createdStoragePaths: string[]
  createdNotificationIds?: number[]
  warga1Id?: string
  initialWarga1Profile?: { is_rt_verified: boolean; is_active: boolean } | null
  initialWarga1NotificationIds?: number[]
}

/**
 * Membersihkan seluruh resource yang dibuat selama sesi pengujian backend
 * dan memulihkan profil akun demo warga1 ke kondisi semula.
 * Penghapusan dilakukan dari tabel anak ke tabel induk agar tidak melanggar foreign key,
 * serta bersifat fail-safe (kegagalan pada satu resource tidak menghentikan pembersihan lainnya).
 */
export async function executeCleanup(
  adminClient: SupabaseClient,
  params: CleanupParams
): Promise<CleanupError[]> {
  const cleanupErrors: CleanupError[] = []

  // 1. Pulihkan status profil akun warga1 jika sempat diubah selama pengujian
  if (params.warga1Id && params.initialWarga1Profile) {
    try {
      const { error } = await adminClient
        .from('profiles')
        .update({
          is_rt_verified: params.initialWarga1Profile.is_rt_verified,
          is_active: params.initialWarga1Profile.is_active,
        })
        .eq('id', params.warga1Id)

      if (error) {
        cleanupErrors.push({
          resource: 'profile',
          identifier: params.warga1Id,
          error: error.message,
        })
        console.error(`❌ Cleanup profil warga1 gagal: ${error.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({
        resource: 'profile',
        identifier: params.warga1Id,
        error: msg,
      })
      console.error(`❌ Cleanup profil warga1 exception: ${msg}`)
    }
  }

  // 1b. Bersihkan notifikasi non-tiket (ticket_id IS NULL) yang dibuat selama pengujian (misal dari verify_resident)
  const notifIdsToDelete = new Set<number>(params.createdNotificationIds ?? [])
  if (params.warga1Id && params.initialWarga1NotificationIds) {
    try {
      const initialSet = new Set<number>(params.initialWarga1NotificationIds)
      const { data: currentNullTicketNotifs, error: errQueryNotifs } = await adminClient
        .from('notifications')
        .select('id')
        .eq('user_id', params.warga1Id)
        .is('ticket_id', null)

      if (errQueryNotifs) {
        cleanupErrors.push({
          resource: 'notification',
          identifier: `query:${params.warga1Id}`,
          error: errQueryNotifs.message,
        })
      } else if (currentNullTicketNotifs) {
        for (const row of currentNullTicketNotifs) {
          if (!initialSet.has(row.id)) {
            notifIdsToDelete.add(row.id)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({
        resource: 'notification',
        identifier: `query:${params.warga1Id}`,
        error: msg,
      })
    }
  }

  if (notifIdsToDelete.size > 0) {
    const idsArray = Array.from(notifIdsToDelete)
    try {
      const { error: errDelNotifs } = await adminClient
        .from('notifications')
        .delete()
        .in('id', idsArray)

      if (errDelNotifs && errDelNotifs.code !== 'PGRST116') {
        cleanupErrors.push({
          resource: 'notification',
          identifier: idsArray.join(','),
          error: errDelNotifs.message,
        })
        console.error(`❌ Cleanup notifikasi non-tiket gagal: ${errDelNotifs.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({
        resource: 'notification',
        identifier: idsArray.join(','),
        error: msg,
      })
    }
  }

  // 2. Bersihkan berkas uji yang diunggah ke bucket storage
  if (params.createdStoragePaths.length > 0) {
    try {
      const { error } = await adminClient.storage
        .from('ticket-attachments')
        .remove(params.createdStoragePaths)

      if (error) {
        cleanupErrors.push({
          resource: 'storage',
          identifier: params.createdStoragePaths.join(', '),
          error: error.message,
        })
        console.error(`❌ Cleanup storage gagal: ${error.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({
        resource: 'storage',
        identifier: params.createdStoragePaths.join(', '),
        error: msg,
      })
      console.error(`❌ Cleanup storage exception: ${msg}`)
    }
  }

  // Hapus tiket yang dibuat selama sesi pengujian beserta relasi anaknya
  for (const tid of params.createdTicketIds) {
    try {
      const { error: errTl } = await adminClient.from('ticket_timeline').delete().eq('ticket_id', tid)
      if (errTl && errTl.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'timeline', identifier: tid, error: errTl.message })
        console.error(`❌ Cleanup timeline tiket #${tid} gagal: ${errTl.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'timeline', identifier: tid, error: msg })
    }

    try {
      const { error: errAtt } = await adminClient.from('ticket_attachments').delete().eq('ticket_id', tid)
      if (errAtt && errAtt.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'attachment', identifier: tid, error: errAtt.message })
        console.error(`❌ Cleanup attachment tiket #${tid} gagal: ${errAtt.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'attachment', identifier: tid, error: msg })
    }

    try {
      const { error: errNotif } = await adminClient.from('notifications').delete().eq('ticket_id', tid)
      if (errNotif && errNotif.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'notification', identifier: tid, error: errNotif.message })
        console.error(`❌ Cleanup notifikasi tiket #${tid} gagal: ${errNotif.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'notification', identifier: tid, error: msg })
    }

    try {
      const { error: errTicket } = await adminClient.from('tickets').delete().eq('id', tid)
      if (errTicket && errTicket.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'ticket', identifier: tid, error: errTicket.message })
        console.error(`❌ Cleanup tiket #${tid} gagal: ${errTicket.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'ticket', identifier: tid, error: msg })
    }
  }

  // 4. Hapus seluruh akun pengguna uji yang dibuat selama sesi pengujian ini
  for (const uid of params.createdUserIds) {
    try {
      const { error: errUserNotifs } = await adminClient.from('notifications').delete().eq('user_id', uid)
      if (errUserNotifs && errUserNotifs.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'notification', identifier: `user:${uid}`, error: errUserNotifs.message })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'notification', identifier: `user:${uid}`, error: msg })
    }

    try {
      const { error: errUserTickets } = await adminClient.from('tickets').delete().eq('user_id', uid)
      if (errUserTickets && errUserTickets.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'ticket', identifier: `user:${uid}`, error: errUserTickets.message })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'ticket', identifier: `user:${uid}`, error: msg })
    }

    try {
      const { error: errProfile } = await adminClient.from('profiles').delete().eq('id', uid)
      if (errProfile && errProfile.code !== 'PGRST116') {
        cleanupErrors.push({ resource: 'profile', identifier: uid, error: errProfile.message })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'profile', identifier: uid, error: msg })
    }

    try {
      const { error: errAuthUser } = await adminClient.auth.admin.deleteUser(uid)
      if (errAuthUser) {
        const msg = errAuthUser.message.toLowerCase()
        const isNotFound = msg.includes('not found') || (errAuthUser as { status?: number }).status === 404
        if (!isNotFound) {
          cleanupErrors.push({ resource: 'user', identifier: uid, error: errAuthUser.message })
          console.error(`❌ Cleanup auth user ${uid} gagal: ${errAuthUser.message}`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      cleanupErrors.push({ resource: 'user', identifier: uid, error: msg })
    }
  }

  return cleanupErrors
}
