import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Production Guard
// ---------------------------------------------------------------------------
if (
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.ENVIRONMENT === 'production'
) {
  console.error('⛔ FATAL: seed-users.ts dilarang dijalankan di environment produksi!')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('⛔ FATAL: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di env!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ---------------------------------------------------------------------------
// Test Accounts Specification
// ---------------------------------------------------------------------------
export interface SeedUser {
  email: string
  password: string
  full_name: string
  phone: string
  address: string
  role: 'warga' | 'ketua_rt' | 'ketua_rw' | 'admin'
  region_id?: number
}

export const TEST_USERS: SeedUser[] = [
  {
    email: 'warga1@sipandu.test',
    password: 'Password123!',
    full_name: 'Budi Santoso (Warga RT 01)',
    phone: '081234567891',
    address: 'Jl. Parakansaat No. 10, RT 01 RW 06',
    role: 'warga',
    region_id: 1, // RT 01
  },
  {
    email: 'warga2@sipandu.test',
    password: 'Password123!',
    full_name: 'Siti Aminah (Warga RT 02)',
    phone: '081234567892',
    address: 'Jl. Parakansaat No. 25, RT 02 RW 06',
    role: 'warga',
    region_id: 2, // RT 02
  },
  {
    email: 'rt01@sipandu.test',
    password: 'Password123!',
    full_name: 'Pak RT 01 (Ahmad Fauzi)',
    phone: '081234567893',
    address: 'Jl. Parakansaat No. 1, RT 01 RW 06',
    role: 'ketua_rt',
    region_id: 1, // RT 01
  },
  {
    email: 'rt02@sipandu.test',
    password: 'Password123!',
    full_name: 'Pak RT 02 (Bambang Sutrisno)',
    phone: '081234567894',
    address: 'Jl. Parakansaat No. 2, RT 02 RW 06',
    role: 'ketua_rt',
    region_id: 2, // RT 02
  },
  {
    email: 'rw06@sipandu.test',
    password: 'Password123!',
    full_name: 'Pak RW 06 (H. Hendra Wijaya)',
    phone: '081234567895',
    address: 'Jl. Parakansaat Utama No. 6, RW 06',
    role: 'ketua_rw',
    region_id: undefined, // RW membawahi seluruh RT
  },
  {
    email: 'admin@sipandu.test',
    password: 'Password123!',
    full_name: 'Administrator SIPANDU',
    phone: '081234567890',
    address: 'Kantor Sekretariat RW 06 Parakansaat',
    role: 'admin',
    region_id: undefined,
  },
]

async function seed() {
  console.log('🚀 Memulai seeding akun uji SIPANDU...')

  // Fetch list of existing users to make it idempotent
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('Gagal mengambil daftar user:', listError.message)
    process.exit(1)
  }

  const existingMap = new Map(userList.users.map((u) => [u.email, u]))

  for (const userDef of TEST_USERS) {
    const existing = existingMap.get(userDef.email)
    let userId: string

    if (existing) {
      console.log(`ℹ️  User ${userDef.email} sudah ada, memperbarui app_metadata dan password...`)
      userId = existing.id

      // Update password & metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: userDef.password,
        email_confirm: true,
        user_metadata: {
          full_name: userDef.full_name,
          phone: userDef.phone,
          address: userDef.address,
          region_id: userDef.region_id,
        },
        app_metadata: {
          sipandu_role: userDef.role,
        },
      })
      if (updateError) {
        console.error(`❌ Gagal update user ${userDef.email}:`, updateError.message)
        continue
      }
    } else {
      console.log(`✨ Membuat user ${userDef.email} (${userDef.role})...`)
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password: userDef.password,
        email_confirm: true,
        user_metadata: {
          full_name: userDef.full_name,
          phone: userDef.phone,
          address: userDef.address,
          region_id: userDef.region_id,
        },
        app_metadata: {
          sipandu_role: userDef.role,
        },
      })

      if (createError) {
        console.error(`❌ Gagal membuat user ${userDef.email}:`, createError.message)
        continue
      }
      userId = data.user.id
    }

    // Pastikan profile sinkron
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: userDef.full_name,
      phone: userDef.phone,
      address: userDef.address,
      region_id: userDef.region_id ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error(`⚠️  Gagal update profil untuk ${userDef.email}:`, profileError.message)
    } else {
      console.log(`✅ Profil ${userDef.email} [${userDef.role}] tersimpan.`)
    }
  }

  console.log('\n🎉 Selesai! Semua 6 akun uji SIPANDU siap digunakan:')
  for (const u of TEST_USERS) {
    console.log(` - [${u.role.padEnd(8)}] ${u.email} (Password: ${u.password})`)
  }
}

seed().catch((e) => {
  console.error('Fatal error saat seeding:', e)
  process.exit(1)
})
