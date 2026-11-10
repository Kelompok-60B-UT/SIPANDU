export interface TargetValidationResult {
  ok: boolean
  error?: string
  projectRef?: string
  hostname?: string
}

export interface GuardOptions {
  allowDemoSeed?: string
  supabaseUrl?: string
  demoPassword?: string
  allowedProjectRef?: string
  protectedProjectRefs?: string | string[]
  nodeEnv?: string
  requirePassword?: boolean
}

export function parseProtectedProjectRefs(input?: string | string[]): string[] {
  const source = input ?? process.env.PROTECTED_SUPABASE_PROJECT_REFS ?? ''
  const items = Array.isArray(source) ? source : source.split(',')
  return items.map((item) => item.trim().toLowerCase()).filter(Boolean)
}

export function validateDemoTarget(options: GuardOptions): TargetValidationResult {
  const allowDemoSeed = options.allowDemoSeed ?? process.env.ALLOW_DEMO_SEED
  if (allowDemoSeed !== 'true') {
    return { ok: false, error: 'Target seeding tidak diizinkan.' }
  }

  const nodeEnv = (options.nodeEnv ?? process.env.NODE_ENV ?? '').toLowerCase()
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase()
  const appEnv = (process.env.ENVIRONMENT ?? '').toLowerCase()
  if (nodeEnv === 'production' || vercelEnv === 'production' || appEnv === 'production') {
    return { ok: false, error: 'Operasi tidak diizinkan pada lingkungan produksi.' }
  }

  const rawUrl = (options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  if (!rawUrl) {
    return { ok: false, error: 'Target seeding tidak diizinkan.' }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'Target seeding tidak diizinkan.' }
  }

  if (parsedUrl.protocol !== 'https:') {
    return { ok: false, error: 'Target seeding tidak diizinkan.' }
  }

  const hostname = parsedUrl.hostname.toLowerCase()
  const match = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!match) {
    return { ok: false, error: 'Target seeding tidak diizinkan.', hostname }
  }

  const projectRef = match[1].toLowerCase()
  const protectedRefs = parseProtectedProjectRefs(options.protectedProjectRefs)
  const allowedProjectRef = (options.allowedProjectRef ?? process.env.ALLOWED_DEMO_PROJECT_REF ?? '').trim().toLowerCase()

  if (
    protectedRefs.includes(projectRef) ||
    protectedRefs.some((ref) => rawUrl.toLowerCase().includes(ref) || allowedProjectRef === ref)
  ) {
    return { ok: false, error: 'Target seeding tidak diizinkan.', projectRef, hostname }
  }

  if (!allowedProjectRef || projectRef !== allowedProjectRef) {
    return { ok: false, error: 'Project tidak terdaftar pada allowlist.', projectRef, hostname }
  }

  if (options.requirePassword ?? true) {
    const demoPassword = options.demoPassword ?? process.env.DEMO_PASSWORD ?? ''
    if (!demoPassword || demoPassword.length < 8) {
      return { ok: false, error: 'Target seeding tidak diizinkan.', projectRef, hostname }
    }
  }

  return { ok: true, projectRef, hostname }
}

export function enforceDemoGuard(options: GuardOptions = {}): TargetValidationResult {
  const result = validateDemoTarget(options)
  if (!result.ok) {
    console.error(`⛔ DEMO GUARD BLOCKED: ${result.error}`)
    process.exit(1)
  }
  return result
}
