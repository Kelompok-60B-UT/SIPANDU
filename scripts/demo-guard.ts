/**
 * SIPANDU - Demo Seeding Environment & Target Allowlist Guard
 *
 * Enforces strict boundaries to ensure demo seeding NEVER executes against:
 * - Production domains
 * - Protected projects defined in PROTECTED_SUPABASE_PROJECT_REFS
 * - Unapproved external hosted targets
 *
 * Permitted targets:
 * - Local stack (localhost / 127.0.0.1 / 0.0.0.0)
 * - Explicitly approved demo hosted projects via ALLOWED_DEMO_PROJECT_REF
 */

export interface TargetValidationResult {
  ok: boolean
  error?: string
  projectRef?: string
  isLocal: boolean
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
  return items
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

export function validateDemoTarget(options: GuardOptions): TargetValidationResult {
  // 1. Mandatory Explicit Opt-in Guard
  const allowDemoSeed = options.allowDemoSeed ?? process.env.ALLOW_DEMO_SEED
  if (allowDemoSeed !== 'true') {
    return {
      ok: false,
      error: 'ALLOW_DEMO_SEED=true is required in environment to execute demo seeding.',
      isLocal: false,
    }
  }

  // 2. Production Environment Flags Check
  const nodeEnv = (options.nodeEnv ?? process.env.NODE_ENV ?? '').toLowerCase()
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase()
  const appEnv = (process.env.ENVIRONMENT ?? '').toLowerCase()

  if (nodeEnv === 'production' || vercelEnv === 'production' || appEnv === 'production') {
    return {
      ok: false,
      error: 'Execution is strictly forbidden in production environment (NODE_ENV/VERCEL_ENV=production).',
      isLocal: false,
    }
  }

  // 3. Supabase URL Validation & Parse
  const rawUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!rawUrl.trim()) {
    return {
      ok: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL must be provided.',
      isLocal: false,
    }
  }

  // Check against protected project refs before parsing
  const protectedRefs = parseProtectedProjectRefs(options.protectedProjectRefs)
  const allowedProjectRef = (options.allowedProjectRef ?? process.env.ALLOWED_DEMO_PROJECT_REF ?? '').trim().toLowerCase()

  for (const ref of protectedRefs) {
    if (rawUrl.toLowerCase().includes(ref) || allowedProjectRef === ref) {
      return {
        ok: false,
        error: `Target project ref '${ref}' is registered in PROTECTED_SUPABASE_PROJECT_REFS. Demo seeding is strictly forbidden.`,
        projectRef: ref,
        isLocal: false,
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
      isLocal: false,
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  // Prohibit known production hostnames regardless of NODE_ENV
  if (
    hostname.includes('sipandu.journey.web.id') ||
    hostname.includes('app.sipandu.id') ||
    hostname.includes('sipandu.id')
  ) {
    return {
      ok: false,
      error: `Target host '${hostname}' is a production domain. Seeding is strictly prohibited.`,
      isLocal: false,
      hostname,
    }
  }

  // 4. Localhost / Local Stack Allowlist
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
  if (isLocal) {
    // Password Check (if required)
    if (options.requirePassword ?? true) {
      const demoPassword = options.demoPassword ?? process.env.DEMO_PASSWORD ?? ''
      if (!demoPassword || demoPassword.length < 8) {
        return {
          ok: false,
          error: 'DEMO_PASSWORD environment variable is required (min 8 characters).',
          isLocal: true,
          hostname,
        }
      }
    }

    return {
      ok: true,
      isLocal: true,
      hostname,
    }
  }

  // 5. Hosted Supabase Targets
  // Must match <project-ref>.supabase.co
  const supabaseCoMatch = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!supabaseCoMatch) {
    return {
      ok: false,
      error: `External target '${hostname}' is not a valid Supabase host or local development stack.`,
      isLocal: false,
      hostname,
    }
  }

  const projectRef = supabaseCoMatch[1].toLowerCase()

  // 5a. Check against protected project refs
  if (protectedRefs.includes(projectRef)) {
    return {
      ok: false,
      error: `Target project ref '${projectRef}' is registered in PROTECTED_SUPABASE_PROJECT_REFS. Seeding is strictly forbidden.`,
      projectRef,
      isLocal: false,
      hostname,
    }
  }

  // 5b. Explicit Allowlist Check for Hosted Targets
  if (!allowedProjectRef || projectRef !== allowedProjectRef) {
    return {
      ok: false,
      error: `Hosted target project ref '${projectRef}' is not in the approved demo allowlist. To approve a dedicated demo instance, set ALLOWED_DEMO_PROJECT_REF='${projectRef}'.`,
      projectRef,
      isLocal: false,
      hostname,
    }
  }

  // 5c. Password Check (if required)
  if (options.requirePassword ?? true) {
    const demoPassword = options.demoPassword ?? process.env.DEMO_PASSWORD ?? ''
    if (!demoPassword || demoPassword.length < 8) {
      return {
        ok: false,
        error: 'DEMO_PASSWORD environment variable is required (min 8 characters).',
        projectRef,
        isLocal: false,
        hostname,
      }
    }
  }

  return {
    ok: true,
    projectRef,
    isLocal: false,
    hostname,
  }
}

export function enforceDemoGuard(options: GuardOptions = {}): TargetValidationResult {
  const result = validateDemoTarget(options)
  if (!result.ok) {
    console.error('======================================================================')
    console.error(`⛔ DEMO GUARD BLOCKED: ${result.error}`)
    console.error('======================================================================')
    process.exit(1)
  }
  return result
}
