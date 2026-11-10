/**
 * Penjaga target eksekusi untuk skrip pengujian backend SIPANDU.
 * Hanya mengizinkan instans Supabase Hosted (<ref>.supabase.co) yang disetujui.
 */

export interface GuardOptions {
  supabaseUrl?: string
  nodeEnv?: string
  vercelEnv?: string
  appEnv?: string
  allowDestructiveTest?: string
  allowRemoteHostedTest?: string
  allowedTestProjectRef?: string
  protectedProjectRefs?: string | string[]
}

export interface GuardValidationResult {
  ok: boolean
  error?: string
  projectRef?: string
  hostname?: string
}

export function parseProtectedProjectRefs(input?: string | string[]): string[] {
  const source = input ?? process.env.PROTECTED_SUPABASE_PROJECT_REFS ?? ''
  const items = Array.isArray(source) ? source : source.split(',')
  return items.map((item) => item.trim().toLowerCase()).filter(Boolean)
}

export function validateTestTarget(env: GuardOptions): GuardValidationResult {
  const rawUrl = (env.supabaseUrl ?? '').trim()
  if (!rawUrl) {
    return { ok: false, error: 'NEXT_PUBLIC_SUPABASE_URL wajib disetel.' }
  }

  const protectedRefs = parseProtectedProjectRefs(env.protectedProjectRefs)
  const allowedTestRef = (env.allowedTestProjectRef ?? '').trim().toLowerCase()

  for (const ref of protectedRefs) {
    if (rawUrl.toLowerCase().includes(ref) || allowedTestRef === ref) {
      return {
        ok: false,
        error: `Target project ref '${ref}' terdaftar sebagai basis data terproteksi.`,
        projectRef: ref,
      }
    }
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return {
      ok: false,
      error: `Format NEXT_PUBLIC_SUPABASE_URL tidak valid: '${rawUrl}'.`,
    }
  }

  const hostname = parsed.hostname.toLowerCase()

  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    /^127\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

  if (isLocal) {
    return {
      ok: false,
      error: `Target lokal '${hostname}' ditolak. Pengujian hanya diizinkan pada Supabase Hosted.`,
      hostname,
    }
  }

  for (const ref of protectedRefs) {
    if (hostname.includes(ref)) {
      return {
        ok: false,
        error: `Target '${hostname}' terdaftar sebagai basis data terproteksi.`,
        projectRef: ref,
        hostname,
      }
    }
  }

  if (
    hostname.includes('sipandu.journey.web.id') ||
    hostname.includes('app.sipandu.id') ||
    hostname.includes('sipandu.id')
  ) {
    return {
      ok: false,
      error: `Target '${hostname}' adalah domain produksi.`,
      hostname,
    }
  }

  const nodeEnv = (env.nodeEnv ?? '').toLowerCase()
  const vercelEnv = (env.vercelEnv ?? '').toLowerCase()
  const appEnv = (env.appEnv ?? '').toLowerCase()
  if (nodeEnv === 'production' || vercelEnv === 'production' || appEnv === 'production') {
    return {
      ok: false,
      error: 'Pengujian tidak diizinkan pada lingkungan produksi.',
      hostname,
    }
  }

  if (env.allowDestructiveTest !== 'true') {
    return {
      ok: false,
      error: 'ALLOW_DESTRUCTIVE_TEST=true wajib disetel.',
      hostname,
    }
  }

  if (env.allowRemoteHostedTest !== 'true') {
    return {
      ok: false,
      error: `Target hosted '${hostname}' memerlukan persetujuan eksplisit.`,
      hostname,
    }
  }

  const match = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!match) {
    return {
      ok: false,
      error: `Host target '${hostname}' bukan instans Supabase Hosted (<ref>.supabase.co) yang valid.`,
      hostname,
    }
  }

  const projectRef = match[1].toLowerCase()

  if (protectedRefs.includes(projectRef)) {
    return {
      ok: false,
      error: `Project ref '${projectRef}' terdaftar sebagai basis data terproteksi.`,
      projectRef,
      hostname,
    }
  }

  if (!allowedTestRef || projectRef !== allowedTestRef) {
    return {
      ok: false,
      error: `Target project ref '${projectRef}' tidak cocok dengan ALLOWED_TEST_PROJECT_REF='${allowedTestRef}'.`,
      projectRef,
      hostname,
    }
  }

  return { ok: true, projectRef, hostname }
}
