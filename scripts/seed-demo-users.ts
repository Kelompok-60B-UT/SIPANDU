#!/usr/bin/env node
/**
 * Menyediakan 7 akun demo lintas peran melalui Supabase Auth Admin API.
 *
 * Penggunaan:
 *   ALLOW_DEMO_SEED=true \
 *   DEMO_PASSWORD="YourDemoPassword123!" \
 *   NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
 *   SUPABASE_SERVICE_ROLE_KEY="ey..." \
 *   npx tsx scripts/seed-demo-users.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { enforceDemoGuard } from './demo-guard'

enforceDemoGuard({ requirePassword: true })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const demoPassword = process.env.DEMO_PASSWORD || ''

if (!serviceRoleKey) {
  console.error('⛔ FATAL: SUPABASE_SERVICE_ROLE_KEY wajib disediakan di environment!')
  process.exit(1)
}

const isDryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export interface DemoUserDef {
  email: string
  fullName: string
  phone: string
  address: string
  role: 'warga' | 'ketua_rt' | 'ketua_rw' | 'admin'
  regionId?: number
  isRtVerified: boolean
  description: string
}

export const DEMO_USERS: DemoUserDef[] = [
  {
    email: 'admin@sipandu.test',
    fullName: 'Administrator RW 06',
    phone: '081200000001',
    address: 'Balai RW 06 Parakansaat',
    role: 'admin',
    regionId: undefined,
    isRtVerified: true,
    description: 'Administrator sistem utama RW 06',
  },
  {
    email: 'rw06@sipandu.test',
    fullName: 'H. Bambang Soeprapto',
    phone: '081200000002',
    address: 'Jl. Utama RW 06 No. 01',
    role: 'ketua_rw',
    regionId: 1,
    isRtVerified: true,
    description: 'Ketua RW 06 Parakansaat',
  },
  {
    email: 'rt01@sipandu.test',
    fullName: 'Ahmad Syarifuddin',
    phone: '081200000003',
    address: 'Jl. Melati No. 01 RT 01 / RW 06',
    role: 'ketua_rt',
    regionId: 1,
    isRtVerified: true,
    description: 'Ketua RT 01 RW 06',
  },
  {
    email: 'rt02@sipandu.test',
    fullName: 'Budi Hartono',
    phone: '081200000004',
    address: 'Jl. Anggrek No. 01 RT 02 / RW 06',
    role: 'ketua_rt',
    regionId: 2,
    isRtVerified: true,
    description: 'Ketua RT 02 RW 06 (Isolasi antar-RT)',
  },
  {
    email: 'warga1@sipandu.test',
    fullName: 'Siti Aminah',
    phone: '081200000005',
    address: 'Jl. Melati No. 12 RT 01 / RW 06',
    role: 'warga',
    regionId: 1,
    isRtVerified: true,
    description: 'Warga RT 01 Terverifikasi (Pembuat Tiket)',
  },
  {
    email: 'warga.pending@sipandu.test',
    fullName: 'Budi Prasetyo',
    phone: '081200000006',
    address: 'Jl. Melati No. 18 RT 01 / RW 06',
    role: 'warga',
    regionId: 1,
    isRtVerified: false,
    description: 'Warga RT 01 Baru (Menunggu Verifikasi Ketua RT)',
  },
  {
    email: 'warga2@sipandu.test',
    fullName: 'Agus Darmawan',
    phone: '081200000007',
    address: 'Jl. Anggrek No. 05 RT 02 / RW 06',
    role: 'warga',
    regionId: 2,
    isRtVerified: true,
    description: 'Warga RT 02 Terverifikasi (Isolasi Privasi Tiket)',
  },
]

async function seedDemoUsers() {
  console.log('======================================================================')
  console.log(`SIPANDU — PROVISIONING DEMO USERS (AUTH ADMIN API)${isDryRun ? ' [DRY-RUN]' : ''}`)
  console.log('======================================================================')
  console.log(`[*] Target URL: ${supabaseUrl}`)
  console.log(`[*] Total Akun: ${DEMO_USERS.length}`)
  if (isDryRun) {
    console.log('[*] MODE DRY-RUN AKTIF: Tidak ada perubahan data yang dieksekusi.')
  }

  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('❌ Gagal memeriksa daftar user:', listError.message)
    process.exit(1)
  }

  const existingMap = new Map(userList.users.map((u) => [u.email?.toLowerCase(), u]))
  let failureCount = 0
  let successCount = 0

  for (const def of DEMO_USERS) {
    // Hanya izinkan manipulasi akun berdomain @sipandu.test
    if (!def.email.endsWith('@sipandu.test')) {
      console.error(`⛔ Pelanggaran integritas: Email ${def.email} bukan domain demo @sipandu.test!`)
      failureCount++
      continue
    }

    const existing = existingMap.get(def.email.toLowerCase())
    let userId: string

    if (existing) {
      userId = existing.id
      console.log(`ℹ️  User ${def.email} sudah ada (ID: ${userId}).`)

      if (isDryRun) {
        console.log(`   [DRY-RUN] Akan memperbarui app_metadata dan password untuk ${def.email}`)
        successCount++
        continue
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: demoPassword,
        email_confirm: true,
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          sipandu_role: def.role,
        },
        user_metadata: {
          full_name: def.fullName,
          phone: def.phone,
          address: def.address,
          region_id: def.regionId,
        },
      })

      if (updateError) {
        console.error(`❌ Gagal update user ${def.email}:`, updateError.message)
        failureCount++
        continue
      }
    } else {
      console.log(`✨ Membuat user ${def.email} [${def.role}]...`)

      if (isDryRun) {
        console.log(`   [DRY-RUN] Akan memanggil createUser untuk ${def.email}`)
        successCount++
        continue
      }

      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: def.email,
        password: demoPassword,
        email_confirm: true,
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          sipandu_role: def.role,
        },
        user_metadata: {
          full_name: def.fullName,
          phone: def.phone,
          address: def.address,
          region_id: def.regionId,
        },
      })

      if (createError || !createData?.user?.id) {
        console.error(`❌ Gagal membuat user ${def.email}:`, createError?.message || 'ID user tidak ditemukan')
        failureCount++
        continue
      }

      userId = createData.user.id
    }

    if (!isDryRun) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: def.fullName,
        phone: def.phone,
        address: def.address,
        region_id: def.regionId ?? null,
        is_active: true,
        is_rt_verified: def.isRtVerified,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error(`❌ Gagal menyinkronkan profil ${def.email}:`, profileError.message)
        failureCount++
      } else {
        console.log(`   [+] Profil tersimpan: is_rt_verified = ${def.isRtVerified}`)
        successCount++
      }
    }
  }

  console.log('\n======================================================================')
  if (failureCount > 0) {
    console.error(`❌ PROVISIONING SELESAI DENGAN KEGAGALAN: ${failureCount} gagal, ${successCount} berhasil dari ${DEMO_USERS.length} akun.`)
    console.log('======================================================================')
    process.exitCode = 1
    return
  }

  if (isDryRun) {
    console.log('✅ DRY-RUN SELESAI: Seluruh validasi konfigurasi dan allowlist lolos.')
  } else {
    console.log(`✅ SELURUH ${successCount} AKUN DEMO BERHASIL DI-PROVISIONING!`)
  }
  console.log('======================================================================')
}

seedDemoUsers().catch((err) => {
  console.error('Fatal error saat seeding user demo:', err)
  process.exit(1)
})
