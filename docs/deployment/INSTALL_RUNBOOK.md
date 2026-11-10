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
| **07** | `20261109000001_admin_protection_and_profile_guards.sql` | Helper role real-time (`_is_caller_admin`, `_get_caller_role`), trigger penegakan invariant Admin terakhir (`tr_protect_last_admin`, `tr_check_profile_guards`), serta preflight assertion verifikasi keberadaan minimal 1 Admin aktif sah. |
| **08** | `20261109000002_storage_and_privilege_hardening.sql` | Penambahan master data RT 09, 4 policies storage avatars (`read`, `insert`, `update`, `delete`), schema anti-hijacking (`REVOKE CREATE ON SCHEMA public`), Principle of Least Privilege (PoLP) tabel dan fungsi, serta default privileges. |
| **09** | `20261109000003_deduplicate_rt09_and_unique_constraint.sql` | Deduplikasi dinamis record RT 09, remap foreign key otomatis, penataan ulang sequence `public.regions.id` via `ALTER SEQUENCE ... RESTART WITH`, dan penambahan constraint integritas `UNIQUE (name, rw)` pada `public.regions`. |

---

## 5. Prosedur Eksekusi Migrasi Database & Bootstrap Administrator

Direktori `supabase/migrations/` memuat 9 berkas migrasi kanonik berurutan. Berkas migrasi 0007 memuat *preflight assertion* yang menjamin bahwa sistem database **tidak boleh** memasang proteksi invariant admin jika belum memiliki minimal 1 Administrator aktif sah.

Oleh karena itu, alur deployment Supabase CLI pada database baru terbagi menjadi tiga langkah terintegrasi:

### Tahap 5.1: Eksekusi Migrasi Awal (0001–0006)
Jalankan perintah push migrasi Supabase CLI:

```bash
# Untuk Local Supabase Stack:
npx supabase db push

# Untuk Hosted Supabase Project Baru:
npx supabase db push --remote
```

*Status Eksekusi:*
Supabase CLI akan menerapkan migrasi `20261101120001` s/d `20261101122344` secara sukses. Ketika mencapai migrasi `20261109000001`, preflight assertion akan menghentikan eksekusi sementara dengan pesan:
```text
ERROR: PREFLIGHT ABORT: Ditemukan 0 akun Admin aktif sah. Sistem wajib memiliki minimal 1 Admin aktif sebelum migration ini dapat diterapkan.
```
Pada titik ini, skema dasar tabel pengguna (`auth.users`, `public.profiles`), master data awal, dan fungsi trigger telah terpasang sempurna dan siap menerima pendaftaran administrator.

### Tahap 5.2: Bootstrap Root Administrator
Jalankan script bootstrap resmi menggunakan Supabase Auth Admin API untuk membuat akun Administrator perdana:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
ADMIN_EMAIL="admin@sipandu.id" \
ADMIN_PASSWORD="<STRONG_PASSWORD_MIN_12_CHARS>" \
npx tsx scripts/bootstrap-admin.ts
```

*Verifikasi:*
Script akan mendaftarkan user dengan `app_metadata.sipandu_role = 'admin'` dan menghasilkan profil aktif (`is_active = true`).

### Tahap 5.3: Eksekusi Migrasi Lanjutan (0007–0009)
Jalankan kembali perintah push Supabase CLI:

```bash
# Untuk Local Supabase Stack:
npx supabase db push

# Untuk Hosted Supabase Project Baru:
npx supabase db push --remote
```

*Status Akhir:*
Supabase CLI mendeteksi migrasi 0001–0006 telah terpasang, memvalidasi preflight assertion migrasi 0007 (`PREFLIGHT PASSED: Terverifikasi 1 akun Admin aktif sah`), dan melanjutkan penerapan migrasi `20261109000001` s/d `20261109000003` hingga tuntas:
- Tepat 9 record wilayah (`RT 01` s/d `RT 09`, RW 06) dengan constraint `regions_name_rw_unique`.
- Sequence `public.regions.id` selaras (`RESTART WITH 10`).
- Trigger penegakan invariant admin terakhir (`tr_protect_last_admin`) aktif.
- Storage policies untuk bucket `ticket-attachments` dan `avatars` aktif.

---

## 6. Prosedur Seeding Demo Sintetis (Opsional / Non-Production)

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
* **Larangan Target Aplikasi & Testing:** Instance demo hosted `zbttpwepgzqmyspbmsnz` **DILARANG KERAS** dijadikan target konfigurasi `.env.local`, pengembangan lokal, maupun target eksekusi test suite backend. Instans ini terisolasi murni sebagai media tinjauan langsung (demo).

---

## 2. Rekam Historis Skema & Rekonsiliasi Migrasi (0001–0009)

Evolusi skema database hosted terhadap repositori kanonik mencakup dua dimensi yang perlu dibedakan:

### A. Kesesuaian Definisi Skema DDL (Schema Parity)
Seluruh struktur relasional, integritas data, dan kebijakan keamanan pada database hosted saat ini identik dengan berkas migrasi `20261101120001` s/d `20261109000003`:
- Tepat 9 record wilayah (`RT 01` s/d `RT 09`, RW 06) dan 6 kategori laporan.
- Constraint integritas `regions_name_rw_unique` terpasang.
- Sequence `public.regions.id` selaras (`last_value = 10, is_called = false`).
- RLS aktif 100% pada seluruh tabel publik beserta fungsi trigger invariant (`tr_protect_last_admin`, `tr_check_profile_guards`).
- Storage bucket `ticket-attachments` dan `avatars` dengan hak akses minimal (PoLP).

### B. Rekonsiliasi Version ID vs Penamaan Berkas Kanonik
Perlu dibedakan antara kesesuaian riwayat *migration version IDs* dengan isi SQL DDL migrasi:
1. **Riwayat Version IDs pada Database Hosted:**
   - Migrasi 0001–0004 awalnya diterapkan menggunakan format penamaan inisial (`0001`–`0004`) pada masa awal perancangan, kemudian diselaraskan riwayat versinya pada tabel `supabase_migrations.schema_migrations` melalui `supabase migration repair --status applied`.
   - Migrasi 0005–0006 tercatat dengan version IDs `20261101122337` dan `20261101122344`.
   - Migrasi 0007–0008 tercatat dengan version IDs `20261109000001` dan `20261109000002`.
   - Migrasi 0009 tercatat dengan version ID `20261109000003` (diterapkan 2026-11-10 untuk deduplikasi RT 09, penataan sequence, dan unique constraint).
2. **Kanonisasi Penamaan Berkas pada Repositori:**
   - Seluruh 9 berkas migrasi lokal distandarisasi menggunakan timestamp 14-digit (`20261101120001` s/d `20261109000003`) agar urutan eksekusi bersifat deterministik dan dapat langsung direproduksi pada instance Supabase baru (*blank database*) tanpa memerlukan langkah repair manual.
   - Isi DDL SQL, definisi constraint, dan timestamp migrasi yang sudah diterapkan dipertahankan utuh tanpa perubahan.
3. **Catatan Normalisasi Delimiter Migrasi 0003:**
   - Pada berkas migrasi kanonik `20261101120003_verification_active_guards.sql`, delimiter fungsi `check_profile_update()` dinormalisasi dari dollar-quoting tunggal (`AS $ ... $;`) pada naskah historis inisial menjadi dollar-quoting ganda standar PostgreSQL (`AS $$ ... $$;`).
   - Oleh karena itu, terdapat perbedaan sintaks minor pada delimiter fungsi tersebut dibandingkan snapshot historis inisial, meskipun struktur DDL dan logika pengamanannya identik 100%.

---

## 3. Prosedur Backup & Kontinjensi

Sebelum penerapan migrasi 0009 pada proyek hosted, telah dibuat cadangan penuh (*full snapshot*):
- Disimpan terisolasi di luar repositori Git pada direktori backup terenkripsi offline yang aman (`<SECURE_BACKUP_DIR>`).
- Dienkripsi dengan AES-256 via GPG (`hosted_backup_20261110_000003_predeployment.tar.gz.gpg`).
- Telah diuji restorasi pada container lokal PostgreSQL 17 dengan kecocokan baris data 100%.

> [!CAUTION]
> **Larangan Target Cadangan:** Jika terjadi kendala infrastruktur pada lingkungan pengujian baru, pengembang/evaluator **TIDAK BOLEH** mengalihkan `.env.local` ke instance demo hosted `zbttpwepgzqmyspbmsnz`. Solusi yang benar adalah me-reset database pengujian atau membuat proyek pengujian baru yang terisolasi sesuai Langkah 3.1.

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
