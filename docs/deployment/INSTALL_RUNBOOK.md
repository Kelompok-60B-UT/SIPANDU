# SIPANDU — DEVELOPER INSTALLATION & DEPLOYMENT RUNBOOK

**Target Project:** SIPANDU (Sistem Informasi Pelayanan Warga Terpadu RW 06)  
**Standardized Canonical Migrations:** 9 Berkas (`20261101120001` s/d `20261109000003`)  
**Toolchain:** Supabase CLI `v3.0.0+`, Node.js `v20+` LTS, Next.js `16.4.3`, PostgreSQL `17`

---

## 📋 Struktur Dokumen

- [BAGIAN A: Panduan Fresh Deployment (Database Kosong / Baru)](#bagian-a-panduan-fresh-deployment-database-kosong--baru)
  - [1. Prasyarat Sistem & Dependensi](#1-prasyarat-sistem--dependensi)
  - [2. Kloning Repositori & Instalasi Paket](#2-kloning-repositori--instalasi-paket)
  - [3. Konfigurasi Environment Variables](#3-konfigurasi-environment-variables)
  - [4. Silsilah 9 Migrasi Kanonik (Single Migration Lineage)](#4-silsilah-9-migrasi-kanonik-single-migration-lineage)
  - [5. Eksekusi Migrasi Database Baru](#5-eksekusi-migrasi-database-baru)
  - [6. Prosedur Bootstrap Root Administrator](#6-prosedur-bootstrap-root-administrator)
  - [7. Prosedur Seeding Demo Sintetis (Opsional / Non-Production)](#7-prosedur-seeding-demo-sintetis-opsional--non-production)
  - [8. Verifikasi Backend & RLS Test Suite](#8-verifikasi-backend--rls-test-suite)
  - [9. Menjalankan Server Aplikasi](#9-menjalankan-server-aplikasi)
- [BAGIAN B: Catatan Pemeliharaan Proyek Demo Hosted (`zbttpwepgzqmyspbmsnz`)](#bagian-b-catatan-pemeliharaan-proyek-demo-hosted-zbttpwepgzqmyspbmsnz)
  - [1. Status Operasional Proyek Demo](#1-status-operasional-proyek-demo)
  - [2. Rekam Historis Penerapan Migrasi 0001–0009](#2-rekam-historis-penerapan-migrasi-00010009)
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
# URL API Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co"

# Supabase Anon / Publishable Key (Aman untuk frontend browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_ANON_KEY>"

# Supabase Service Role Key (HANYA digunakan di server/backend & script CLI administratif)
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"
```

> [!CAUTION]
> Jangan pernah memublikasikan `SUPABASE_SERVICE_ROLE_KEY` ke repositori Git publik atau mengeksposnya ke sisi klien frontend (`NEXT_PUBLIC_*`).

---

## 4. Silsilah 9 Migrasi Kanonik (Single Migration Lineage)

Direktori `supabase/migrations/` memuat tepat 9 berkas migrasi kanonik berurutan. Seluruh migrasi dirancang mandiri, aman (*safe-guarded*), dan idempoten:

| No | File Migrasi | Deskripsi & Fungsi Kunci |
|:---:|---|---|
| **01** | `20261101120001_sipandu_init.sql` | Inisialisasi enum tipe data, 7 tabel inti (`regions`, `categories`, `profiles`, `tickets`, `ticket_attachments`, `ticket_timeline`, `notifications`), baseline RLS, bucket storage `ticket-attachments`, serta seed master RT 01–08 dan 6 kategori laporan. |
| **02** | `20261101120002_fix_attachments_and_indexes.sql` | Fungsi helper `_count_laporan_attachments`, perbaikan policy insert attachment, serta penambahan 7 indeks performa foreign key. |
| **03** | `20261101120003_verification_active_guards.sql` | Penambahan kolom `profiles.is_rt_verified`, helper `_is_caller_active()`, status active guards, dan proteksi profil warga. |
| **04** | `20261101120004_avatars_bucket.sql` | Pembuatan storage bucket publik `avatars` untuk foto profil pengguna. |
| **05** | `20261101122337_admin_rls_and_delete.sql` | Hak akses Admin & RW untuk bukti penyelesaian tiket, dan policy penghapusan administratif `tickets_admin_delete`. |
| **06** | `20261101122344_pending_user_verification.sql` | RPC `verify_resident(uuid, boolean)` dengan validasi wilayah RT, notifikasi persetujuan, dan proteksi pengiriman tiket warga belum disetujui. |
| **07** | `20261109000001_admin_protection_and_profile_guards.sql` | Helper role real-time (`_is_caller_admin`, `_get_caller_role`), trigger penegakan invariant Admin terakhir (`tr_protect_last_admin`, `tr_check_profile_guards`), serta preflight check adaptif database kosong. |
| **08** | `20261109000002_storage_and_privilege_hardening.sql` | Penambahan master data RT 09, 4 policies storage avatars (`read`, `insert`, `update`, `delete`), schema anti-hijacking (`REVOKE CREATE ON SCHEMA public`), Principle of Least Privilege (PoLP) tabel dan fungsi, serta default privileges. |
| **09** | `20261109000003_deduplicate_rt09_and_unique_constraint.sql` | Deduplikasi dinamis record RT 09, remap foreign key otomatis, penataan ulang sequence `public.regions.id` via `ALTER SEQUENCE ... RESTART WITH`, dan penambahan constraint integritas `UNIQUE (name, rw)` pada `public.regions`. |

---

## 5. Eksekusi Migrasi Database Baru

### Opsi 5.1: Menggunakan Local Supabase Stack
```bash
# Menyalakan stack lokal Supabase
npx supabase start

# Menjalankan 9 migrasi kanonik dari nol
npx supabase db push
```

### Opsi 5.2: Menggunakan Hosted Supabase Project Baru
```bash
# Hubungkan repositori ke project hosted baru
npx supabase link --project-ref <NEW_PROJECT_REF>

# Terapkan seluruh migrasi kanonik ke remote database
npx supabase db push --remote
```

*Hasil yang diharapkan:*
- 9 file migrasi terpasang sukses berurutan.
- Tabel `public.regions` berisi tepat 9 record (`RT 01` s/d `RT 09`, RW 06).
- Constraint `regions_name_rw_unique` aktif.
- Tabel `public.categories` berisi 6 kategori pengaduan standar.

---

## 6. Prosedur Bootstrap Root Administrator

> [!WARNING]
> Setelah database dipasang, lakukan bootstrap administrator pertama **SEBELUM** membuka akses aplikasi untuk pengguna umum. Proteksi invariant admin database mewajibkan minimal 1 Administrator aktif setiap saat.

Jalankan script bootstrap resmi menggunakan Supabase Auth Admin API:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
ADMIN_EMAIL="admin@sipandu.id" \
ADMIN_PASSWORD="<STRONG_PASSWORD_MIN_12_CHARS>" \
npx tsx scripts/bootstrap-admin.ts
```

Script ini akan:
1. Mendaftarkan user ke sistem Auth Supabase dengan konfirmasi email otomatis (`email_confirm = true`).
2. Menetapkan peran pada level tepercaya: `app_metadata.sipandu_role = 'admin'`.
3. Memicu trigger pembuatan profil dengan status aktif (`is_active = true`) dan terverifikasi (`is_rt_verified = true`).

---

## 7. Prosedur Seeding Demo Sintetis (Opsional / Non-Production)

> [!CAUTION]
> Script data demo **DILARANG** dijalankan pada environment produksi (`NODE_ENV=production`). Script dilengkapi modul pengaman `scripts/demo-guard.ts` yang akan membatalkan eksekusi jika mendeteksi environment produksi atau tanpa persetujuan eksplisit `ALLOW_DEMO_SEED=true`.

Untuk keperluan demonstrasi, staging, atau pengujian lokal:

### Langkah 7.1: Provisioning Akun Demo
```bash
# Mode simulasi tanpa menulis data (dry-run):
ALLOW_DEMO_SEED=true \
DEMO_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-users.ts --dry-run

# Eksekusi provisioning akun demo:
ALLOW_DEMO_SEED=true \
DEMO_PASSWORD="<STRONG_DEMO_PASSWORD>" \
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co" \
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
ALLOW_DEMO_SEED=true \
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
npx tsx scripts/seed-demo-tickets.ts
```

Script ini memasukkan:
- 6 Tiket pengaduan yang mencakup seluruh status alur kerja (`draft`, `terkirim`, `diverifikasi_rt`, `diproses_rw`, `selesai`, `ditolak`).
- Riwayat kronologi (timeline) dan riwayat tindak lanjut.
- Metadata lampiran foto sebelum dan sesudah penanganan.
- Notifikasi alur kerja.

---

## 8. Verifikasi Backend & RLS Test Suite

Uji seluruh aturan keamanan database, RLS, dan transisi state machine menggunakan test suite terintegrasi (`scripts/test-backend.ts`).

> [!CAUTION]
> Test suite backend melakukan mutasi data pengujian terisolasi dan dilindungi oleh *fail-closed target guard*. Script **DILARANG MUTLAK** dijalankan pada database demo capstone hosted (`zbttpwepgzqmyspbmsnz`) maupun domain produksi.
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

*Ekspektasi:* Seluruh pengujian (>40 skenario) lulus (`passed: true`) dengan 0 kegagalan assertion, dan seluruh resource pengujian (tiket, user, file storage) dibersihkan secara otomatis melalui modul pembersihan terpusat `executeCleanup`.

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

# BAGIAN B: Catatan Pemeliharaan Proyek Demo Hosted (`zbttpwepgzqmyspbmsnz`)

Bagian ini mendokumentasikan status dan riwayat operasional proyek demo hosted Supabase SIPANDU.

---

## 1. Status Operasional Proyek Demo

* **Project ID:** `zbttpwepgzqmyspbmsnz`
* **Region:** `ap-southeast-2` (AWS Sydney)
* **Status:** **READ-ONLY / DEMO ACTIVE**
* **Kebijakan Pemeliharaan:** Proyek ini digunakan secara aktif untuk demonstrasi capstone. Tidak boleh dilakukan DDL destruktif, reset database, atau operasi pembersihan data pada instans ini.

---

## 2. Rekam Historis Penerapan Migrasi 0001–0009

Proyek demo hosted telah melalui seluruh tahapan evolusi skema hingga mencapai paritas 100% dengan repositori lokal:

1. **Baseline Inisial (0001–0004)**: Diterapkan saat inisiasi proyek historis dan direkonsiliasi via `supabase migration repair --status applied`.
2. **Pembaruan Fitur Awal (0005–0006)**: Tercatat pada riwayat remote (`20261101122337` dan `20261101122344`).
3. **Penguatan Hak Akses & Invariant (0007–0008)**:
   - `20261109000001_admin_protection_and_profile_guards.sql`
   - `20261109000002_storage_and_privilege_hardening.sql`
   Diterapkan pada Deployment Fase 2.
4. **Koreksi & Integritas Wilayah (0009)**:
   - `20261109000003_deduplicate_rt09_and_unique_constraint.sql`
   Diterapkan pada 2026-11-10 untuk mendeduplikasi record RT 09, merestart sequence `public.regions.id` via `ALTER SEQUENCE ... RESTART WITH`, dan menambahkan constraint `UNIQUE (name, rw)`.

*Status Akhir Hosted:*
- Tepat 9 record wilayah (`RT 01` s/d `RT 09`, RW 06).
- Constraint `regions_name_rw_unique` terpasang.
- Nilai sequence `public.regions.id` selaras (`last_value = 10, is_called = false`).

---

## 3. Prosedur Backup & Kontinjensi

Sebelum penerapan migrasi 0009 pada proyek hosted, telah dibuat cadangan penuh (*full snapshot*):
- Disimpan terisolasi di luar repositori Git pada direktori backup terenkripsi offline yang aman (`<SECURE_BACKUP_DIR>`).
- Dienkripsi dengan AES-256 via GPG (`hosted_backup_20261110_000003_predeployment.tar.gz.gpg`).
- Telah diuji restorasi pada container lokal PostgreSQL 17 dengan kecocokan baris data 100%.

Jika terjadi insiden infrastruktur darurat pada lingkungan hosted baru saat pengujian, konfigurasi `.env.local` dapat diarahkan ke instance demo `zbttpwepgzqmyspbmsnz` sebagai rujukan cadangan.

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
