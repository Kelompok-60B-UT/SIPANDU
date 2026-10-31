import type { UserRole } from '@/types/database.types'

export function homePathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin'
    case 'ketua_rw':
      return '/dashboard/rw'
    case 'ketua_rt':
      return '/dashboard/rt'
    case 'warga':
    default:
      return '/dashboard/warga'
  }
}

export function getRoleFromJwt(
  jwtPayload: Record<string, unknown> | null | undefined,
): UserRole | null {
  if (!jwtPayload) return null
  const appMeta = jwtPayload['app_metadata'] as Record<string, unknown> | undefined
  const role = appMeta?.['sipandu_role']
  if (
    role === 'warga' ||
    role === 'ketua_rt' ||
    role === 'ketua_rw' ||
    role === 'admin'
  ) {
    return role
  }
  return null
}

export function roleLabelId(role: UserRole | null | undefined): string {
  switch (role) {
    case 'admin': return 'Admin'
    case 'ketua_rw': return 'Ketua RW'
    case 'ketua_rt': return 'Ketua RT'
    case 'warga': return 'Warga'
    default: return 'Tidak dikenal'
  }
}

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === 'ketua_rt' || role === 'ketua_rw' || role === 'admin'
}
