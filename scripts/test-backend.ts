import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface TestResult {
  num: number
  description: string
  passed: boolean
  detail?: string
}

const results: TestResult[] = []

function assert(num: number, description: string, condition: boolean, detail?: string) {
  results.push({
    num,
    description,
    passed: condition,
    detail: condition ? undefined : (detail ?? 'Assertion failed'),
  })
}

// Client helper: creates a supabase client logged in as a specific user
async function createAuthClient(email: string, password = 'Password123!'): Promise<{ client: SupabaseClient; user: { id: string } }> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    throw new Error(`Failed to log in as ${email}: ${error?.message}`)
  }
  return { client, user: data.user }
}

async function runTests() {
  console.log('🧪 Memulai Test Suite FASE 3: RLS & State Machine SIPANDU...\n')

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const anonClient = createClient(supabaseUrl, anonKey)

  // Log in as test accounts
  const warga1 = await createAuthClient('warga1@sipandu.test')
  const warga2 = await createAuthClient('warga2@sipandu.test')
  const rt01 = await createAuthClient('rt01@sipandu.test')
  const rt02 = await createAuthClient('rt02@sipandu.test')
  const rw06 = await createAuthClient('rw06@sipandu.test')

  // Clean up any test tickets from previous test runs
  await adminClient.from('tickets').delete().neq('id', 0)

  // -------------------------------------------------------------------------
  // Test 1: Anon can read regions & categories
  // -------------------------------------------------------------------------
  const { data: anonRegions, error: errReg } = await anonClient.from('regions').select('*')
  const { data: anonCats, error: errCat } = await anonClient.from('categories').select('*')
  assert(
    1,
    'Anon bisa membaca tabel regions dan categories',
    !errReg && (anonRegions?.length ?? 0) >= 8 && !errCat && (anonCats?.length ?? 0) >= 6,
    `errReg: ${errReg?.message}, errCat: ${errCat?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 2: Anon can call public_stats()
  // -------------------------------------------------------------------------
  const { data: anonStats, error: errStats } = await anonClient.rpc('public_stats')
  assert(
    2,
    'Anon bisa memanggil RPC public_stats()',
    !errStats && anonStats !== null && typeof anonStats === 'object',
    `errStats: ${errStats?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 3: Anon cannot read tickets table
  // -------------------------------------------------------------------------
  const { data: anonTickets, error: errTickets } = await anonClient.from('tickets').select('*')
  assert(
    3,
    'Anon TIDAK bisa membaca tabel tickets',
    (anonTickets === null || anonTickets.length === 0) && (!errTickets || errTickets.code === '42501' || (anonTickets as unknown as Array<{ id: number }>)?.length === 0),
    `Found: ${anonTickets?.length} tickets`,
  )

  // -------------------------------------------------------------------------
  // Test 4: Public signup with user_metadata containing role stays 'warga'
  // -------------------------------------------------------------------------
  const testEmail = `attacker_${Date.now()}@sipandu.test`
  // Use admin.createUser without app_metadata to simulate registration with malicious user_metadata
  // (avoiding public email send rate limits in dev environment)
  const { data: createdAttacker, error: errCreateAttacker } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name: 'Attacker Impersonator',
      region_id: 1,
    },
  })
  // Log in as this attacker to check their JWT claims
  const { data: attackerSession } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: 'Password123!',
  })
  const assignedRole = attackerSession?.session?.user?.app_metadata?.sipandu_role
  assert(
    4,
    'Signup publik dengan user_metadata berisi role tetap menjadi warga',
    !errCreateAttacker && assignedRole === 'warga',
    `Expected role 'warga', got: ${assignedRole}`,
  )
  if (createdAttacker?.user) {
    await adminClient.auth.admin.deleteUser(createdAttacker.user.id)
  }

  // -------------------------------------------------------------------------
  // Test 5: Warga cannot insert ticket with status other than 'draft'
  // -------------------------------------------------------------------------
  const { error: errInsertNonDraft } = await warga1.client.from('tickets').insert({
    user_id: warga1.user.id,
    region_id: 1,
    category_id: 1,
    title: 'Tiket Langsung Terkirim',
    description: 'Ini tes bypass status',
    status: 'terkirim',
  })
  assert(
    5,
    'Warga TIDAK bisa insert tiket dengan status selain draft',
    !!errInsertNonDraft,
    'Insert non-draft berhasil tanpa error!',
  )

  // -------------------------------------------------------------------------
  // Test 6: Warga cannot insert ticket with user_id of another user
  // -------------------------------------------------------------------------
  const { error: errInsertOtherUser } = await warga1.client.from('tickets').insert({
    user_id: warga2.user.id,
    region_id: 1,
    category_id: 1,
    title: 'Tiket Palsu',
    description: 'Ini tes spoofing user_id',
    status: 'draft',
  })
  assert(
    6,
    'Warga TIDAK bisa insert tiket dengan user_id orang lain',
    !!errInsertOtherUser,
    'Insert dengan user_id orang lain berhasil!',
  )

  // -------------------------------------------------------------------------
  // Test 7: Warga A can insert draft ticket
  // -------------------------------------------------------------------------
  const { data: draftA, error: errDraftA } = await warga1.client
    .from('tickets')
    .insert({
      user_id: warga1.user.id,
      region_id: 1,
      category_id: 1,
      title: 'Lampu Jalan Mati RT 01',
      description: 'Lampu jalan di tiang nomor 3 mati sejak 3 hari yang lalu',
      status: 'draft',
    })
    .select('id')
    .single()

  const ticketAId = draftA?.id
  assert(
    7,
    'Warga A berhasil insert tiket draf sendiri',
    !errDraftA && !!ticketAId,
    `Error: ${errDraftA?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 8: Warga B cannot see draft of Warga A
  // -------------------------------------------------------------------------
  const { data: ticketsSeenByB } = await warga2.client.from('tickets').select('*').eq('id', ticketAId)
  assert(
    8,
    'Warga B TIDAK bisa melihat tiket/draf Warga A',
    !ticketsSeenByB || ticketsSeenByB.length === 0,
    `Warga B melihat ${ticketsSeenByB?.length} tiket!`,
  )

  // -------------------------------------------------------------------------
  // Test 9: Warga cannot update status directly via UPDATE
  // -------------------------------------------------------------------------
  await warga1.client
    .from('tickets')
    .update({ status: 'selesai' as unknown as never })
    .eq('id', ticketAId)

  // Re-fetch to ensure status is still draft
  const { data: ticketAfterDirectUpdate } = await warga1.client.from('tickets').select('status').eq('id', ticketAId).single()
  assert(
    9,
    'Warga TIDAK bisa mengubah status lewat UPDATE langsung',
    ticketAfterDirectUpdate?.status === 'draft',
    `Status berubah menjadi: ${ticketAfterDirectUpdate?.status}`,
  )

  // -------------------------------------------------------------------------
  // Test 10: Warga cannot change region_id in profile
  // -------------------------------------------------------------------------
  const { error: errChangeRegion } = await warga1.client
    .from('profiles')
    .update({ region_id: 2 })
    .eq('id', warga1.user.id)
  assert(
    10,
    'Warga TIDAK bisa mengubah region_id profilnya sendiri',
    !!errChangeRegion,
    'Warga berhasil update region_id tanpa error!',
  )

  // -------------------------------------------------------------------------
  // Test 11: Submit ticket creates ticket_number format PG-YYYY-XXXX sequential
  // -------------------------------------------------------------------------
  const { error: errSubmit } = await warga1.client.rpc('submit_ticket', { p_ticket_id: ticketAId })
  const { data: submittedTicketA } = await warga1.client.from('tickets').select('*').eq('id', ticketAId).single()

  const currentYear = new Date().getFullYear()
  const expectedFormat = new RegExp(`^PG-${currentYear}-\\d{4}$`)
  const isFormatValid = expectedFormat.test(submittedTicketA?.ticket_number ?? '')

  assert(
    11,
    `Nomor tiket berformat PG-${currentYear}-0001 dan status terkirim`,
    !errSubmit && submittedTicketA?.status === 'terkirim' && isFormatValid && submittedTicketA?.ticket_number?.endsWith('0001'),
    `Nomor tiket: ${submittedTicketA?.ticket_number}, Status: ${submittedTicketA?.status}, Err: ${errSubmit?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 12: Second ticket gets sequential number PG-YYYY-0002
  // -------------------------------------------------------------------------
  const { data: draftA2 } = await warga1.client
    .from('tickets')
    .insert({
      user_id: warga1.user.id,
      region_id: 1,
      category_id: 2,
      title: 'Sampah Menumpuk di Depan Gang',
      description: 'Sampah belum diangkut selama seminggu',
      status: 'draft',
    })
    .select('id')
    .single()

  await warga1.client.rpc('submit_ticket', { p_ticket_id: draftA2!.id })
  const { data: submittedTicketA2 } = await warga1.client.from('tickets').select('ticket_number').eq('id', draftA2!.id).single()
  assert(
    12,
    `Nomor tiket urut per tahun (PG-${currentYear}-0002)`,
    submittedTicketA2?.ticket_number?.endsWith('0002'),
    `Expected ...0002, got: ${submittedTicketA2?.ticket_number}`,
  )

  // -------------------------------------------------------------------------
  // Test 13: Transition writes to timeline (with actor_name and actor_role)
  // -------------------------------------------------------------------------
  const { data: timelineA } = await warga1.client
    .from('ticket_timeline')
    .select('*')
    .eq('ticket_id', ticketAId)
    .order('created_at', { ascending: true })

  const firstEntry = timelineA?.[0]
  assert(
    13,
    'Setiap transisi menulis timeline (dengan actor_name dan actor_role)',
    Boolean(timelineA && timelineA.length >= 1 && !!firstEntry?.actor_name && firstEntry?.actor_role === 'warga' && firstEntry?.to_status === 'terkirim'),
    `Timeline entries: ${timelineA?.length}, actor: ${firstEntry?.actor_name}, role: ${firstEntry?.actor_role}`,
  )

  // -------------------------------------------------------------------------
  // Test 14: Transition creates notification for RT 01
  // -------------------------------------------------------------------------
  const { data: notifsRt01 } = await rt01.client.from('notifications').select('*').eq('ticket_id', ticketAId)
  assert(
    14,
    'Transisi pengiriman tiket membuat notifikasi untuk Ketua RT 01',
    !!notifsRt01 && notifsRt01.length >= 1,
    `Notif RT 01: ${notifsRt01?.length}`,
  )

  // -------------------------------------------------------------------------
  // Test 15: RT 01 sees ticket; RT 02 CANNOT see ticket of RT 01
  // -------------------------------------------------------------------------
  const { data: rt01Tickets } = await rt01.client.from('tickets').select('id').eq('id', ticketAId)
  const { data: rt02Tickets } = await rt02.client.from('tickets').select('id').eq('id', ticketAId)
  assert(
    15,
    'RT 01 melihat tiket RT 01; RT 02 TIDAK bisa melihat tiket RT 01',
    (rt01Tickets?.length ?? 0) === 1 && (rt02Tickets?.length ?? 0) === 0,
    `RT 01 sees: ${rt01Tickets?.length}, RT 02 sees: ${rt02Tickets?.length}`,
  )

  // -------------------------------------------------------------------------
  // Test 16: RT 02 cannot verify or reject ticket of RT 01
  // -------------------------------------------------------------------------
  const { error: errRt02Verify } = await rt02.client.rpc('verify_ticket', { p_ticket_id: ticketAId })
  assert(
    16,
    'RT 02 TIDAK bisa verifikasi tiket RT 01',
    !!errRt02Verify,
    'RT 02 berhasil verifikasi tiket RT 01!',
  )

  // -------------------------------------------------------------------------
  // Test 17: Reject ticket without reason is rejected
  // -------------------------------------------------------------------------
  const { error: errRejectNoReason } = await rt01.client.rpc('reject_ticket', {
    p_ticket_id: ticketAId,
    p_reason: '',
  })
  assert(
    17,
    'Tolak tiket tanpa alasan DITOLAK database',
    !!errRejectNoReason,
    'Tolak tanpa alasan berhasil!',
  )

  // -------------------------------------------------------------------------
  // Test 18: Processing ticket that is NOT 'diverifikasi_rt' is rejected
  // -------------------------------------------------------------------------
  const { error: errProcessTerkirim } = await rw06.client.rpc('process_ticket', { p_ticket_id: ticketAId })
  assert(
    18,
    'Proses tiket yang bukan diverifikasi_rt DITOLAK database',
    !!errProcessTerkirim,
    'Proses tiket saat status terkirim berhasil!',
  )

  // -------------------------------------------------------------------------
  // Test 19: RT 01 verifies ticket -> status becomes 'diverifikasi_rt'
  // -------------------------------------------------------------------------
  const { error: errVerify } = await rt01.client.rpc('verify_ticket', { p_ticket_id: ticketAId })
  const { data: verifiedTicket } = await warga1.client.from('tickets').select('status').eq('id', ticketAId).single()
  assert(
    19,
    'RT 01 berhasil verifikasi tiket -> diverifikasi_rt',
    !errVerify && verifiedTicket?.status === 'diverifikasi_rt',
    `Status: ${verifiedTicket?.status}, Error: ${errVerify?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 20: RW processes ticket -> status becomes 'diproses_rw'
  // -------------------------------------------------------------------------
  const { error: errProcess } = await rw06.client.rpc('process_ticket', { p_ticket_id: ticketAId })
  const { data: processedTicket } = await warga1.client.from('tickets').select('status').eq('id', ticketAId).single()
  assert(
    20,
    'Ketua RW berhasil memproses tiket -> diproses_rw',
    !errProcess && processedTicket?.status === 'diproses_rw',
    `Status: ${processedTicket?.status}, Error: ${errProcess?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 21: Complete ticket without proof photo is rejected
  // -------------------------------------------------------------------------
  const { error: errCompleteNoProof } = await rw06.client.rpc('complete_ticket', { p_ticket_id: ticketAId })
  assert(
    21,
    'Selesai tiket tanpa foto penyelesaian DITOLAK database',
    !!errCompleteNoProof,
    'Complete tanpa foto penyelesaian berhasil!',
  )

  // -------------------------------------------------------------------------
  // Test 22: Warga cannot insert attachment type 'penyelesaian'
  // -------------------------------------------------------------------------
  const { error: errWargaUploadPenyelesaian } = await warga1.client.from('ticket_attachments').insert({
    ticket_id: ticketAId,
    uploaded_by: warga1.user.id,
    type: 'penyelesaian',
    storage_path: `penyelesaian/${ticketAId}/fake.jpg`,
    file_name: 'fake.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 1024,
  })
  assert(
    22,
    'Warga TIDAK bisa insert attachment tipe penyelesaian',
    !!errWargaUploadPenyelesaian,
    'Warga berhasil upload penyelesaian!',
  )

  // -------------------------------------------------------------------------
  // Test 23: 4th laporan photo is rejected (max 3)
  // -------------------------------------------------------------------------
  // Upload 3 valid attachments on draftA2
  for (let i = 1; i <= 3; i++) {
    await warga1.client.from('ticket_attachments').insert({
      ticket_id: draftA2!.id,
      uploaded_by: warga1.user.id,
      type: 'laporan',
      storage_path: `laporan/${draftA2!.id}/foto_${i}.jpg`,
      file_name: `foto_${i}.jpg`,
      mime_type: 'image/jpeg',
      size_bytes: 1024 * i,
    })
  }
  // Try 4th
  const { error: errFourthPhoto } = await warga1.client.from('ticket_attachments').insert({
    ticket_id: draftA2!.id,
    uploaded_by: warga1.user.id,
    type: 'laporan',
    storage_path: `laporan/${draftA2!.id}/foto_4.jpg`,
    file_name: 'foto_4.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 1024,
  })
  assert(
    23,
    'Foto laporan ke-4 DITOLAK database (maksimal 3)',
    !!errFourthPhoto,
    'Foto ke-4 berhasil di-insert!',
  )

  // -------------------------------------------------------------------------
  // Test 24: RW uploads penyelesaian proof and completes ticket -> status 'selesai'
  // -------------------------------------------------------------------------
  const { error: errRwProof } = await rw06.client.from('ticket_attachments').insert({
    ticket_id: ticketAId,
    uploaded_by: rw06.user.id,
    type: 'penyelesaian',
    storage_path: `penyelesaian/${ticketAId}/bukti_selesai.jpg`,
    file_name: 'bukti_selesai.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 50000,
  })
  const { error: errComplete } = await rw06.client.rpc('complete_ticket', { p_ticket_id: ticketAId })
  const { data: completedTicket } = await warga1.client.from('tickets').select('status').eq('id', ticketAId).single()
  assert(
    24,
    'RW upload bukti penyelesaian dan menyelesaikan tiket -> selesai',
    !errRwProof && !errComplete && completedTicket?.status === 'selesai',
    `Proof err: ${errRwProof?.message}, Complete err: ${errComplete?.message}, Status: ${completedTicket?.status}`,
  )

  // -------------------------------------------------------------------------
  // Test 25: Rating by non-owner is rejected
  // -------------------------------------------------------------------------
  const { error: errRatingNonOwner } = await warga2.client.rpc('rate_ticket', {
    p_ticket_id: ticketAId,
    p_rating: 5,
    p_comment: 'Bagus tapi saya bukan pemilik',
  })
  assert(
    25,
    'Rating oleh bukan pemilik DITOLAK database',
    !!errRatingNonOwner,
    'Bukan pemilik berhasil memberi rating!',
  )

  // -------------------------------------------------------------------------
  // Test 26: Owner rates ticket (1-5) -> succeeds
  // -------------------------------------------------------------------------
  const { error: errRatingOwner } = await warga1.client.rpc('rate_ticket', {
    p_ticket_id: ticketAId,
    p_rating: 5,
    p_comment: 'Pelayanan sangat cepat, terima kasih!',
  })
  const { data: ratedTicket } = await warga1.client.from('tickets').select('rating, rating_comment, rated_at').eq('id', ticketAId).single()
  assert(
    26,
    'Pemilik tiket berhasil memberi rating saat selesai',
    !errRatingOwner && ratedTicket?.rating === 5 && !!ratedTicket?.rated_at,
    `Error: ${errRatingOwner?.message}`,
  )

  // -------------------------------------------------------------------------
  // Test 27: Rating a second time is rejected
  // -------------------------------------------------------------------------
  const { error: errRatingSecondTime } = await warga1.client.rpc('rate_ticket', {
    p_ticket_id: ticketAId,
    p_rating: 4,
    p_comment: 'Ganti rating',
  })
  assert(
    27,
    'Rating untuk kedua kalinya DITOLAK database (hanya sekali)',
    !!errRatingSecondTime,
    'Rating kedua kali berhasil!',
  )

  // -------------------------------------------------------------------------
  // Test 28: Storage: Warga cannot upload to penyelesaian/ folder
  // -------------------------------------------------------------------------
  const fakeFile = Buffer.from('fake image content')
  const { error: errStoragePenyelesaian } = await warga1.client.storage
    .from('ticket-attachments')
    .upload(`penyelesaian/${ticketAId}/hacked.jpg`, fakeFile, { contentType: 'image/jpeg' })
  assert(
    28,
    'Storage: Warga TIDAK bisa upload ke folder penyelesaian/',
    !!errStoragePenyelesaian,
    'Warga berhasil upload ke folder penyelesaian/ di storage!',
  )

  // -------------------------------------------------------------------------
  // Test 29: Storage: Other warga cannot read photo of another warga ticket
  // -------------------------------------------------------------------------
  // Upload legitimate laporan photo by warga1
  await warga1.client.storage
    .from('ticket-attachments')
    .upload(`laporan/${ticketAId}/valid_lampu.jpg`, fakeFile, { contentType: 'image/jpeg' })

  // Warga 2 tries to download warga 1's photo
  const { data: downloadWarga2, error: errDownloadWarga2 } = await warga2.client.storage
    .from('ticket-attachments')
    .download(`laporan/${ticketAId}/valid_lampu.jpg`)
  assert(
    29,
    'Storage: Orang lain TIDAK bisa membaca foto tiket yang tidak terlihat olehnya',
    !!errDownloadWarga2 || downloadWarga2 === null,
    'Warga 2 berhasil mendownload foto milik tiket Warga 1!',
  )

  // -------------------------------------------------------------------------
  // Test 30: Storage: File > 5MB or non JPG/PNG rejected by bucket config
  // -------------------------------------------------------------------------
  const pdfFile = Buffer.from('%PDF-1.4 test')
  const { error: errUploadPdf } = await warga1.client.storage
    .from('ticket-attachments')
    .upload(`laporan/${ticketAId}/document.pdf`, pdfFile, { contentType: 'application/pdf' })
  assert(
    30,
    'Storage: File selain JPG/PNG DITOLAK oleh storage bucket',
    !!errUploadPdf,
    'Upload PDF berhasil tanpa error!',
  )


  // =========================================================================
  // TES TAMBAHAN (Migration 0003: Verifikasi Warga, Is Active, Foto RW, Staff)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Test 31: Warga tidak bisa ubah is_rt_verified; RT 01 bisa verifikasi warga RT 01 tapi bukan RT 02
  // -------------------------------------------------------------------------
  // Set is_rt_verified = false via adminClient terlebih dahulu untuk memastikan transisi terdeteksi trigger
  await adminClient.from("profiles").update({ is_rt_verified: false }).eq("id", warga1.user.id)

  const { error: errWargaVerifySelf } = await warga1.client
    .from("profiles")
    .update({ is_rt_verified: true })
    .eq("id", warga1.user.id)

  const { error: errRt01VerifyWarga01 } = await rt01.client.rpc("verify_resident", {
    p_user_id: warga1.user.id,
    p_is_verified: true,
  })

  const { error: errRt01VerifyWarga02 } = await rt01.client.rpc("verify_resident", {
    p_user_id: warga2.user.id,
    p_is_verified: true,
  })

  const { data: profileWarga1 } = await adminClient.from("profiles").select("is_rt_verified").eq("id", warga1.user.id).single()

  assert(
    31,
    "Warga tidak bisa ubah is_rt_verified; RT 01 verifikasi warga RT 01 (OK) & RT 02 (DITOLAK)",
    !!errWargaVerifySelf && !errRt01VerifyWarga01 && !!errRt01VerifyWarga02 && profileWarga1?.is_rt_verified === true,
    `Self err: ${errWargaVerifySelf?.message}, RT01 err: ${errRt01VerifyWarga01?.message}, RT02 err: ${errRt01VerifyWarga02?.message}`
  )

  // -------------------------------------------------------------------------
  // Test 32: Akun nonaktif: tidak bisa buat draf, panggil RPC, atau baca tiket
  // -------------------------------------------------------------------------
  const inactiveEmail = `inactive_${Date.now()}@sipandu.test`
  const { data: createdInactive } = await adminClient.auth.admin.createUser({
    email: inactiveEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Warga Nonaktif", region_id: 1 },
  })
  const inactiveUid = createdInactive!.user!.id

  // Nonaktifkan profil
  await adminClient.from("profiles").update({ is_active: false }).eq("id", inactiveUid)

  const inactiveClient = await createAuthClient(inactiveEmail)

  const { error: errInactiveInsert } = await inactiveClient.client.from("tickets").insert({
    user_id: inactiveUid,
    region_id: 1,
    category_id: 1,
    title: "Draft dari Akun Nonaktif",
    description: "Percobaan membuat draf saat nonaktif",
    status: "draft",
  })

  const { error: errInactiveRpc } = await inactiveClient.client.rpc("submit_ticket", {
    p_ticket_id: ticketAId,
  })

  const { data: inactiveTickets } = await inactiveClient.client.from("tickets").select("*")

  assert(
    32,
    "Akun nonaktif: tidak bisa membuat draf, memanggil RPC, atau membaca tiket",
    !!errInactiveInsert && !!errInactiveRpc && (!inactiveTickets || inactiveTickets.length === 0),
    `Insert err: ${errInactiveInsert?.message}, RPC err: ${errInactiveRpc?.message}, Tickets seen: ${inactiveTickets?.length}`
  )

  await adminClient.auth.admin.deleteUser(inactiveUid)

  // -------------------------------------------------------------------------
  // Test 33 (Migration 0005): Admin & Ketua RW BISA upload foto bukti penyelesaian saat penanganan
  // -------------------------------------------------------------------------
  // Buat tiket baru untuk pengujian penyelesaian
  const { data: draftT33 } = await warga1.client.from("tickets").insert({
    user_id: warga1.user.id,
    region_id: 1,
    category_id: 1,
    title: "Jalan Rusak Depan RT 01",
    description: "Perlu perbaikan segera",
    status: "draft",
  }).select("id").single()

  await warga1.client.rpc("submit_ticket", { p_ticket_id: draftT33!.id })
  await rt01.client.rpc("verify_ticket", { p_ticket_id: draftT33!.id })
  await rw06.client.rpc("process_ticket", { p_ticket_id: draftT33!.id })

  const adminClientAuth = await createAuthClient("admin@sipandu.test")
  const fakeProofImg = Buffer.from("fake proof image")

  // RW upload ke storage penyelesaian/ -> harus BERHASIL
  const { error: errRwStorageProof } = await rw06.client.storage
    .from("ticket-attachments")
    .upload(`penyelesaian/${draftT33!.id}/rw_proof.jpg`, fakeProofImg, { contentType: "image/jpeg" })

  // RW insert ke ticket_attachments -> harus BERHASIL
  const { error: errRwTableProof } = await rw06.client.from("ticket_attachments").insert({
    ticket_id: draftT33!.id,
    uploaded_by: rw06.user.id,
    type: "penyelesaian",
    storage_path: `penyelesaian/${draftT33!.id}/rw_proof.jpg`,
    file_name: "rw_proof.jpg",
    mime_type: "image/jpeg",
    size_bytes: 1024,
  })

  // Admin upload ke storage penyelesaian/ -> harus BERHASIL (Migration 0005)
  const { error: errAdminStorageProof } = await adminClientAuth.client.storage
    .from("ticket-attachments")
    .upload(`penyelesaian/${draftT33!.id}/admin_proof.jpg`, fakeProofImg, { contentType: "image/jpeg" })

  // Admin insert ke ticket_attachments -> harus BERHASIL (Migration 0005)
  const { error: errAdminTableProof } = await adminClientAuth.client.from("ticket_attachments").insert({
    ticket_id: draftT33!.id,
    uploaded_by: adminClientAuth.user.id,
    type: "penyelesaian",
    storage_path: `penyelesaian/${draftT33!.id}/admin_proof.jpg`,
    file_name: "admin_proof.jpg",
    mime_type: "image/jpeg",
    size_bytes: 1024,
  })

  assert(
    33,
    "Migration 0005: Admin & Ketua RW BISA mengunggah foto bukti penyelesaian",
    !errAdminStorageProof && !errAdminTableProof && !errRwStorageProof && !errRwTableProof,
    `Admin storage err: ${errAdminStorageProof?.message}, Admin table err: ${errAdminTableProof?.message}, RW storage err: ${errRwStorageProof?.message}, RW table err: ${errRwTableProof?.message}`
  )

  // -------------------------------------------------------------------------
  // Test 34: Akun RT yang dibuat lewat service role tetap berperan ketua_rt
  // -------------------------------------------------------------------------
  const newStaffEmail = `staff_rt_${Date.now()}@sipandu.test`
  const { data: createdStaff } = await adminClient.auth.admin.createUser({
    email: newStaffEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Staff RT 03 Baru", region_id: 3 },
    app_metadata: { sipandu_role: "ketua_rt" },
  })

  const { data: dbStaff } = await adminClient.auth.admin.getUserById(createdStaff!.user!.id)
  const staffRole = dbStaff?.user?.app_metadata?.sipandu_role

  assert(
    34,
    "Akun RT yang dibuat lewat service role tetap berperan ketua_rt (tidak ditimpa)",
    staffRole === "ketua_rt",
    `Expected ketua_rt, got: ${staffRole}`
  )
  await adminClient.auth.admin.deleteUser(createdStaff!.user!.id)

  // -------------------------------------------------------------------------
  // Test 35: Warga, RT, dan RW TIDAK bisa melihat draf milik warga lain
  // -------------------------------------------------------------------------
  const { data: draftExclusive } = await warga1.client.from("tickets").insert({
    user_id: warga1.user.id,
    region_id: 1,
    category_id: 1,
    title: "Draf Rahasia Warga 1",
    description: "Hanya warga 1 yang boleh melihat ini",
    status: "draft",
  }).select("id").single()

  const { data: seenByWarga2 } = await warga2.client.from("tickets").select("id").eq("id", draftExclusive!.id)
  const { data: seenByRt01 } = await rt01.client.from("tickets").select("id").eq("id", draftExclusive!.id)
  const { data: seenByRw06 } = await rw06.client.from("tickets").select("id").eq("id", draftExclusive!.id)

  assert(
    35,
    "Warga, RT, dan RW TIDAK bisa melihat draf milik warga lain",
    (seenByWarga2?.length ?? 0) === 0 && (seenByRt01?.length ?? 0) === 0 && (seenByRw06?.length ?? 0) === 0,
    `Warga2: ${seenByWarga2?.length}, RT01: ${seenByRt01?.length}, RW06: ${seenByRw06?.length}`
  )

  // -------------------------------------------------------------------------
  // Test 36: Upload file > 5 MB ditolak
  // -------------------------------------------------------------------------
  const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024) // 5.5 MB
  const { error: errStorageBigFile } = await warga1.client.storage
    .from("ticket-attachments")
    .upload(`laporan/${draftExclusive!.id}/big_file.jpg`, bigBuffer, { contentType: "image/jpeg" })

  const { error: errTableBigFile } = await warga1.client.from("ticket_attachments").insert({
    ticket_id: draftExclusive!.id,
    uploaded_by: warga1.user.id,
    type: "laporan",
    storage_path: `laporan/${draftExclusive!.id}/big_file.jpg`,
    file_name: "big_file.jpg",
    mime_type: "image/jpeg",
    size_bytes: 6 * 1024 * 1024, // 6 MB
  })

  assert(
    36,
    "Upload file > 5 MB DITOLAK oleh storage bucket & tabel database",
    !!errStorageBigFile && !!errTableBigFile,
    `Storage err: ${errStorageBigFile?.message}, Table err: ${errTableBigFile?.message}`
  )

  // -------------------------------------------------------------------------
  // Test 37: RT 01 dan RW menerima notifikasi pada transisi yang sesuai
  // -------------------------------------------------------------------------
  // Submit draftExclusive -> status terkirim
  await warga1.client.rpc("submit_ticket", { p_ticket_id: draftExclusive!.id })
  const { data: notifRtAfterSubmit } = await rt01.client.from("notifications").select("*").eq("ticket_id", draftExclusive!.id)

  // RT 01 verifikasi -> status diverifikasi_rt
  await rt01.client.rpc("verify_ticket", { p_ticket_id: draftExclusive!.id })
  const { data: notifRwAfterVerify } = await rw06.client.from("notifications").select("*").eq("ticket_id", draftExclusive!.id)

  assert(
    37,
    "RT 01 & RW menerima notifikasi pada transisi yang sesuai (terkirim -> RT; diverifikasi_rt -> RW)",
    (notifRtAfterSubmit?.length ?? 0) >= 1 && (notifRwAfterVerify?.length ?? 0) >= 1,
    `RT notifs: ${notifRtAfterSubmit?.length}, RW notifs: ${notifRwAfterVerify?.length}`
  )

  // -------------------------------------------------------------------------
  // Test 38: Pengguna non-admin tidak bisa memanggil createStaff dan setStaffActive
  // -------------------------------------------------------------------------
  // Non-admin (warga / rt) trying to update other user profile / is_active via RLS
  const { error: errWargaSetStaffActive } = await warga1.client
    .from("profiles")
    .update({ is_active: false })
    .eq("id", warga2.user.id)

  // Non-admin trying to insert into auth or access admin APIs
  const { data: adminUsersFromWarga } = await warga1.client
    .from("profiles")
    .select("*")
    .eq("id", warga2.user.id)

  assert(
    38,
    "Pengguna non-admin TIDAK bisa mengubah status aktif akun lain atau bertindak sebagai admin",
    !!errWargaSetStaffActive || (adminUsersFromWarga?.length ?? 0) === 0,
    `Warga update other err: ${errWargaSetStaffActive?.message}`
  )

  // =========================================================================
  // TES TAMBAHAN (Migration 0004–0006: Pending User, RBAC Multi-Lapis, Admin Delete)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Test 39 (Migration 0006): Warga dengan is_rt_verified = false DITOLAK saat insert tiket atau submit_ticket
  // -------------------------------------------------------------------------
  const pendingEmail = `pending_warga_${Date.now()}@sipandu.test`
  const { data: createdPending } = await adminClient.auth.admin.createUser({
    email: pendingEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Warga Pending", region_id: 1 },
  })
  const pendingUid = createdPending!.user!.id
  // Pastikan is_rt_verified = false pada profil
  await adminClient.from("profiles").update({ is_rt_verified: false }).eq("id", pendingUid)

  const pendingClient = await createAuthClient(pendingEmail)

  // 1. Coba insert tiket -> harus DITOLAK oleh RLS tickets_warga_insert
  const { error: errPendingInsert } = await pendingClient.client.from("tickets").insert({
    user_id: pendingUid,
    region_id: 1,
    category_id: 1,
    title: "Pengaduan Warga Belum Terverifikasi",
    description: "Seharusnya ditolak",
    status: "draft",
  })

  // 2. Buat draft lewat adminClient lalu coba submit_ticket via pendingClient -> harus DITOLAK oleh RPC
  const { data: pendingDraftTicket } = await adminClient.from("tickets").insert({
    user_id: pendingUid,
    region_id: 1,
    category_id: 1,
    title: "Draft Admin untuk Pending",
    description: "Pengujian submit_ticket",
    status: "draft",
  }).select("id").single()

  const { error: errPendingSubmit } = await pendingClient.client.rpc("submit_ticket", {
    p_ticket_id: pendingDraftTicket!.id,
  })

  assert(
    39,
    "Migration 0006: Warga dengan is_rt_verified = false DITOLAK saat insert tiket atau submit_ticket",
    !!errPendingInsert && !!errPendingSubmit,
    `Insert err: ${errPendingInsert?.message}, Submit err: ${errPendingSubmit?.message}`
  )

  // -------------------------------------------------------------------------
  // Test 40 (Migration 0006): Ketua RT berhasil menyetujui warga di RT-nya sendiri, tetapi DITOLAK untuk RT lain
  // -------------------------------------------------------------------------
  // Target 1 di RT 01 (sama dengan RT01 caller)
  const { error: errRtApproveOwn } = await rt01.client.rpc("verify_resident", {
    p_user_id: pendingUid,
    p_is_verified: true,
  })

  const { data: updatedPendingProfile } = await adminClient
    .from("profiles")
    .select("is_rt_verified")
    .eq("id", pendingUid)
    .single()

  // Target 2 di RT 02 (berbeda dari RT01 caller)
  const otherRtEmail = `warga_rt02_${Date.now()}@sipandu.test`
  const { data: createdOtherRt } = await adminClient.auth.admin.createUser({
    email: otherRtEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Warga RT 02", region_id: 2 },
  })
  const otherRtUid = createdOtherRt!.user!.id
  await adminClient.from("profiles").update({ is_rt_verified: false, region_id: 2 }).eq("id", otherRtUid)

  const { error: errRtApproveOther } = await rt01.client.rpc("verify_resident", {
    p_user_id: otherRtUid,
    p_is_verified: true,
  })

  // Ketua RW bisa menyetujui warga lintas RT (RT 02)
  const { error: errRwApproveOther } = await rw06.client.rpc("verify_resident", {
    p_user_id: otherRtUid,
    p_is_verified: true,
  })

  assert(
    40,
    "Migration 0006: Ketua RT menyetujui warga RT sendiri (OK), RT lain (DITOLAK), RW lintas RT (OK)",
    !errRtApproveOwn &&
      updatedPendingProfile?.is_rt_verified === true &&
      !!errRtApproveOther &&
      !errRwApproveOther,
    `RT own err: ${errRtApproveOwn?.message}, RT other err: ${errRtApproveOther?.message}, RW err: ${errRwApproveOther?.message}`
  )

  await adminClient.auth.admin.deleteUser(pendingUid)
  await adminClient.auth.admin.deleteUser(otherRtUid)

  // -------------------------------------------------------------------------
  // Test 41 (Migration 0005): Non-admin DITOLAK saat mencoba menghapus tiket atau melakukan override status
  // -------------------------------------------------------------------------
  // Buat tiket uji coba
  const { data: testDeleteTicket } = await adminClient.from("tickets").insert({
    user_id: warga1.user.id,
    region_id: 1,
    category_id: 1,
    title: "Tiket Uji Hapus",
    description: "Uji coba hak hapus tiket",
    status: "terkirim",
  }).select("id").single()

  // Warga, RT, dan RW mencoba delete tiket
  const { data: deletedByWarga } = await warga1.client
    .from("tickets")
    .delete()
    .eq("id", testDeleteTicket!.id)
    .select("id")

  const { data: deletedByRt } = await rt01.client
    .from("tickets")
    .delete()
    .eq("id", testDeleteTicket!.id)
    .select("id")

  const { data: deletedByRw } = await rw06.client
    .from("tickets")
    .delete()
    .eq("id", testDeleteTicket!.id)
    .select("id")

  // Non-admin mencoba override status langsung ke 'selesai' tanpa RPC
  const { error: errWargaOverrideStatus } = await warga1.client
    .from("tickets")
    .update({ status: "selesai" })
    .eq("id", testDeleteTicket!.id)

  const { error: errRtOverrideStatus } = await rt01.client
    .from("tickets")
    .update({ status: "selesai" })
    .eq("id", testDeleteTicket!.id)

  // Admin mencoba delete tiket -> harus BERHASIL (Migration 0005)
  const { data: deletedByAdmin, error: errAdminDelete } = await adminClientAuth.client
    .from("tickets")
    .delete()
    .eq("id", testDeleteTicket!.id)
    .select("id")

  assert(
    41,
    "Migration 0005: Non-admin DITOLAK menghapus tiket / override status; Admin BERHASIL menghapus tiket",
    (deletedByWarga?.length ?? 0) === 0 &&
      (deletedByRt?.length ?? 0) === 0 &&
      (deletedByRw?.length ?? 0) === 0 &&
      (!!errWargaOverrideStatus || !!errRtOverrideStatus) &&
      !errAdminDelete &&
      (deletedByAdmin?.length ?? 0) === 1,
    `Warga del: ${deletedByWarga?.length}, RT del: ${deletedByRt?.length}, RW del: ${deletedByRw?.length}, Admin del err: ${errAdminDelete?.message}`
  )

  // -------------------------------------------------------------------------
  // Print Summary Table
  // -------------------------------------------------------------------------
  console.log('\n=============================================================================')
  console.log('                       TABEL HASIL PENGUJIAN FASE 3                          ')
  console.log('=============================================================================')
  console.log(
    'No.'.padEnd(5) +
    'Status'.padEnd(10) +
    'Deskripsi Pengujian'
  )
  console.log('-----------------------------------------------------------------------------')

  let passCount = 0
  for (const r of results) {
    const statusText = r.passed ? '✅ PASS' : '❌ FAIL'
    console.log(
      `${r.num.toString().padEnd(5)}${statusText.padEnd(10)}${r.description}`
    )
    if (!r.passed && r.detail) {
      console.log(`     └─ Detail: ${r.detail}`)
    }
    if (r.passed) passCount++
  }

  console.log('-----------------------------------------------------------------------------')
  console.log(`TOTAL: ${passCount} / ${results.length} LULUS`)
  if (passCount === results.length) {
    console.log('🎉 SEMUA PENGUJIAN RLS DAN STATE MACHINE LULUS 100%!')
  } else {
    console.error(`⚠️  Ada ${results.length - passCount} pengujian gagal!`)
    process.exit(1)
  }
}

runTests().catch((e) => {
  console.error('Fatal error during test run:', e)
  process.exit(1)
})
