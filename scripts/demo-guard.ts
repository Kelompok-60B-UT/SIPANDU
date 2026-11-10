/**
 * Penjaga target eksekusi untuk skrip seeding data demo.
 * Hanya mengizinkan instans Supabase Hosted staging (<ref>.supabase.co) yang disetujui.
 */

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
    return {
      ok: false,
      error: 'ALLOW_DEMO_SEED=true is required in environment to execute demo seeding.',
    }
  }

  const nodeEnv = (options.nodeEnv ?? process.env.NODE_ENV ?? '').toLowerCase()
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase()
  const appEnv = (process.env.ENVIRONMENT ?? '').toLowerCase()

  if (nodeEnv === 'production' || vercelEnv === 'production' || appEnv === 'production') {
    return {
      ok: false,
      error: 'Execution is forbidden in production environment.',
    }
  }

  const rawUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!rawUrl.trim()) {
    return {
      ok: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL must be provided.',
    }
  }

  const protectedRefs = parseProtectedProjectRefs(options.protectedProjectRefs)
  const allowedProjectRef = (options.allowedProjectRef ?? process.env.ALLOWED_DEMO_PROJECT_REF ?? '').trim().toLowerCase()

  for (const ref of protectedRefs) {
    if (rawUrl.toLowerCase().includes(ref) || allowedProjectRef === ref) {
      return {
        ok: false,
        error: `Target project ref '${ref}' is registered in PROTECTED_SUPABASE_PROJECT_REFS.`,
        projectRef: ref,
      }
    }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return {
      ok: false,
      error: `Invalid NEXT_PUBLIC_SUPABASE_URL format: '${rawUrl}'.`,
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

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
      error: `Local target '${hostname}' is rejected. Seeding is only permitted on Supabase Hosted.`,
      hostname,
    }
  }

  for (const ref of protectedRefs) {
    if (hostname.includes(ref)) {
      return {
        ok: false,
        error: `Target host '${hostname}' contains protected project ref '${ref}'.`,
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
      error: `Target host '${hostname}' is a production domain.`,
      hostname,
    }
  }

  const supabaseCoMatch = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!supabaseCoMatch) {
    return {
      ok: false,
      error: `External target '${hostname}' is not a valid Supabase Hosted (<ref>.supabase.co) instance.`,
      hostname,
    }
  }

  const projectRef = supabaseCoMatch[1].toLowerCase()

  if (protectedRefs.includes(projectRef)) {
    return {
      ok: false,
      error: `Target project ref '${projectRef}' is registered in PROTECTED_SUPABASE_PROJECT_REFS.`,
      projectRef,
      hostname,
    }
  }

  if (!allowedProjectRef || projectRef !== allowedProjectRef) {
    return {
      ok: false,
      error: `Hosted target project ref '${projectRef}' is not in the approved demo allowlist.`,
      projectRef,
      hostname,
    }
  }

  if (options.requirePassword ?? true) {
    const demoPassword = options.demoPassword ?? process.env.DEMO_PASSWORD ?? ''
    if (!demoPassword || demoPassword.length < 8) {
      return {
        ok: false,
        error: 'DEMO_PASSWORD environment variable is required (min 8 characters).',
        projectRef,
        hostname,
      }
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
