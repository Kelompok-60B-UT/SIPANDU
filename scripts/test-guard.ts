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
    return { ok: false, error: 'Target pengujian tidak diizinkan.' }
  }

  const nodeEnv = (env.nodeEnv ?? '').toLowerCase()
  const vercelEnv = (env.vercelEnv ?? '').toLowerCase()
  const appEnv = (env.appEnv ?? '').toLowerCase()
  if (nodeEnv === 'production' || vercelEnv === 'production' || appEnv === 'production') {
    return { ok: false, error: 'Operasi tidak diizinkan pada lingkungan produksi.' }
  }

  if (env.allowDestructiveTest !== 'true' || env.allowRemoteHostedTest !== 'true') {
    return { ok: false, error: 'Target pengujian tidak diizinkan.' }
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'Target pengujian tidak diizinkan.' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Target pengujian tidak diizinkan.' }
  }

  const hostname = parsed.hostname.toLowerCase()
  const match = hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/)
  if (!match) {
    return { ok: false, error: 'Target pengujian tidak diizinkan.', hostname }
  }

  const projectRef = match[1].toLowerCase()
  const protectedRefs = parseProtectedProjectRefs(env.protectedProjectRefs)
  const allowedTestRef = (env.allowedTestProjectRef ?? '').trim().toLowerCase()

  if (
    protectedRefs.includes(projectRef) ||
    protectedRefs.some((ref) => rawUrl.toLowerCase().includes(ref) || allowedTestRef === ref)
  ) {
    return { ok: false, error: 'Target pengujian tidak diizinkan.', projectRef, hostname }
  }

  if (!allowedTestRef || projectRef !== allowedTestRef) {
    return { ok: false, error: 'Project tidak terdaftar pada allowlist.', projectRef, hostname }
  }

  return { ok: true, projectRef, hostname }
}
