import { validateTestTarget, GuardOptions } from './test-guard'
import { validateDemoTarget, GuardOptions as DemoGuardOptions } from './demo-guard'

const testGuardCases: Array<{
  name: string
  options: GuardOptions
  expectedOk: boolean
}> = [
  {
    name: 'Menolak target non-hosted',
    options: {
      supabaseUrl: 'http://localhost:54321',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: 'localhost',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target non-hosted',
    options: {
      supabaseUrl: 'http://127.0.0.1:54321',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: '127.0.0.1',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target non-hosted',
    options: {
      supabaseUrl: 'http://0.0.0.0:54321',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: '0.0.0.0',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target non-hosted',
    options: {
      supabaseUrl: 'http://192.168.1.50:54321',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target non-hosted',
    options: {
      supabaseUrl: 'https://evil-hacker.com',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: 'evil-hacker',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target project terproteksi',
    options: {
      supabaseUrl: 'https://protected-demo-123.supabase.co',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: 'protected-demo-123',
      protectedProjectRefs: 'protected-demo-123,other-prod-ref',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target domain produksi',
    options: {
      supabaseUrl: 'https://sipandu.journey.web.id',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target pada environment produksi',
    options: {
      supabaseUrl: 'https://valid-test-ref.supabase.co',
      nodeEnv: 'production',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: 'valid-test-ref',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target tanpa persetujuan eksplisit',
    options: {
      supabaseUrl: 'https://valid-test-ref.supabase.co',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'false',
      allowedTestProjectRef: 'valid-test-ref',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak target tidak terdaftar pada allowlist',
    options: {
      supabaseUrl: 'https://actual-test-ref.supabase.co',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: 'different-ref',
    },
    expectedOk: false,
  },
  {
    name: 'Menerima target Supabase Hosted valid',
    options: {
      supabaseUrl: 'https://my-qa-project-999.supabase.co',
      allowDestructiveTest: 'true',
      allowRemoteHostedTest: 'true',
      allowedTestProjectRef: 'my-qa-project-999',
      protectedProjectRefs: 'demo-protected-ref',
    },
    expectedOk: true,
  },
]

const demoGuardCases: Array<{
  name: string
  options: DemoGuardOptions
  expectedOk: boolean
}> = [
  {
    name: 'Menolak seeding target non-hosted',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'http://localhost:54321',
      allowedProjectRef: 'localhost',
      demoPassword: 'DemoPassword123!',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak seeding target non-hosted',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'http://127.0.0.1:54321',
      allowedProjectRef: '127.0.0.1',
      demoPassword: 'DemoPassword123!',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak seeding target project terproteksi',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'https://my-protected-demo.supabase.co',
      allowedProjectRef: 'my-protected-demo',
      protectedProjectRefs: 'my-protected-demo,another-ref',
      demoPassword: 'DemoPassword123!',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak seeding target domain produksi',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'https://sipandu.journey.web.id',
      allowedProjectRef: 'sipandu',
      demoPassword: 'DemoPassword123!',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak seeding target non-hosted',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'https://random-api.com',
      allowedProjectRef: 'random-api',
      demoPassword: 'DemoPassword123!',
    },
    expectedOk: false,
  },
  {
    name: 'Menolak seeding target tidak terdaftar pada allowlist',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'https://staging-project-789.supabase.co',
      allowedProjectRef: 'different-staging-ref',
      demoPassword: 'DemoPassword123!',
    },
    expectedOk: false,
  },
  {
    name: 'Menerima seeding target Supabase Hosted valid',
    options: {
      allowDemoSeed: 'true',
      supabaseUrl: 'https://staging-project-789.supabase.co',
      allowedProjectRef: 'staging-project-789',
      demoPassword: 'StrongPassword123!',
      protectedProjectRefs: 'protected-demo-ref',
    },
    expectedOk: true,
  },
]

let caseNumber = 1
let passCount = 0

for (const tc of testGuardCases) {
  const res = validateTestTarget(tc.options)
  const passed = res.ok === tc.expectedOk
  if (passed) passCount++
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${String(caseNumber++).padStart(2)}. test-guard - ${tc.name}`)
}

for (const tc of demoGuardCases) {
  const res = validateDemoTarget(tc.options)
  const passed = res.ok === tc.expectedOk
  if (passed) passCount++
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${String(caseNumber++).padStart(2)}. demo-guard - ${tc.name}`)
}

const totalCases = testGuardCases.length + demoGuardCases.length
console.log(`\nHasil: ${passCount} / ${totalCases} pengujian lulus.`)

if (passCount !== totalCases) {
  process.exit(1)
}
