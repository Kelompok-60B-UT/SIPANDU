/**
 * Penjaga target eksekusi untuk skrip pengujian backend (scripts/test-backend.ts).
 *
 * Kebijakan target:
 * - Bawaan: hanya mengizinkan instance lokal (localhost / 127.0.0.1 / 0.0.0.0) dengan ALLOW_DESTRUCTIVE_TEST=true.
 * - Target hosted ditolak secara bawaan karena domain <ref>.supabase.co tidak membedakan lingkungan produksi dan uji.
 * - Pengujian pada project hosted khusus uji memerlukan ALLOW_DESTRUCTIVE_TEST=true, ALLOW_REMOTE_HOSTED_TEST=true,
 *   ALLOWED_TEST_PROJECT_REF yang cocok persis, serta tidak terdaftar di PROTECTED_SUPABASE_PROJECT_REFS.
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
  isLocal: boolean
  hostname?: string
}

export function parseProtectedProjectRefs(input?: string | string[]): string[] {
  const source = input ?? process.env.PROTECTED_SUPABASE_PROJECT_REFS ?? ''
  const items = Array.isArray(source) ? source : source.split(',')
  return items
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

export function validateTestTarget(env: GuardOptions): GuardValidationResult {
  const rawUrl = (env.supabaseUrl ?? '').trim()
  if (!rawUrl) {
    return {
      ok: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL wajib disetel.',
      isLocal: false,
    }
  }

  const protectedRefs = parseProtectedProjectRefs(env.protectedProjectRefs)
  const allowedTestRef = (env.allowedTestProjectRef ?? '').trim().toLowerCase()

  for (const ref of protectedRefs) {
    if (rawUrl.toLowerCase().includes(ref) || allowedTestRef === ref) {
      return {
        ok: false,
        error: `Target project ref '${ref}' terdaftar sebagai basis data terproteksi (PROTECTED_SUPABASE_PROJECT_REFS). Pengujian mutatif backend DILARANG MUTLAK tanpa pengecualian!`,
        projectRef: ref,
        isLocal: false,
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
      isLocal: false,
    }
  }

  const hostname = parsed.hostname.toLowerCase()

  for (const ref of protectedRefs) {
    if (hostname.includes(ref)) {
      return {
        ok: false,
        error: `Target host '${hostname}' memuat project ref '${ref}' yang terdaftar sebagai basis data terproteksi (PROTECTED_SUPABASE_PROJECT_REFS). Pengujian mutatif backend DILARANG MUTLAK tanpa pengecualian!`,
        projectRef: ref,
        isLocal: false,
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
      error: `Host '${hostname}' terdeteksi sebagai domain produksi. Test suite dilarang dijalankan!`,
      isLocal: false,
      hostname,
    }
  }

  const nodeEnv = (env.nodeEnv ?? '').toLowerCase()
  const vercelEnv = (env.vercelEnv ?? '').toLowerCase()
  const appEnv = (env.appEnv ?? '').toLowerCase()
  if (nodeEnv === 'production' || vercelEnv === 'production' || appEnv === 'production') {
    return {
      ok: false,
      error: 'Test suite dilarang dijalankan di environment produksi (NODE_ENV/VERCEL_ENV=production).',
      isLocal: false,
      hostname,
    }
  }

  if (env.allowDestructiveTest !== 'true') {
    return {
      ok: false,
      error: 'Variabel lingkungan ALLOW_DESTRUCTIVE_TEST=true wajib disetel untuk menjalankan test suite backend.',
      isLocal: false,
      hostname,
    }
  }

  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
  if (isLocal) {
    return { ok: true, isLocal: true, hostname }
  }

  // Target hosted ditolak secara bawaan kecuali ALLOW_REMOTE_HOSTED_TEST=true
  if (env.allowRemoteHostedTest !== 'true') {
    return {
      ok: false,
      error: `Target hosted '${hostname}' ditolak secara default demi keamanan. Guard tidak dapat membedakan project produksi dari test project. Untuk menguji dedicated hosted test project, set ALLOW_REMOTE_HOSTED_TEST=true dan ALLOWED_TEST_PROJECT_REF='<ref>'.`,
      isLocal: false,
      hostname,
    }
  }

  const match = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!match) {
    return {
      ok: false,
      error: `Host target '${hostname}' tidak dikenali sebagai local stack atau hosted Supabase yang valid.`,
      isLocal: false,
      hostname,
    }
  }

  const projectRef = match[1].toLowerCase()

  if (protectedRefs.includes(projectRef)) {
    return {
      ok: false,
      error: `Project ref '${projectRef}' terdaftar sebagai basis data terproteksi (PROTECTED_SUPABASE_PROJECT_REFS). DILARANG MUTLAK!`,
      projectRef,
      isLocal: false,
      hostname,
    }
  }

  if (!allowedTestRef || projectRef !== allowedTestRef) {
    return {
      ok: false,
      error: `Hosted target project ref '${projectRef}' tidak cocok dengan ALLOWED_TEST_PROJECT_REF='${allowedTestRef}'. Target hosted wajib dicocokkan secara eksplisit.`,
      projectRef,
      isLocal: false,
      hostname,
    }
  }

  return { ok: true, projectRef, isLocal: false, hostname }
}
