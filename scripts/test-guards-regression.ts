/**
 * Regression Test Suite untuk Target Guards SIPANDU (test-guard & demo-guard).
 * Memvalidasi penolakan mutlak terhadap target lokal (localhost, 127.0.0.1, 0.0.0.0, IP privat),
 * domain produksi, basis data terproteksi, serta memastikan hanya instance Supabase Hosted
 * (<ref>.supabase.co) yang diizinkan dengan flag eksplisit yang dapat lolos.
 *
 * Menjalankan:
 *   npx tsx scripts/test-guards-regression.ts
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

console.log('🧪 Menjalankan Regression Test Target Guard SIPANDU (Hosted-Only Enforcement)...\n')

// ==============================================================================
// 1. REGRESSION TESTS: validateTestTarget
// ==============================================================================

// Kasus 1.1: Localhost wajib ditolak (bahkan dengan ALLOW_DESTRUCTIVE_TEST=true)
{
  const res = validateTestTarget({
    supabaseUrl: 'http://localhost:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'localhost',
  })
  assertCase(
    'test-guard',
    'Tolak target http://localhost:54321',
    !res.ok && Boolean(res.error?.includes('Target lokal')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.2: 127.0.0.1 wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'http://127.0.0.1:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: '127.0.0.1',
  })
  assertCase(
    'test-guard',
    'Tolak target http://127.0.0.1:54321',
    !res.ok && Boolean(res.error?.includes('Target lokal')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.3: 0.0.0.0 wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'http://0.0.0.0:54321',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: '0.0.0.0',
  })
  assertCase(
    'test-guard',
    'Tolak target http://0.0.0.0:54321',
    !res.ok && Boolean(res.error?.includes('Target lokal')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.4: IP privat lokal (192.168.x.x, 10.x.x.x) wajib ditolak
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
  assertCase(
    'test-guard',
    'Tolak target IP privat lokal (192.168.x.x dan 10.x.x.x)',
    !res1.ok && !res2.ok && Boolean(res1.error?.includes('Target lokal')),
    `res1=${res1.ok}, res2=${res2.ok}`
  )
}

// Kasus 1.5: Host sembarang di luar supabase.co wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'https://evil-hacker.com',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'evil-hacker',
  })
  assertCase(
    'test-guard',
    'Tolak host eksternal non-supabase.co',
    !res.ok && Boolean(res.error?.includes('bukan host Supabase Hosted')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.6: Protected project ref wajib ditolak mutlak
{
  const res = validateTestTarget({
    supabaseUrl: 'https://protected-demo-123.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'protected-demo-123',
    protectedProjectRefs: 'protected-demo-123,other-prod-ref',
  })
  assertCase(
    'test-guard',
    'Tolak target yang terdaftar di PROTECTED_SUPABASE_PROJECT_REFS',
    !res.ok && Boolean(res.error?.includes('terdaftar sebagai basis data terproteksi')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.7: Domain produksi wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'https://sipandu.journey.web.id',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
  })
  assertCase(
    'test-guard',
    'Tolak domain produksi sipandu.journey.web.id',
    !res.ok && Boolean(res.error?.includes('domain produksi')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.8: Environment produksi wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'https://valid-test-ref.supabase.co',
    nodeEnv: 'production',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'valid-test-ref',
  })
  assertCase(
    'test-guard',
    'Tolak saat NODE_ENV=production',
    !res.ok && Boolean(res.error?.includes('environment produksi')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.9: Ketiadaan ALLOW_REMOTE_HOSTED_TEST=true wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'https://valid-test-ref.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'false',
    allowedTestProjectRef: 'valid-test-ref',
  })
  assertCase(
    'test-guard',
    'Tolak target hosted jika ALLOW_REMOTE_HOSTED_TEST bukan true',
    !res.ok && Boolean(res.error?.includes('memerlukan persetujuan eksplisit')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.10: Ketidakcocokan ALLOWED_TEST_PROJECT_REF wajib ditolak
{
  const res = validateTestTarget({
    supabaseUrl: 'https://actual-test-ref.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'different-ref',
  })
  assertCase(
    'test-guard',
    'Tolak jika ALLOWED_TEST_PROJECT_REF tidak cocok persis',
    !res.ok && Boolean(res.error?.includes('tidak cocok')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 1.11: Target Supabase Hosted yang sah dengan semua flag sesuai wajib LOLOS
{
  const res = validateTestTarget({
    supabaseUrl: 'https://my-qa-project-999.supabase.co',
    allowDestructiveTest: 'true',
    allowRemoteHostedTest: 'true',
    allowedTestProjectRef: 'my-qa-project-999',
    protectedProjectRefs: 'demo-protected-ref',
  })
  assertCase(
    'test-guard',
    'Lolos target Supabase Hosted sah dengan flag dan ref yang cocok persis',
    res.ok && res.projectRef === 'my-qa-project-999',
    `Hasil: ok=${res.ok}, projectRef=${res.projectRef}, error=${res.error}`
  )
}

// ==============================================================================
// 2. REGRESSION TESTS: validateDemoTarget
// ==============================================================================

// Kasus 2.1: Localhost wajib ditolak oleh demo guard
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'http://localhost:54321',
    allowedProjectRef: 'localhost',
    demoPassword: 'DemoPassword123!',
  })
  assertCase(
    'demo-guard',
    'Tolak seeding pada target http://localhost:54321',
    !res.ok && Boolean(res.error?.includes('Local target')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 2.2: 127.0.0.1 wajib ditolak oleh demo guard
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'http://127.0.0.1:54321',
    allowedProjectRef: '127.0.0.1',
    demoPassword: 'DemoPassword123!',
  })
  assertCase(
    'demo-guard',
    'Tolak seeding pada target http://127.0.0.1:54321',
    !res.ok && Boolean(res.error?.includes('Local target')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 2.3: Protected ref wajib ditolak mutlak oleh demo guard
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://my-protected-demo.supabase.co',
    allowedProjectRef: 'my-protected-demo',
    protectedProjectRefs: 'my-protected-demo,another-ref',
    demoPassword: 'DemoPassword123!',
  })
  assertCase(
    'demo-guard',
    'Tolak seeding pada target yang terdaftar di PROTECTED_SUPABASE_PROJECT_REFS',
    !res.ok && Boolean(res.error?.includes('registered in PROTECTED_SUPABASE_PROJECT_REFS')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 2.4: Domain produksi wajib ditolak oleh demo guard
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://sipandu.journey.web.id',
    allowedProjectRef: 'sipandu',
    demoPassword: 'DemoPassword123!',
  })
  assertCase(
    'demo-guard',
    'Tolak seeding pada domain produksi sipandu.journey.web.id',
    !res.ok && Boolean(res.error?.includes('production domain')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 2.5: Host non-supabase.co wajib ditolak oleh demo guard
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://random-api.com',
    allowedProjectRef: 'random-api',
    demoPassword: 'DemoPassword123!',
  })
  assertCase(
    'demo-guard',
    'Tolak seeding pada host eksternal non-supabase.co',
    !res.ok && Boolean(res.error?.includes('not a valid Supabase Hosted')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 2.6: ALLOWED_DEMO_PROJECT_REF tidak cocok wajib ditolak
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://staging-project-789.supabase.co',
    allowedProjectRef: 'different-staging-ref',
    demoPassword: 'DemoPassword123!',
  })
  assertCase(
    'demo-guard',
    'Tolak seeding jika ALLOWED_DEMO_PROJECT_REF tidak cocok persis',
    !res.ok && Boolean(res.error?.includes('not in the approved demo allowlist')),
    `Hasil: ok=${res.ok}, error=${res.error}`
  )
}

// Kasus 2.7: Target Supabase Hosted staging yang sah dengan password aman wajib LOLOS
{
  const res = validateDemoTarget({
    allowDemoSeed: 'true',
    supabaseUrl: 'https://staging-project-789.supabase.co',
    allowedProjectRef: 'staging-project-789',
    demoPassword: 'StrongPassword123!',
    protectedProjectRefs: 'protected-demo-ref',
  })
  assertCase(
    'demo-guard',
    'Lolos seeding pada target Supabase Hosted staging sah dengan ref dan password cocok',
    res.ok && res.projectRef === 'staging-project-789',
    `Hasil: ok=${res.ok}, projectRef=${res.projectRef}, error=${res.error}`
  )
}

// ==============================================================================
// RINGKASAN HASIL
// ==============================================================================
console.log('-----------------------------------------------------------------------------')
console.log('No.'.padEnd(5) + 'Suite'.padEnd(14) + 'Status'.padEnd(10) + 'Deskripsi')
console.log('-----------------------------------------------------------------------------')

let passCount = 0
for (let i = 0; i < results.length; i++) {
  const r = results[i]
  const statusStr = r.passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${(i + 1).toString().padEnd(5)}${r.suite.padEnd(14)}${statusStr.padEnd(10)}${r.name}`)
  if (!r.passed && r.errorDetail) {
    console.log(`     └─ Detail: ${r.errorDetail}`)
  }
  if (r.passed) passCount++
}

console.log('-----------------------------------------------------------------------------')
console.log(`TOTAL: ${passCount} / ${results.length} LULUS`)

if (passCount !== results.length) {
  console.error('\n❌ Ada kasus pengujian guard yang GAGAL!')
  process.exit(1)
} else {
  console.log('\n🎉 SELURUH 18 KASUS REGRESSION TARGET GUARD LULUS 100% (HOSTED-ONLY TERBUKTI AMAN)!')
}
