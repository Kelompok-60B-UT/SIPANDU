/**
 * SIPANDU - Test Target Guard Module
 *
 * Menjamin keamanan tingkat tinggi agar test suite backend (scripts/test-backend.ts)
 * TIDAK PERNAH memutasi atau merusak:
 * 1. Proyek Supabase terproteksi (didefinisikan via PROTECTED_SUPABASE_PROJECT_REFS) - DITOLAK MUTLAK tanpa celah bypass.
 * 2. Lingkungan produksi (domain produksi / NODE_ENV=production) - DITOLAK MUTLAK.
 * 3. Proyek hosted apa pun secara default (HOSTED REJECTED BY DEFAULT).
 *
 * Ketentuan Target:
 * - Default: Hanya mengizinkan local stack (localhost / 127.0.0.1 / 0.0.0.0) dengan ALLOW_DESTRUCTIVE_TEST=true.
 * - Remote Hosted Test (Opsional): Wajib opt-in eksplisit bertingkat:
 *   a. ALLOW_DESTRUCTIVE_TEST=true
 *   b. ALLOW_REMOTE_HOSTED_TEST=true
 *   c. ALLOWED_TEST_PROJECT_REF=<ref-cocok-persis>
 *   d. Target TIDAK termasuk dalam daftar PROTECTED_SUPABASE_PROJECT_REFS.
 *
 * CATATAN KEAMANAN:
 * Guard tidak dapat mengetahui secara otomatis apakah suatu proyek Supabase cloud
 * merupakan produksi atau testing murni karena keduanya memakai domain <ref>.supabase.co.
 * Oleh karena itu, pengujian remote di-disable secara default dan mewajibkan
 * konfirmasi eksplisit dari operator yang bertanggung jawab penuh atas target yang dipilih.
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
  // 1. Validasi keberadaan URL
  const rawUrl = (env.supabaseUrl ?? '').trim()
  if (!rawUrl) {
    return {
      ok: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL wajib disetel.',
      isLocal: false,
    }
  }

  // 2. Evaluasi daftar protected project refs dari environment / opsi
  const protectedRefs = parseProtectedProjectRefs(env.protectedProjectRefs)
  const allowedTestRef = (env.allowedTestProjectRef ?? '').trim().toLowerCase()

  // Periksa apakah URL atau allowed test ref memuat protected ref yang dilarang
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

  // 3. Parsing URL
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

  // Verifikasi ulang hostname terhadap daftar protected refs
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

  // 4. Tolak domain produksi
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

  // 5. Tolak environment produksi
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

  // 6. Wajib opt-in eksplisit mutasi pengujian (ALLOW_DESTRUCTIVE_TEST=true)
  if (env.allowDestructiveTest !== 'true') {
    return {
      ok: false,
      error: 'Variabel lingkungan ALLOW_DESTRUCTIVE_TEST=true wajib disetel untuk menjalankan test suite backend.',
      isLocal: false,
      hostname,
    }
  }

  // 7. Evaluasi local stack target (localhost / 127.0.0.1 / 0.0.0.0)
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
  if (isLocal) {
    return { ok: true, isLocal: true, hostname }
  }

  // 8. Evaluasi hosted target (DEFAULT: DITOLAK)
  // Remote test mode HANYA aktif jika ALLOW_REMOTE_HOSTED_TEST=true
  if (env.allowRemoteHostedTest !== 'true') {
    return {
      ok: false,
      error: `Target hosted '${hostname}' ditolak secara default demi keamanan. Guard tidak dapat membedakan project produksi dari test project. Untuk menguji dedicated hosted test project, set ALLOW_REMOTE_HOSTED_TEST=true dan ALLOWED_TEST_PROJECT_REF='<ref>'.`,
      isLocal: false,
      hostname,
    }
  }

  // Verifikasi format hosted Supabase: <project-ref>.supabase.co
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

  // Verifikasi kembali terhadap daftar protected refs
  if (protectedRefs.includes(projectRef)) {
    return {
      ok: false,
      error: `Project ref '${projectRef}' terdaftar sebagai basis data terproteksi (PROTECTED_SUPABASE_PROJECT_REFS). DILARANG MUTLAK!`,
      projectRef,
      isLocal: false,
      hostname,
    }
  }

  // Wajib allowlist cocok persis
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
