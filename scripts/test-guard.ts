/**
 * Penjaga target eksekusi untuk skrip pengujian backend (scripts/test-backend.ts).
 *
 * Kebijakan target:
 * - Hanya mengizinkan target Supabase Hosted (<ref>.supabase.co).
 * - Menolak secara mutlak localhost, 127.0.0.1, 0.0.0.0, alamat IP lokal, dan target non-hosted.
 * - Mewajibkan ALLOW_DESTRUCTIVE_TEST=true, ALLOW_REMOTE_HOSTED_TEST=true,
 *   dan ALLOWED_TEST_PROJECT_REF yang cocok persis dengan ref target.
 * - Menolak project yang terdaftar di PROTECTED_SUPABASE_PROJECT_REFS atau domain produksi.
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

  // 1. Tolak target lokal (localhost, 127.0.0.1, 0.0.0.0, IP lokal/privat)
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)

  if (isLocal) {
    return {
      ok: false,
      error: `Target lokal '${hostname}' ditolak. Kebijakan deployment SIPANDU mewajibkan pengujian backend dijalankan pada dedicated Supabase Hosted test project terpisah (<ref>.supabase.co).`,
      hostname,
    }
  }

  // 2. Tolak domain produksi
  for (const ref of protectedRefs) {
    if (hostname.includes(ref)) {
      return {
        ok: false,
        error: `Target host '${hostname}' memuat project ref '${ref}' yang terdaftar sebagai basis data terproteksi (PROTECTED_SUPABASE_PROJECT_REFS). Pengujian mutatif backend DILARANG MUTLAK tanpa pengecualian!`,
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
      error: `Host '${hostname}' terdeteksi sebagai domain produksi. Test suite dilarang dijalankan!`,
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
      hostname,
    }
  }

  // 3. Wajib opt-in eksplisit destruktif
  if (env.allowDestructiveTest !== 'true') {
    return {
      ok: false,
      error: 'Variabel lingkungan ALLOW_DESTRUCTIVE_TEST=true wajib disetel untuk menjalankan test suite backend.',
      hostname,
    }
  }

  // 4. Wajib opt-in eksplisit remote hosted
  if (env.allowRemoteHostedTest !== 'true') {
    return {
      ok: false,
      error: `Target hosted '${hostname}' memerlukan persetujuan eksplisit. Untuk menguji dedicated hosted test project, set ALLOW_REMOTE_HOSTED_TEST=true dan ALLOWED_TEST_PROJECT_REF='<ref>'.`,
      hostname,
    }
  }

  // 5. Validasi pola Supabase Hosted: <project-ref>.supabase.co
  const match = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!match) {
    return {
      ok: false,
      error: `Host target '${hostname}' bukan host Supabase Hosted (<ref>.supabase.co) yang valid.`,
      hostname,
    }
  }

  const projectRef = match[1].toLowerCase()

  if (protectedRefs.includes(projectRef)) {
    return {
      ok: false,
      error: `Project ref '${projectRef}' terdaftar sebagai basis data terproteksi (PROTECTED_SUPABASE_PROJECT_REFS). DILARANG MUTLAK!`,
      projectRef,
      hostname,
    }
  }

  if (!allowedTestRef || projectRef !== allowedTestRef) {
    return {
      ok: false,
      error: `Hosted target project ref '${projectRef}' tidak cocok dengan ALLOWED_TEST_PROJECT_REF='${allowedTestRef}'. Target hosted wajib dicocokkan secara eksplisit.`,
      projectRef,
      hostname,
    }
  }

  return { ok: true, projectRef, hostname }
}
