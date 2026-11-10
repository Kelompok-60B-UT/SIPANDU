# SIPANDU — DEVELOPER INSTALLATION & DEPLOYMENT RUNBOOK

**Target Project:** SIPANDU (Sistem Informasi Pelayanan Warga Terpadu RW 06)
**Standardized Canonical Migrations:** 10 Berkas (`20261101120001` s/d `20261110000001`)
**Toolchain:** Supabase CLI `v3.0.0+`, Node.js `v20+` LTS, Next.js `16.4.3`, PostgreSQL `17`

---

## 📋 Struktur Dokumen

- [BAGIAN A: Panduan Fresh Deployment (Database Kosong / Baru)](#bagian-a-panduan-fresh-deployment-database-kosong--baru)
  - [1. Prasyarat Sistem & Dependensi](#1-prasyarat-sistem--dependensi)
  - [2. Kloning Repositori & Instalasi Paket](#2-kloning-repositori--instalasi-paket)
  - [3. Konfigurasi Environment Variables](#3-konfigurasi-environment-variables)
  - [4. Silsilah 10 Migrasi Kanonik (Single Migration Lineage)](#4-silsilah-10-migrasi-kanonik-single-migration-lineage)
  - [5. Eksekusi Migrasi Database Baru](#5-eksekusi-migrasi-database-baru)
  - [6. Prosedur Bootstrap Root Administrator](#6-prosedur-bootstrap-root-administrator)
  - [7. Prosedur Seeding Demo Sintetis (Opsional / Non-Production)](#7-prosedur-seeding-demo-sintetis-opsional--non-production)
  - [8. Verifikasi Backend & RLS Test Suite](#8-verifikasi-backend--rls-test-suite)
  - [9. Menjalankan Server Aplikasi](#9-menjalankan-server-aplikasi)
- [BAGIAN B: Catatan Pemeliharaan Proyek Demo Hosted Terproteksi](#bagian-b-catatan-pemeliharaan-proyek-demo-hosted-terproteksi)
  - [1. Status Operasional Proyek Demo](#1-status-operasional-proyek-demo)
  - [2. Rekam Historis Skema & Rekonsiliasi Migrasi (0001–0010)](#2-rekam-historis-skema--rekonsiliasi-migrasi-00010010)
  - [3. Prosedur Backup & Kontinjensi](#3-prosedur-backup--kontinjensi)
- [BAGIAN C: Prinsip Keamanan & Tata Kelola Kunci Akses](#bagian-c-prinsip-keamanan--tata-kelola-kunci-akses)

---

# BAGIAN A: Panduan Fresh Deployment (Database Kosong / Baru)

Panduan ini adalah prosedur standar bagi pengembang, penguji, atau operator yang ingin memasang sistem SIPANDU dari nol pada database PostgreSQL 17 / Supabase baru yang masih kosong.

---

## 1. Prasyarat Sistem & Dependensi

Pastikan perangkat lunak berikut terpasang di komputer Anda:

* **Node.js**: `v20.x` LTS atau lebih baru (`node -v`)
* **Package Manager**: npm `v9+` atau `v10+` (`npm -v`)
* **Supabase CLI**: `v3.0.0+` (`npx supabase -v`)
* **Docker Desktop / Docker Engine**: Diperlukan jika menggunakan Supabase Stack lokal (`docker -v`)

---

## 2. Kloning Repositori & Instalasi Paket

```bash
git clone https://github.com/Kelompok-60B-UT/SIPANDU.git
cd SIPANDU
npm install
```

---

## 3. Konfigurasi Environment Variables

Salin berkas template lingkungan:

```bash
cp .env.example .env.local
```

Buka dan sesuaikan berkas `.env.local`:

```env
# URL API Supabase (Local stack atau Hosted project baru Anda sendiri)
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"

# Supabase Anon / Publishable Key (Aman untuk frontend browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_ANON_KEY>"

# Supabase Service Role Key (HANYA digunakan di server/backend & script CLI administratif)
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"
```

> [!CAUTION]
> Jangan pernah memublikasikan `SUPABASE_SERVICE_ROLE_KEY` ke repositori Git publik atau mengeksposnya ke sisi klien frontend (`NEXT_PUBLIC_*`). Jangan pernah mengarahkan `.env.local` ke database demo hosted yang dilindungi.

---

## 4. Silsilah 10 Migrasi Kanonik (Single Migration Lineage)

Direktori `supabase/migrations/` memuat tepat 10 berkas migrasi kanonik berurutan. Seluruh migrasi dirancang mandiri, aman (*safe-guarded*), dan idempoten:

| No | File Migrasi | Deskripsi & Fungsi Kunci |
|:---:|---|---|
| **01** | `20261101120001_sipandu_init.sql` | Inisialisasi enum tipe data, 7 tabel inti (`regions`, `categories`, `profiles`, `tickets`, `ticket_attachments`, `ticket_timeline`, `notifications`), baseline RLS, bucket storage `ticket-attachments`, serta seed master RT 01–08 dan 6 kategori laporan. |
| **02** | `20261101120002_fix_attachments_and_indexes.sql` | Fungsi helper `_count_laporan_attachments`, perbaikan policy insert attachment, serta penambahan 7 indeks performa foreign key. |
| **03** | `20261101120003_verification_active_guards.sql` | Penambahan kolom `profiles.is_rt_verified`, helper `_is_caller_active()`, status active guards, dan proteksi profil warga (dengan normalisasi delimiter fungsi `AS $$ ... $$;`). |
| **04** | `20261101120004_avatars_bucket.sql` | Pembuatan storage bucket publik `avatars` untuk foto profil pengguna. |
| **05** | `20261101122337_admin_rls_and_delete.sql` | Hak akses Admin & RW untuk bukti penyelesaian tiket, dan policy penghapusan administratif `tickets_admin_delete`. |
| **06** | `20261101122344_pending_user_verification.sql` | RPC `verify_resident(uuid, boolean)` dengan validasi wilayah RT, notifikasi persetujuan, dan proteksi pengiriman tiket warga belum disetujui. |
| **07** | `20261109000001_admin_protection_and_profile_guards.sql` | Helper role real-time (`_is_caller_admin`, `_get_caller_role`), trigger penegakan invariant Admin terakhir (`tr_protect_last_admin`, `tr_check_profile_guards`), serta preflight assertion yang melewati pemeriksaan dengan `NOTICE` pada database baru yang masih kosong (`0` baris di `auth.users`) dan mewajibkan minimal 1 Admin aktif pada database yang sudah berisi user. |
| **08** | `20261109000002_storage_and_privilege_hardening.sql` | Penambahan master data RT 09, 4 policies storage avatars (`read`, `insert`, `update`, `delete`), schema anti-hijacking (`REVOKE CREATE ON SCHEMA public`), Principle of Least Privilege (PoLP) tabel dan fungsi, serta default privileges. |
| **09** | `20261109000003_deduplicate_rt09_and_unique_constraint.sql` | Deduplikasi dinamis record RT 09, remap foreign key otomatis, penataan ulang sequence `public.regions.id` via `ALTER SEQUENCE ... RESTART WITH`, dan penambahan constraint integritas `UNIQUE (name, rw)` pada `public.regions`. |
| **10** | `20261110000001_fix_null_region_auth_bypass.sql` | Penguatan otorisasi wilayah NULL-safe (`IS NULL` eksplisit & `IS DISTINCT FROM`) pada RPC `verify_ticket(bigint)`, `reject_ticket(bigint, text)`, dan `verify_resident(uuid, boolean)` untuk menutup celah *three-valued logic* ketika `region_id` bernilai `NULL`. |

---

## 5. Eksekusi Migrasi Database Baru

Berkat penyempurnaan *preflight assertion* pada migrasi `0007` (`20261109000001`), instalasi pada database kosong (`0` akun di `auth.users`) mengeksekusi seluruh 10 berkas migrasi (`0001` s/d `0010`) dalam satu lintasan tanpa terhenti di tengah jalan.

*(Catatan: Apabila migrasi `0007` dijalankan pada database lama yang sudah memiliki data pengguna di `auth.users` namun belum memiliki akun Admin aktif, preflight akan membatalkan migrasi dengan `PREFLIGHT ABORT` demi mencegah sistem terkunci tanpa Admin).*

### Tahap 5.1: Eksekusi pada Local Supabase Stack
```bash
# Memulai ulang database lokal dan menerapkan seluruh migrasi 0001–0010 dari nol:
npx supabase db reset

# Atau mendorong migrasi yang belum terpasang ke container lokal aktif:
npx supabase db push
```

### Tahap 5.2: Eksekusi pada Hosted Supabase Project Baru
Pastikan Anda menghubungkan (*link*) workspace CLI ke project ref baru terlebih dahulu sebelum menjalankan perintah push remote:

```bash
npx supabase link --project-ref <NEW_PROJECT_REF>
npx supabase db push --remote
```

*Status Akhir Migrasi:*
- Seluruh 10 migrasi (`20261101120001` s/d `20261110000001`) terpasang tuntas.
- Tepat 9 record wilayah (`RT 01` s/d `RT 09`, RW 06) dengan constraint `regions_name_rw_unique`.
- Sequence `public.regions.id` selaras (`RESTART WITH 10`).
- Trigger penegakan invariant admin terakhir (`tr_protect_last_admin`) aktif.
- RPC `verify_ticket`, `reject_ticket`, dan `verify_resident` telah diamankan dengan validasi wilayah NULL-safe.

---

## 6. Prosedur Bootstrap Root Administrator

Setelah seluruh migrasi selesai diterapkan, jalankan script bootstrap resmi menggunakan Supabase Auth Admin API untuk membuat akun Administrator perdana:

```bash
# Untuk Local Supabase Stack:
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_LOCAL_SERVICE_ROLE_KEY>" \
ADMIN_EMAIL="admin@sipandu.id" \
ADMIN_PASSWORD="<STRONG_PASSWORD_MIN_12_CHARS>" \
npx tsx scripts/bootstrap-admin.ts

# Untuk Hosted Supabase Project Baru:
NEXT_PUBLIC_SUPABASE_URL="https://<NEW_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
ADMIN_EMAIL="admin@sipandu.id" \
ADMIN_PASSWORD="<STRONG_PASSWORD_MIN_12_CHARS>" \
npx tsx scripts/bootstrap-admin.ts
```

*Verifikasi:*
Script akan mendaftarkan user dengan `app_metadata.sipandu_role = 'admin'` dan menghasilkan profil aktif (`is_active = true`).

---

## 7. Prosedur Seeding Demo Sintetis (Opsional / Non-Production)

> [!CAUTION]
> Script data demo **DILARANG** dijalankan pada environment produksi (`NODE_ENV=production`) maupun pada project yang masuk dalam `PROTECTED_SUPABASE_PROJECT_REFS`. Script dilengkapi modul pengaman `scripts/demo-guard.ts`:
> - Untuk target **lokal** (`localhost` / `127.0.0.1`), wajib menyertakan `ALLOW_DEMO_SEED=true`.
> - Untuk target **hosted non-produksi**, wajib menyertakan `ALLOW_DEMO_SEED=true` **DAN** `ALLOWED_DEMO_PROJECT_REF="<YOUR_PROJECT_REF>"` yang cocok persis dengan project ref pada URL target.

Untuk keperluan demonstrasi, staging, atau pengujian lokal:

### Langkah 7.1: Provisioning Akun Demo
```bash
# A. Mode simulasi tanpa menulis data (dry-run) pada Local Stack:
ALLOW_DEMO_SEED=true \
DEMO_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_LOCAL_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-users.ts --dry-run

# B. Eksekusi provisioning akun demo pada Local Stack:
ALLOW_DEMO_SEED=true \
DEMO_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_LOCAL_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-users.ts

# C. Eksekusi provisioning akun demo pada Hosted Staging Project Terpisah:
ALLOW_DEMO_SEED=true \
ALLOWED_DEMO_PROJECT_REF="<YOUR_STAGING_PROJECT_REF>" \
DEMO_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_STAGING_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-users.ts
```

Daftar akun demo yang dibuat:
| Peran | Email | Wilayah | Status Verifikasi |
|---|---|:---:|:---:|
| **Admin** | `admin@sipandu.test` | - | Aktif / Terverifikasi |
| **Ketua RW** | `rw06@sipandu.test` | RW 06 | Aktif / Terverifikasi |
| **Ketua RT 01** | `rt01@sipandu.test` | RT 01 | Aktif / Terverifikasi |
| **Ketua RT 02** | `rt02@sipandu.test` | RT 02 | Aktif / Terverifikasi |
| **Warga RT 01** | `warga1@sipandu.test` | RT 01 | Aktif / **Terverifikasi** |
| **Warga RT 01** | `warga.pending@sipandu.test` | RT 01 | Aktif / **Pending (`is_rt_verified = false`)** |
| **Warga RT 02** | `warga2@sipandu.test` | RT 02 | Aktif / **Terverifikasi** |

### Langkah 7.2: Seeding Data Tiket & Siklus Pengaduan
```bash
# A. Eksekusi pada Local Stack:
ALLOW_DEMO_SEED=true \
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_LOCAL_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-tickets.ts

# B. Eksekusi pada Hosted Staging Project Terpisah:
ALLOW_DEMO_SEED=true \
ALLOWED_DEMO_PROJECT_REF="<YOUR_STAGING_PROJECT_REF>" \
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_STAGING_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-tickets.ts
```

Script ini memastikan master wilayah dengan constraint `(name, rw)` dan memasukkan:
- 6 Tiket pengaduan yang mencakup seluruh status alur kerja (`draft`, `terkirim`, `diverifikasi_rt`, `diproses_rw`, `selesai`, `ditolak`).
- Riwayat kronologi (timeline) dan riwayat tindak lanjut.
- Metadata lampiran foto sebelum dan sesudah penanganan.
- Notifikasi alur kerja.

---

## 8. Verifikasi Backend & RLS Test Suite

Uji seluruh aturan keamanan database, RLS, dan transisi state machine menggunakan test suite terintegrasi (`scripts/test-backend.ts`).

> [!CAUTION]
> Test suite backend melakukan mutasi data pengujian terisolasi dan dilindungi oleh *fail-closed target guard*. Script **DILARANG MUTLAK** dijalankan pada database demo hosted yang dilindungi (`PROTECTED_SUPABASE_PROJECT_REFS`) maupun domain produksi.
>
> Secara **default**, pengujian terhadap target hosted Supabase Cloud **DITOLAK**. Pengujian diutamakan untuk **local stack** (`localhost` / `127.0.0.1`), atau **dedicated hosted test project** terpisah dengan opt-in bertingkat dari operator.

### Prasyarat Variabel Lingkungan:
- `NEXT_PUBLIC_SUPABASE_URL`: Target database lokal atau test project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Kunci anonim target pengujian.
- `SUPABASE_SERVICE_ROLE_KEY`: Kunci service role administratif target pengujian.
- `TEST_PASSWORD`: Password autentikasi akun uji coba.
- `ALLOW_DESTRUCTIVE_TEST=true`: Wajib disetel sebagai persetujuan eksplisit eksekusi mutasi pengujian (wajib untuk lokal dan remote).
- `ALLOW_REMOTE_HOSTED_TEST=true`: Konfirmasi eksplisit izin pengujian remote (wajib hanya untuk hosted test project).
- `ALLOWED_TEST_PROJECT_REF`: Wajib disetel jika menargetkan hosted test project terpisah (harus cocok persis dengan ref URL target).

### Eksekusi pada Local Supabase Stack (Default):
```bash
ALLOW_DESTRUCTIVE_TEST=true \
TEST_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_LOCAL_ANON_KEY>" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_LOCAL_SERVICE_ROLE_KEY>" \
npx tsx scripts/test-backend.ts
```

### Eksekusi pada Dedicated Hosted Test Project Terpisah:
```bash
ALLOW_DESTRUCTIVE_TEST=true \
ALLOW_REMOTE_HOSTED_TEST=true \
ALLOWED_TEST_PROJECT_REF="<NEW_TEST_PROJECT_REF>" \
TEST_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="https://<NEW_TEST_PROJECT_REF>.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_ANON_KEY>" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
npx tsx scripts/test-backend.ts
```

*Ekspektasi:* Seluruh 44 skenario pengujian lulus (`passed: true`) dengan 0 kegagalan assertion, dan seluruh resource pengujian (tiket, user, notifikasi non-tiket, file storage) dibersihkan secara idempoten melalui modul pembersihan terpusat `executeCleanup`.

---

## 9. Menjalankan Server Aplikasi

```bash
# Menjalankan development server lokal:
npm run dev

# Membangun build produksi (Production Build):
npm run build

# Menjalankan build produksi:
npm run start
```

---

# BAGIAN B: Catatan Pemeliharaan Proyek Demo Hosted Terproteksi

Bagian ini mendokumentasikan status dan riwayat operasional proyek demo hosted Supabase SIPANDU.

---

## 1. Status Operasional Proyek Demo

* **Project ID:** `<PROTECTED_DEMO_PROJECT_REF>` (Dikonfigurasi melalui `PROTECTED_SUPABASE_PROJECT_REFS`)
* **Region:** `ap-southeast-2` (AWS Sydney)
* **Status:** **READ-ONLY / DEMO ACTIVE**
* **Kebijakan Pemeliharaan:** Proyek ini digunakan secara aktif untuk demonstrasi capstone. Tidak boleh dilakukan DDL destruktif, reset database, atau operasi pembersihan data pada instans ini.
* **Larangan Target Aplikasi & Testing:** Instance demo hosted terproteksi **DILARANG KERAS** dijadikan target konfigurasi `.env.local`, pengembangan lokal, maupun target eksekusi test suite backend. Instans ini terisolasi murni sebagai media tinjauan langsung (demo).

---

## 2. Rekam Historis Skema & Rekonsiliasi Migrasi (0001–0010)

Evolusi skema database terhadap repositori kanonik mencakup aspek-aspek berikut:

### A. Kesesuaian Definisi Skema DDL (Schema Parity)
Seluruh struktur relasional, integritas data, dan kebijakan keamanan pada repositori kanonik saat ini didefinisikan oleh berkas migrasi `20261101120001` s/d `20261110000001`:
- Tepat 9 record wilayah (`RT 01` s/d `RT 09`, RW 06) dan 6 kategori laporan.
- Constraint integritas `regions_name_rw_unique` terpasang.
- Sequence `public.regions.id` selaras (`last_value = 10, is_called = false`).
- RLS aktif 100% pada seluruh tabel publik beserta fungsi trigger invariant (`tr_protect_last_admin`, `tr_check_profile_guards`).
- Storage bucket `ticket-attachments` dan `avatars` dengan hak akses minimal (PoLP).
- Otorisasi wilayah NULL-safe pada `verify_ticket`, `reject_ticket`, dan `verify_resident` (Migrasi `0010`).

### B. Rekonsiliasi Version ID vs Penamaan Berkas Kanonik
Perlu dibedakan antara kesesuaian riwayat *migration version IDs* dengan isi SQL DDL migrasi:
1. **Riwayat Version IDs pada Database Hosted:**
   - Migrasi 0001–0004 awalnya diterapkan menggunakan format penamaan inisial (`0001`–`0004`) pada masa awal perancangan, kemudian diselaraskan riwayat versinya pada tabel `supabase_migrations.schema_migrations` melalui `supabase migration repair --status applied`.
   - Migrasi 0005–0006 tercatat dengan version IDs `20261101122337` dan `20261101122344`.
   - Migrasi 0007–0008 tercatat dengan version IDs `20261109000001` dan `20261109000002`.
   - Migrasi 0009 tercatat dengan version ID `20261109000003` (diterapkan 2026-11-10 untuk deduplikasi RT 09, penataan sequence, dan unique constraint).
2. **Kanonisasi Penamaan Berkas pada Repositori:**
   - Seluruh 10 berkas migrasi lokal distandarisasi menggunakan timestamp 14-digit (`20261101120001` s/d `20261110000001`) agar urutan eksekusi bersifat deterministik dan dapat langsung direproduksi pada instance Supabase baru (*blank database*) tanpa memerlukan langkah repair manual.
3. **Catatan Normalisasi Delimiter Migrasi 0003 (`20261101120003_verification_active_guards.sql`):**
   - Pada berkas migrasi kanonik `20261101120003_verification_active_guards.sql`, delimiter fungsi `check_profile_update()` dinormalisasi dari dollar-quoting tunggal (`AS $ ... $;`) pada naskah historis inisial menjadi dollar-quoting ganda standar PostgreSQL (`AS $$ ... $$;`).
   - Oleh karena itu, terdapat perbedaan sintaks minor pada delimiter fungsi tersebut dibandingkan snapshot historis inisial, meskipun struktur DDL dan logika pengamanannya identik.
4. **Catatan Penyempurnaan Preflight Migrasi 0007 (`20261109000001_admin_protection_and_profile_guards.sql`):**
   - Blok *preflight assertion* pada migrasi `0007` diperbarui agar memeriksa jumlah total akun di `auth.users` terlebih dahulu. Jika database masih kosong (`0` akun), preflight dilewati dengan `RAISE NOTICE` sehingga `npx supabase db reset` dan instalasi baru dapat berjalan satu tahap penuh. Jika `auth.users` sudah berisi akun tetapi belum ada Admin aktif, preflight tetap menolak dengan `RAISE EXCEPTION`.
5. **Catatan Penambahan Migrasi 0010 (`20261110000001_fix_null_region_auth_bypass.sql`):**
   - Migrasi `0010` ditambahkan pada repositori untuk memperbarui definisi RPC `verify_ticket`, `reject_ticket`, dan `verify_resident` agar menolak kondisi `region_id IS NULL` (baik pada pemanggil Ketua RT maupun target warga/tiket) menggunakan pengecekan `IS NULL` eksplisit dan `IS DISTINCT FROM`.

---

## 3. Prosedur Backup & Kontinjensi

Sebelum penerapan migrasi 0009 pada proyek hosted, telah dibuat cadangan penuh (*full snapshot*):
- Disimpan terisolasi di luar repositori Git pada direktori backup terenkripsi offline yang aman (`<SECURE_BACKUP_DIR>`).
- Dienkripsi dengan AES-256 via GPG (`hosted_backup_20261110_000003_predeployment.tar.gz.gpg`).
- Telah diuji restorasi pada container lokal PostgreSQL 17 dengan kecocokan baris data 100%.

> [!CAUTION]
> **Larangan Target Cadangan:** Jika terjadi kendala infrastruktur pada lingkungan pengujian baru, pengembang/evaluator **TIDAK BOLEH** mengalihkan `.env.local` ke instance demo hosted yang dilindungi. Solusi yang benar adalah me-reset database pengujian lokal (`npx supabase db reset`) atau membuat proyek pengujian baru yang terisolasi sesuai Bagian A Tahap 5.1 dan Tahap 5.2.

---

# BAGIAN C: Prinsip Keamanan & Tata Kelola Kunci Akses

1. **Prinsip Hak Akses Minimal (PoLP)**:
   Token `SUPABASE_SERVICE_ROLE_KEY` memiliki hak akses administratif yang mengabaikan Row Level Security. Kunci ini **HANYA** boleh disimpan pada server internal atau saat mengeksekusi script CLI administratif.
2. **Kunci Klien Publik**:
   Frontend browser hanya menggunakan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Seluruh pembatasan akses data diatur secara deterministik oleh Row Level Security (RLS) pada PostgreSQL 17.
3. **Klaim Otorisasi Tepercaya**:
   Peran pengguna (`warga`, `ketua_rt`, `ketua_rw`, `admin`) disimpan pada `auth.users.app_metadata.sipandu_role`. Manipulasi nilai peran melalui `user_metadata` saat pendaftaran publik otomatis ditolak dan diabaikan oleh trigger database.
4. **Proteksi Invariant Database**:
   Penonaktifan atau penghapusan administrator terakhir ditolak secara langsung oleh PostgreSQL trigger (`tr_protect_last_admin`), melindungi sistem dari kehilangan kontrol administratif.
