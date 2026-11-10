#!/usr/bin/env node
/**
 * SIPANDU - Demo Tickets & Application Data Seeding Script
 *
 * Responsibilities:
 * - Dynamically resolves demo user IDs from auth.users (via Auth Admin API)
 * - Enforces environment safety with project-ref allowlist & explicit opt-in (ALLOW_DEMO_SEED=true)
 * - Prohibits execution against historical QA (zbttpwepgzqmyspbmsnz)
 * - Seeds demo tickets covering full lifecycle: draft, terkirim, diverifikasi_rt, diproses_rw, selesai, ditolak
 * - Seeds timeline audit logs, attachments metadata, and notifications
 * - Supports --dry-run mode
 * - Strictly isolates deletes to demo tickets (TKT-DEMO-%) only
 *
 * Usage:
 *   ALLOW_DEMO_SEED=true \
 *   NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
 *   SUPABASE_SERVICE_ROLE_KEY="ey..." \
 *   npx tsx scripts/seed-demo-tickets.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { enforceDemoGuard } from './demo-guard'

// Run strict target allowlist and environment safety guard
enforceDemoGuard({ requirePassword: false })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!serviceRoleKey) {
  console.error('⛔ FATAL: SUPABASE_SERVICE_ROLE_KEY wajib disediakan di environment!')
  process.exit(1)
}

// Dry-Run Flag
const isDryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedDemoTickets() {
  console.log('======================================================================')
  console.log(`SIPANDU — SEEDING DEMO TICKETS & LIFECYCLE DATA${isDryRun ? ' [DRY-RUN]' : ''}`)
  console.log('======================================================================')
  console.log(`[*] Target URL: ${supabaseUrl}`)
  if (isDryRun) {
    console.log('[*] MODE DRY-RUN AKTIF: Tidak ada perubahan data yang dieksekusi.')
  }

  // 1. Resolve Demo Users by Email
  const { data: userList, error: userError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (userError || !userList) {
    console.error('❌ Gagal membaca user list:', userError?.message)
    process.exit(1)
  }

  const userMap = new Map(userList.users.map((u) => [u.email?.toLowerCase(), u.id]))

  const rw06Id = userMap.get('rw06@sipandu.test')
  const rt01Id = userMap.get('rt01@sipandu.test')
  const rt02Id = userMap.get('rt02@sipandu.test')
  const warga1Id = userMap.get('warga1@sipandu.test')
  const warga2Id = userMap.get('warga2@sipandu.test')

  if (!warga1Id || !rt01Id || !rw06Id || !rt02Id || !warga2Id) {
    console.error('❌ Akun demo belum lengkap! Jalankan npx tsx scripts/seed-demo-users.ts terlebih dahulu.')
    process.exit(1)
  }

  if (isDryRun) {
    console.log('[DRY-RUN] Seluruh 5 akun demo terverifikasi ada pada database.')
    console.log('[DRY-RUN] Akan memastikan 9 Regions dan 6 Categories.')
    console.log('[DRY-RUN] Akan membersihkan tiket lama berawalan TKT-DEMO-%')
    console.log('[DRY-RUN] Akan memasukkan 6 tiket demo lintas status (draft, terkirim, diverifikasi_rt, diproses_rw, selesai, ditolak).')
    console.log('[DRY-RUN] Selesai tanpa error.')
    return
  }

  // 2. Ensure Regions & Categories
  console.log('[*] Memastikan data Regions dan Categories...')
  await supabase.from('regions').upsert([
    { name: 'RT 01', rw: '06', is_active: true },
    { name: 'RT 02', rw: '06', is_active: true },
    { name: 'RT 03', rw: '06', is_active: true },
    { name: 'RT 04', rw: '06', is_active: true },
    { name: 'RT 05', rw: '06', is_active: true },
    { name: 'RT 06', rw: '06', is_active: true },
    { name: 'RT 07', rw: '06', is_active: true },
    { name: 'RT 08', rw: '06', is_active: true },
    { name: 'RT 09', rw: '06', is_active: true },
  ], { onConflict: 'id', ignoreDuplicates: true })

  const { data: regionsData } = await supabase.from('regions').select('id, name')
  const regionMap = new Map(regionsData?.map((r) => [r.name, r.id]))
  const rt01RegionId = regionMap.get('RT 01') || 1
  const rt02RegionId = regionMap.get('RT 02') || 2

  const { data: catsData } = await supabase.from('categories').select('id, name')
  const catMap = new Map(catsData?.map((c) => [c.name, c.id]))
  const infraCatId = catMap.get('Infrastruktur') || 1
  const bersihCatId = catMap.get('Kebersihan') || 2
  const amanCatId = catMap.get('Keamanan') || 3
  const lainCatId = catMap.get('Lainnya') || 6

  // 3. Clear Existing Demo Tickets (Strictly TKT-DEMO-% Only)
  console.log('[*] Membersihkan tiket demo lama (TKT-DEMO-%)...')
  await supabase.from('tickets').delete().like('ticket_number', 'TKT-DEMO-%')

  // 4. Insert Demo Tickets
  console.log('[*] Memasukkan tiket demo lintas siklus...')
  const now = new Date()

  const ticketsToInsert = [
    {
      ticket_number: 'TKT-DEMO-001',
      user_id: warga1Id,
      region_id: rt01RegionId,
      category_id: infraCatId,
      title: 'Usulan Perbaikan Lampu Penerangan Gang Melati',
      description: 'Lampu penerangan di tiang no. 4 redup dan sering berkedip pada malam hari.',
      status: 'draft',
      created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      updated_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
    },
    {
      ticket_number: 'TKT-DEMO-002',
      user_id: warga1Id,
      region_id: rt01RegionId,
      category_id: bersihCatId,
      title: 'Saluran Air Mampet Akibat Sampah Daun',
      description: 'Saluran drainase depan rumah no 14 tersumbat tumpukan daun kering, air meluap.',
      status: 'terkirim',
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    },
    {
      ticket_number: 'TKT-DEMO-003',
      user_id: warga1Id,
      region_id: rt01RegionId,
      category_id: amanCatId,
      title: 'Palang Portal Gerbang RT 01 Rusak',
      description: 'Palang pintu portal sisi selatan patah tertabrak kendaraan boks kemarin sore.',
      status: 'diverifikasi_rt',
      handler_rt_id: rt01Id,
      created_at: new Date(now.getTime() - 36 * 3600000).toISOString(),
      updated_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
    },
    {
      ticket_number: 'TKT-DEMO-004',
      user_id: warga2Id,
      region_id: rt02RegionId,
      category_id: infraCatId,
      title: 'Dahan Pohon Menempel Kabel PLN di Jalan Utama RT 02',
      description: 'Dahan pohon rindang sudah menyentuh kabel listrik PLN tegangan tinggi, rawan percikan api.',
      status: 'diproses_rw',
      handler_rt_id: rt02Id,
      handler_rw_id: rw06Id,
      created_at: new Date(now.getTime() - 48 * 3600000).toISOString(),
      updated_at: new Date(now.getTime() - 12 * 3600000).toISOString(),
    },
    {
      ticket_number: 'TKT-DEMO-005',
      user_id: warga1Id,
      region_id: rt01RegionId,
      category_id: infraCatId,
      title: 'Penambalan Lubang Jalan Gang Mawar 3',
      description: 'Aspal berlubang diameter 40 cm kedalaman 10 cm membahayakan pengendara motor.',
      status: 'selesai',
      handler_rt_id: rt01Id,
      handler_rw_id: rw06Id,
      rating: 5,
      rating_comment: 'Terima kasih banyak pengurus RT dan RW, penambalan jalan dikerjakan dengan sangat cepat dan rapi!',
      rated_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      completed_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    },
    {
      ticket_number: 'TKT-DEMO-006',
      user_id: warga2Id,
      region_id: rt02RegionId,
      category_id: lainCatId,
      title: 'Permohonan Izin Pemakaian Lapangan Tenis untuk Hajatan',
      description: 'Mohon izin peminjaman lapangan tenis selama 2 hari penuh untuk resepsi pribadi.',
      status: 'ditolak',
      handler_rt_id: rt02Id,
      rejection_reason: 'Permohonan izin fasilitas umum untuk acara pribadi diajukan langsung via sekretariat RW, bukan modul pengaduan SIPANDU.',
      rejected_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
      created_at: new Date(now.getTime() - 4 * 86400000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    },
  ]

  const { data: insertedTickets, error: insertError } = await supabase
    .from('tickets')
    .insert(ticketsToInsert)
    .select('id, ticket_number')

  if (insertError || !insertedTickets) {
    console.error('❌ Gagal memasukkan tiket demo:', insertError?.message)
    process.exit(1)
  }

  const ticketIdMap = new Map(insertedTickets.map((t) => [t.ticket_number, t.id]))

  // 5. Seed Timeline
  console.log('[*] Memasukkan riwayat timeline pengaduan...')
  const tkt2 = ticketIdMap.get('TKT-DEMO-002')!
  const tkt3 = ticketIdMap.get('TKT-DEMO-003')!
  const tkt4 = ticketIdMap.get('TKT-DEMO-004')!
  const tkt5 = ticketIdMap.get('TKT-DEMO-005')!
  const tkt6 = ticketIdMap.get('TKT-DEMO-006')!

  const timelineEntries = [
    { ticket_id: tkt2, actor_id: warga1Id, actor_name: 'Siti Aminah', actor_role: 'warga', from_status: 'draft', to_status: 'terkirim', note: 'Pengaduan diajukan oleh warga', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { ticket_id: tkt3, actor_id: warga1Id, actor_name: 'Siti Aminah', actor_role: 'warga', from_status: 'draft', to_status: 'terkirim', note: 'Pengaduan diajukan oleh warga', created_at: new Date(now.getTime() - 36 * 3600000).toISOString() },
    { ticket_id: tkt3, actor_id: rt01Id, actor_name: 'Ahmad Syarifuddin', actor_role: 'ketua_rt', from_status: 'terkirim', to_status: 'diverifikasi_rt', note: 'Verifikasi lapangan selesai. Eskalasi ke RW.', created_at: new Date(now.getTime() - 24 * 3600000).toISOString() },
    { ticket_id: tkt4, actor_id: warga2Id, actor_name: 'Agus Darmawan', actor_role: 'warga', from_status: 'draft', to_status: 'terkirim', note: 'Pengaduan diajukan oleh warga', created_at: new Date(now.getTime() - 48 * 3600000).toISOString() },
    { ticket_id: tkt4, actor_id: rt02Id, actor_name: 'Budi Hartono', actor_role: 'ketua_rt', from_status: 'terkirim', to_status: 'diverifikasi_rt', note: 'Kondisi pohon mendesak untuk segera dipangkas. Eskalasi ke Pengurus RW.', created_at: new Date(now.getTime() - 30 * 3600000).toISOString() },
    { ticket_id: tkt4, actor_id: rw06Id, actor_name: 'H. Bambang Soeprapto', actor_role: 'ketua_rw', from_status: 'diverifikasi_rt', to_status: 'diproses_rw', note: 'Koordinasi dengan petugas PLN dan Dinas Pertamanan sedang berjalan.', created_at: new Date(now.getTime() - 12 * 3600000).toISOString() },
    { ticket_id: tkt5, actor_id: warga1Id, actor_name: 'Siti Aminah', actor_role: 'warga', from_status: 'draft', to_status: 'terkirim', note: 'Pengaduan diajukan oleh warga', created_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
    { ticket_id: tkt5, actor_id: rt01Id, actor_name: 'Ahmad Syarifuddin', actor_role: 'ketua_rt', from_status: 'terkirim', to_status: 'diverifikasi_rt', note: 'Verifikasi fisik jalan berlubang.', created_at: new Date(now.getTime() - 4 * 86400000).toISOString() },
    { ticket_id: tkt5, actor_id: rw06Id, actor_name: 'H. Bambang Soeprapto', actor_role: 'ketua_rw', from_status: 'diverifikasi_rt', to_status: 'diproses_rw', note: 'Pengadaan semen aspal instan dan penugasan tim sarpras.', created_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
    { ticket_id: tkt5, actor_id: rw06Id, actor_name: 'H. Bambang Soeprapto', actor_role: 'ketua_rw', from_status: 'diproses_rw', to_status: 'selesai', note: 'Penambalan aspal selesai dan permukaan jalan aman dilalui.', created_at: new Date(now.getTime() - 1 * 86400000).toISOString() },
    { ticket_id: tkt6, actor_id: warga2Id, actor_name: 'Agus Darmawan', actor_role: 'warga', from_status: 'draft', to_status: 'terkirim', note: 'Pengaduan diajukan oleh warga', created_at: new Date(now.getTime() - 4 * 86400000).toISOString() },
    { ticket_id: tkt6, actor_id: rt02Id, actor_name: 'Budi Hartono', actor_role: 'ketua_rt', from_status: 'terkirim', to_status: 'ditolak', note: 'Bukan pengaduan gangguan/fasilitas umum.', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
  ]

  await supabase.from('ticket_timeline').insert(timelineEntries)

  // 6. Seed Attachments Metadata
  console.log('[*] Memasukkan metadata lampiran foto (sebelum & sesudah)...')
  await supabase.from('ticket_attachments').insert([
    {
      ticket_id: tkt5,
      type: 'laporan',
      storage_path: `laporan/${tkt5}/jalan_rusak_sebelum.jpg`,
      file_name: 'jalan_rusak_sebelum.jpg',
      size_bytes: 245120,
      mime_type: 'image/jpeg',
      uploaded_by: warga1Id,
      created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
    },
    {
      ticket_id: tkt5,
      type: 'penyelesaian',
      storage_path: `penyelesaian/${tkt5}/jalan_rusak_sesudah.jpg`,
      file_name: 'jalan_rusak_sesudah.jpg',
      size_bytes: 312800,
      mime_type: 'image/jpeg',
      uploaded_by: rw06Id,
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    },
  ])

  // 7. Seed Notifications
  console.log('[*] Memasukkan notifikasi sistem...')
  await supabase.from('notifications').insert([
    {
      user_id: warga1Id,
      ticket_id: tkt5,
      message: 'Laporan "Penambalan Lubang Jalan Gang Mawar 3" telah diselesaikan oleh Pengurus RW.',
      is_read: true,
      created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
    },
    {
      user_id: rt01Id,
      ticket_id: tkt2,
      message: 'Ada laporan baru di wilayah RT 01: "Saluran Air Mampet Akibat Sampah Daun"',
      is_read: false,
      created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
    },
  ])

  console.log('\n======================================================================')
  console.log('✅ SEEDING TIKET & DATA DEMO SINTETIS SELESAI!')
  console.log('======================================================================')
}

seedDemoTickets().catch((err) => {
  console.error('Fatal error saat seeding tiket demo:', err)
  process.exit(1)
})
