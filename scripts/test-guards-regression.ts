/**
 * Regression Test Suite untuk Target Guards SIPANDU (test-guard & demo-guard).
 * Memvalidasi penegakan kebijakan Hosted-Only pada lingkungan pengujian dan seeding demo.
 */

import { validateTestTarget } from './test-guard'
import { validateDemoTarget } from './demo-guard'

interface CaseResult {
  suite: string
  name: string
  passed: boolean
  errorDetail?: string
}

const results: CaseResult[] = []

function assertCase(suite: string, name: string, condition: boolean, detail?: string) {
  results.push({
    suite,
    name,
    passed: condition,
    errorDetail: condition ? undefined : (detail ?? 'Assertion failed'),
  })
}

// 1. Pengujian validateTestTarget (11 kasus)
{
  const res = validateTestTarget({
    supabaseUrl: 'http://localhost:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'localhost',
  })
  assertCase('test-guard', 'Tolak target http://localhost:54321', !res.ok && Boolean(res.error?.includes('Target lokal')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'http://127.0.0.1:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: '127.0.0.1',
  })
  assertCase('test-guard', 'Tolak target http://127.0.0.1:54321', !res.ok && Boolean(res.error?.includes('Target lokal')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'http://0.0.0.0:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: '0.0.0.0',
  })
  assertCase('test-guard', 'Tolak target http://0.0.0.0:54321', !res.ok && Boolean(res.error?.includes('Target lokal')), res.error)
}

{
  const res1 = validateTestTarget({
    supabaseUrl: 'http://192.168.1.50:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
  })
  const res2 = validateTestTarget({
    supabaseUrl: 'http://10.0.0.5:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
  })
  assertCase('test-guard', 'Tolak target IP privat', !res1.ok && !res2.ok && Boolean(res1.error?.includes('Target lokal')), res1.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://evil-hacker.com',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'evil-hacker',
  })
  assertCase('test-guard', 'Tolak host non-supabase.co', !res.ok && Boolean(res.error?.includes('bukan instans Supabase Hosted')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://protected-demo-123.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'protected-demo-123',
    protectedProjectRefs: 'protected-demo-123,other-prod-ref',
  })
  assertCase('test-guard', 'Tolak project ref terproteksi', !res.ok && Boolean(res.error?.includes('basis data terproteksi')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://sipandu.journey.web.id',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
  })
  assertCase('test-guard', 'Tolak domain produksi', !res.ok && Boolean(res.error?.includes('domain produksi')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://valid-test-ref.supabase.co',
    nodeEnv: 'production',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'valid-test-ref',
  })
  assertCase('test-guard', 'Tolak environment produksi', !res.ok && Boolean(res.error?.includes('lingkungan produksi')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://valid-test-ref.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'false',
    allowedTestProjectRef: 'valid-test-ref',
  })
  assertCase('test-guard', 'Tolak tanpa ALLOW_REMOTE_HOSTED_TEST=true', !res.ok && Boolean(res.error?.includes('memerlukan persetujuan eksplisit')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://actual-test-ref.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'different-ref',
  })
  assertCase('test-guard', 'Tolak ALLOWED_TEST_PROJECT_REF tidak cocok', !res.ok && Boolean(res.error?.includes('tidak cocok')), res.error)
}

{
  const res = validateTestTarget({
    supabaseUrl: 'https://my-qa-project-999.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'my-qa-project-999',
    protectedProjectRefs: 'demo-protected-ref',
  })
  assertCase('test-guard', 'Lolos target Supabase Hosted sah', res.ok && res.projectRef === 'my-qa-project-999', res.error)
}

// 2. Pengujian validateDemoTarget (7 kasus)
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'http://localhost:54321',
    allowedProjectRef: 'localhost',
    demoPassword: 'DemoPassword123!',
  })
  assertCase('demo-guard', 'Tolak seeding http://localhost:54321', !res.ok && Boolean(res.error?.includes('Local target')), res.error)
}

{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'http://127.0.0.1:54321',
    allowedProjectRef: '127.0.0.1',
    demoPassword: 'DemoPassword123!',
  })
  assertCase('demo-guard', 'Tolak seeding http://127.0.0.1:54321', !res.ok && Boolean(res.error?.includes('Local target')), res.error)
}

{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://my-protected-demo.supabase.co',
    allowedProjectRef: 'my-protected-demo',
    protectedProjectRefs: 'my-protected-demo,another-ref',
    demoPassword: 'DemoPassword123!',
  })
  assertCase('demo-guard', 'Tolak seeding project terproteksi', !res.ok && Boolean(res.error?.includes('PROTECTED_SUPABASE_PROJECT_REFS')), res.error)
}

{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://sipandu.journey.web.id',
    allowedProjectRef: 'sipandu',
    demoPassword: 'DemoPassword123!',
  })
  assertCase('demo-guard', 'Tolak seeding domain produksi', !res.ok && Boolean(res.error?.includes('production domain')), res.error)
}

{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://random-api.com',
    allowedProjectRef: 'random-api',
    demoPassword: 'DemoPassword123!',
  })
  assertCase('demo-guard', 'Tolak seeding host non-supabase.co', !res.ok && Boolean(res.error?.includes('Supabase Hosted')), res.error)
}

{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://staging-project-789.supabase.co',
    allowedProjectRef: 'different-staging-ref',
    demoPassword: 'DemoPassword123!',
  })
  assertCase('demo-guard', 'Tolak seeding ALLOWED_DEMO_PROJECT_REF tidak cocok', !res.ok && Boolean(res.error?.includes('approved demo allowlist')), res.error)
}

{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://staging-project-789.supabase.co',
    allowedProjectRef: 'staging-project-789',
    demoPassword: 'StrongPassword123!',
    protectedProjectRefs: 'protected-demo-ref',
  })
  assertCase('demo-guard', 'Lolos seeding target Supabase Hosted sah', res.ok && res.projectRef === 'staging-project-789', res.error)
}

// Ringkasan hasil pengujian
let passCount = 0
for (let i = 0; i < results.length; i++) {
  const r = results[i]
  const statusStr = r.passed ? 'PASS' : 'FAIL'
  console.log(`[${statusStr}] ${(i + 1).toString().padStart(2)}. ${r.suite} - ${r.name}`)
  if (!r.passed && r.errorDetail) {
    console.log(`       Detail: ${r.errorDetail}`)
  }
  if (r.passed) passCount++
}

console.log(`\nHasil: ${passCount} / ${results.length} pengujian lulus.`)

if (passCount !== results.length) {
  process.exit(1)
}
