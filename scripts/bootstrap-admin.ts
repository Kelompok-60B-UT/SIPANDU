#!/usr/bin/env node
/**
 * Menyediakan akun Administrator awal melalui Supabase Auth Admin API
 * dan memastikan profil memenuhi prasyarat migrasi 0007 (is_active = true).
 *
 * Peringatan Operasional:
 * - Skrip ini ditujukan untuk inisialisasi Administrator pada project baru setelah migrasi.
 * - Jangan menjalankan ulang skrip terhadap project aktif tanpa alasan dan persetujuan operator.
 * - Menjalankan ulang skrip dengan email Admin yang sudah terdaftar akan memperbarui kredensial dan mengganti password akun tersebut.
 * - Promosi akun non-Admin menjadi Admin diblokir secara otomatis dan memerlukan ALLOW_ADMIN_ROLE_PROMOTION=true.
 *
 * Penggunaan:
 *   NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="ey..." \
 *   ADMIN_EMAIL="admin@sipandu.id" \
 *   ADMIN_PASSWORD="YourStrongPassword123!" \
 *   npx tsx scripts/bootstrap-admin.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.ADMIN_EMAIL || 'admin@sipandu.id'
const adminPassword = process.env.ADMIN_PASSWORD
const adminFullName = process.env.ADMIN_FULL_NAME || 'Administrator Utama SIPANDU'
const adminPhone = process.env.ADMIN_PHONE || '081200000001'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('⛔ FATAL: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib disediakan di environment!')
  process.exit(1)
}

if (!adminPassword || adminPassword.length < 12) {
  console.error('⛔ FATAL: ADMIN_PASSWORD wajib disediakan di environment dan minimal memiliki panjang 12 karakter!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function bootstrapAdmin() {
  console.log('======================================================================')
  console.log('SIPANDU — ROOT ADMINISTRATOR BOOTSTRAP (AUTH ADMIN API)')
  console.log('======================================================================')
  console.log(`[*] Target URL: ${supabaseUrl}`)
  console.log(`[*] Admin Email: ${adminEmail}`)

  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('❌ Gagal memeriksa daftar pengguna:', listError.message)
    process.exit(1)
  }

  const existingUser = userList.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase())
  let adminId: string

  if (existingUser) {
    adminId = existingUser.id
    const currentRole = (existingUser.app_metadata?.sipandu_role as string) || 'tidak terdefinisi'

    if (currentRole === 'admin') {
      console.log(`ℹ️  Akun ${adminEmail} sudah terdaftar sebagai Admin (ID: ${adminId}). Memperbarui profil dan menyinkronkan kredensial...`)
    } else {
      // Cegah promosi peran non-admin menjadi admin tanpa persetujuan eksplisit
      if (process.env.ALLOW_ADMIN_ROLE_PROMOTION !== 'true') {
        console.error('======================================================================')
        console.error(`⛔ PELANGGARAN KEAMANAN: Akun ${adminEmail} sudah terdaftar dengan peran '${currentRole}'.`)
        console.error('   Promosi akun non-Admin menjadi Admin diblokir secara otomatis demi mencegah eskalasi privilege.')
        console.error('   Jika promosi ini disengaja, jalankan kembali script dengan menyetel:')
        console.error('   ALLOW_ADMIN_ROLE_PROMOTION=true')
        console.error('======================================================================')
        process.exit(1)
      }

      console.log(`⚠️  PROMOSI PERAN DISETUJUI (ALLOW_ADMIN_ROLE_PROMOTION=true): Mengubah peran ${adminEmail} dari '${currentRole}' menjadi 'admin'...`)
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(adminId, {
      password: adminPassword,
      email_confirm: true,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        sipandu_role: 'admin',
      },
      user_metadata: {
        full_name: adminFullName,
        phone: adminPhone,
      },
    })

    if (updateError) {
      console.error('❌ Gagal memperbarui kredensial Admin:', updateError.message)
      process.exit(1)
    }
  } else {
    console.log(`✨ Membuat akun Admin baru: ${adminEmail}...`)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        sipandu_role: 'admin',
      },
      user_metadata: {
        full_name: adminFullName,
        phone: adminPhone,
      },
    })

    if (createError) {
      console.error('❌ Gagal membuat akun Admin melalui Auth Admin API:', createError.message)
      process.exit(1)
    }

    adminId = createData.user.id
    console.log(`✅ Akun Admin berhasil dibuat pada auth.users (ID: ${adminId}).`)
  }

  console.log('[*] Memverifikasi profil Admin pada public.profiles...')
  const { error: profileUpsertError } = await supabase.from('profiles').upsert({
    id: adminId,
    full_name: adminFullName,
    phone: adminPhone,
    is_active: true,
    is_rt_verified: true,
    updated_at: new Date().toISOString(),
  })

  if (profileUpsertError) {
    console.error('❌ Gagal mengonfigurasi profil Admin:', profileUpsertError.message)
    process.exit(1)
  }

  const { data: profileCheck, error: checkError } = await supabase
    .from('profiles')
    .select('id, full_name, is_active, is_rt_verified')
    .eq('id', adminId)
    .single()

  if (checkError || !profileCheck) {
    console.error('❌ Gagal memeriksa integritas profil Admin:', checkError?.message)
    process.exit(1)
  }

  if (!profileCheck.is_active) {
    console.error('❌ Pelanggaran Invarian: Profil Admin berstatus is_active = false!')
    process.exit(1)
  }

  console.log('\n======================================================================')
  console.log('✅ BOOTSTRAP ADMINISTRATOR BERHASIL & TERVERIFIKASI!')
  console.log(`   User ID     : ${profileCheck.id}`)
  console.log(`   Email       : ${adminEmail}`)
  console.log(`   Nama        : ${profileCheck.full_name}`)
  console.log(`   Status      : Aktif (${profileCheck.is_active}), Terverifikasi (${profileCheck.is_rt_verified})`)
  console.log(`   Role Sistem : admin (terenkapsulasi pada app_metadata)`)
  console.log('======================================================================')
}

bootstrapAdmin().catch((err) => {
  console.error('Fatal unhandled error:', err)
  process.exit(1)
})
