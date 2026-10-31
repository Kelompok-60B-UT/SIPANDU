import 'server-only'

import { createClient } from '@/utils/supabase/server'
import { getRoleFromJwt } from '@/utils/roles'
import type { UserRole } from '@/types/database.types'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const role = getRoleFromJwt(user.app_metadata)
  return {
    ...user,
    role,
  }
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }

  return user
}
