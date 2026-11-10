# SIPANDU — DEVELOPER INSTALLATION & DEPLOYMENT RUNBOOK

**Target Arsitektur:** Hosted-Only Deployment (**Next.js 16 di Vercel** & **PostgreSQL 17 / Auth / Storage di Supabase Hosted**)<br />
**Silsilah Migrasi Kanonik:** 10 Berkas SQL (`20261101120001` s/d `20261110000001`)<br />
**Toolchain:** Supabase CLI `v3.0.0+`, Node.js `v20+` LTS, Next.js `16.4.3`, Vercel Platform

---

## 📋 Struktur Dokumen

- [SIPANDU — DEVELOPER INSTALLATION \& DEPLOYMENT RUNBOOK](#sipandu--developer-installation--deployment-runbook)
  - [📋 Struktur Dokumen](#-struktur-dokumen)
- [BAGIAN A: Panduan Fresh Deployment (Vercel + Supabase Hosted)](#bagian-a-panduan-fresh-deployment-vercel--supabase-hosted)
  - [1. Target Arsitektur Cloud Hosted](#1-target-arsitektur-cloud-hosted)
  - [2. Prasyarat Sistem \& Dependensi](#2-prasyarat-sistem--dependensi)
  - [3. Kloning Repositori \& Instalasi Paket](#3-kloning-repositori--instalasi-paket)
  - [4. Audit \& Pemetaan Environment Variables](#4-audit--pemetaan-environment-variables)
    - [A. Variabel Publik Klien (`NEXT_PUBLIC_*`)](#a-variabel-publik-klien-next_public_)
    - [B. Variabel Server-Side Secret](#b-variabel-server-side-secret)
  - [5. Silsilah 10 Migrasi Kanonik (Single Migration Lineage)](#5-silsilah-10-migrasi-kanonik-single-migration-lineage)
  - [6. Prosedur Setup \& Migrasi Supabase Hosted](#6-prosedur-setup--migrasi-supabase-hosted)
    - [Langkah 6.1: Buat Project Baru di Supabase Dashboard](#langkah-61-buat-project-baru-di-supabase-dashboard)
    - [Langkah 6.2: Konfigurasi File Lingkungan Lokal](#langkah-62-konfigurasi-file-lingkungan-lokal)
    - [Langkah 6.3: Tautkan Supabase CLI ke Project Hosted](#langkah-63-tautkan-supabase-cli-ke-project-hosted)
    - [Langkah 6.4: Eksekusi Migrasi Database Remote](#langkah-64-eksekusi-migrasi-database-remote)
  - [7. Prosedur Bootstrap Root Administrator](#7-prosedur-bootstrap-root-administrator)
  - [8. Prosedur Deployment ke Vercel](#8-prosedur-deployment-ke-vercel)
  - [9. Prosedur Seeding Demo Sintetis (Staging Terpisah - Opsional)](#9-prosedur-seeding-demo-sintetis-staging-terpisah---opsional)
    - [Langkah 9.1: Provisioning Akun Demo](#langkah-91-provisioning-akun-demo)
    - [Langkah 9.2: Seeding Data Tiket \& Siklus Pengaduan](#langkah-92-seeding-data-tiket--siklus-pengaduan)
  - [10. Prosedur Pengujian Backend \& RLS (Dedicated Test Project)](#10-prosedur-pengujian-backend--rls-dedicated-test-project)
- [BAGIAN B: Catatan Pemeliharaan Proyek Demo Hosted Terproteksi](#bagian-b-catatan-pemeliharaan-proyek-demo-hosted-terproteksi)
  - [1. Status Operasional Proyek Demo](#1-status-operasional-proyek-demo)
  - [2. Rekam Historis Skema \& Rekonsiliasi Migrasi (0001–0010)](#2-rekam-historis-skema--rekonsiliasi-migrasi-00010010)
    - [A. Kesesuaian Definisi Skema DDL (Schema Parity)](#a-kesesuaian-definisi-skema-ddl-schema-parity)
    - [B. Rekonsiliasi Version ID vs Penamaan Berkas Kanonik](#b-rekonsiliasi-version-id-vs-penamaan-berkas-kanonik)
  - [3. Prosedur Backup \& Kontinjensi](#3-prosedur-backup--kontinjensi)
- [BAGIAN C: Prinsip Keamanan \& Tata Kelola Kunci Akses](#bagian-c-prinsip-keamanan--tata-kelola-kunci-akses)

---

# BAGIAN A: Panduan Fresh Deployment (Vercel + Supabase Hosted)

Panduan ini adalah prosedur operasional standar bagi pengembang, penguji, atau evaluator untuk melakukan fresh deployment SIPANDU secara utuh pada infrastruktur cloud resmi.

---

## 1. Target Arsitektur Cloud Hosted

SIPANDU beroperasi pada infrastruktur cloud terkelola penuh. Seluruh alur kerja difokuskan pada:

1. **Vercel**: Menjalankan frontend Next.js 16, App Router, Turbopack, Server Actions, Route Handlers, dan Edge Middleware.
2. **Supabase Hosted**: Menyediakan PostgreSQL 17, Supabase Auth, Storage Buckets privat dan publik, Row Level Security (RLS 100%), dan fungsi RPC `SECURITY DEFINER`.

---

## 2. Prasyarat Sistem & Dependensi

Pastikan perangkat lunak berikut terpasang di komputer Anda:

* **Node.js**: `v20.x` LTS atau lebih baru (`node -v`)
* **Package Manager**: npm `v9+` atau `v10+` (`npm -v`)
* **Supabase CLI**: `v3.0.0+` (`npx supabase -v`)
* **Git**: Terpasang untuk kloning repositori (`git -v`)
* **Akun Supabase & Vercel**: Akun aktif pada kedua penyedia layanan cloud.

---

## 3. Kloning Repositori & Instalasi Paket

```bash
git clone https://github.com/Kelompok-60B-UT/SIPANDU.git
cd SIPANDU
npm install
```

---

## 4. Audit & Pemetaan Environment Variables

Berdasarkan audit menyeluruh terhadap kode sumber aplikasi, konfigurasi lingkungan dikelompokkan ke dalam dua ranah akses:

### A. Variabel Publik Klien (`NEXT_PUBLIC_*`)
Di-inline oleh Next.js ke bundle JavaScript pada waktu build (*build-time*). Perubahan nilai memerlukan kompilasi ulang (redeploy) di Vercel:

```env
# URL API Supabase Hosted (contoh: https://<project-ref>.supabase.co)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"

# Supabase Anon Key (Aman untuk frontend browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Identitas Aplikasi & Wilayah Kerja RW (Single-Tenant: 1 RW per Instalasi)
NEXT_PUBLIC_APP_NAME="SIPANDU"
NEXT_PUBLIC_APP_RW="06"
NEXT_PUBLIC_APP_AREA_NAME="Parakan Saat, Bandung"
NEXT_PUBLIC_APP_CITY="Kota Bandung"

# Kontak Operasional Sekretariat RW (Opsional)
NEXT_PUBLIC_APP_CONTACT_ADDRESS="Jl. Parakan Saat No. 06"
NEXT_PUBLIC_APP_CONTACT_PHONE="081234567890"
```

### B. Variabel Server-Side Secret
Hanya digunakan pada runtime server (Server Actions, Route Handlers) di Vercel dan skrip administratif CLI di terminal pengembang:

```env
# Supabase Service Role Secret Key (Bypass RLS - HANYA untuk backend/server & CLI administratif)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> [!CAUTION]
> Jangan pernah memublikasikan `SUPABASE_SERVICE_ROLE_KEY` ke repositori Git publik, jangan mengeksposnya ke sisi klien browser, dan jangan menyertakannya dengan prefix `NEXT_PUBLIC_`. Jangan pernah mengarahkan `.env.local` ke database demo hosted yang dilindungi.

---

## 5. Silsilah 10 Migrasi Kanonik (Single Migration Lineage)

Direktori `supabase/migrations/` memuat tepat 10 berkas migrasi kanonik berurutan yang dirancang mandiri, aman (*safe-guarded*), dan idempoten:

| No | File Migrasi | Deskripsi & Fungsi Kunci |
|:---:|---|---|
| **01** | `20261101120001_sipandu_init.sql` | Inisialisasi enum tipe data, 7 tabel inti (`regions`, `categories`, `profiles`, `tickets`, `ticket_attachments`, `ticket_timeline`, `notifications`), baseline RLS, bucket storage `ticket-attachments`, serta seed master RT 01–08 dan 6 kategori laporan. |
| **02** | `20261101120002_fix_attachments_and_indexes.sql` | Fungsi helper `_count_laporan_attachments`, perbaikan policy insert attachment, serta penambahan 7 indeks performa foreign key. |
| **03** | `20261101120003_verification_active_guards.sql` | Penambahan kolom `profiles.is_rt_verified`, helper `_is_caller_active()`, status active guards, dan proteksi profil warga (dengan normalisasi delimiter fungsi `AS $$ ... $$;`). |
| **04** | `20261101120004_avatars_bucket.sql` | Pembuatan storage bucket publik `avatars` untuk foto profil pengguna. |
| **05** | `20261101122337_admin_rls_and_delete.sql` | Hak akses Admin & RW untuk bukti penyelesaian tiket, dan policy penghapusan administratif `tickets_admin_delete`. |
| **06** | `20261101122344_pending_user_verification.sql` | RPC `verify_resident(uuid, boolean)` dengan validasi wilayah RT, notifikasi persetujuan, dan proteksi pengiriman tiket warga belum disetujui. |
| **07** | `20261109000001_admin_protection_and_profile_guards.sql` | Helper role real-time (`_is_caller_admin`, `_get_caller_role`), trigger penegakan invariant Admin terakhir (`tr_protect_last_admin`, `tr_check_profile_guards`), serta preflight assertion cerdas (melewati pemeriksaan dengan `NOTICE` pada database baru yang masih kosong / 0 user di `auth.users`, serta mewajibkan minimal 1 Admin aktif pada database yang sudah berisi user). |
| **08** | `20261109000002_storage_and_privilege_hardening.sql` | Penambahan master data RT 09, 4 policies storage avatars (`read`, `insert`, `update`, `delete`), schema anti-hijacking (`REVOKE CREATE ON SCHEMA public`), Principle of Least Privilege (PoLP) tabel dan fungsi, serta default privileges. |
| **09** | `20261109000003_deduplicate_rt09_and_unique_constraint.sql` | Deduplikasi dinamis record RT 09, remap foreign key otomatis, penataan ulang sequence `public.regions.id` via `ALTER SEQUENCE ... RESTART WITH`, dan penambahan constraint integritas `UNIQUE (name, rw)` pada `public.regions`. |
| **10** | `20261110000001_fix_null_region_auth_bypass.sql` | Penguatan otorisasi wilayah NULL-safe (`IS NULL` eksplisit & `IS DISTINCT FROM`) pada RPC `verify_ticket(bigint)`, `reject_ticket(bigint, text)`, dan `verify_resident(uuid, boolean)` untuk menutup celah *three-valued logic* ketika `region_id` bernilai `NULL`. |

---

## 6. Prosedur Setup & Migrasi Supabase Hosted

### Langkah 6.1: Buat Project Baru di Supabase Dashboard
1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard) dan klik **New Project**.
2. Masukkan nama project (misalnya `sipandu-rw06`), tetapkan password PostgreSQL database yang aman, dan pilih Region terdekat (contoh: `ap-southeast-1` Singapore).
3. Salin Project URL, Project Reference ID (`<NEW_PROJECT_REF>`), Anon Key, dan Service Role Key dari menu **Project Settings** -> **API**.

### Langkah 6.2: Konfigurasi File Lingkungan Lokal
Salin berkas template lingkungan:
```bash
cp .env.example .env.local
```
Sesuaikan nilainya pada `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://<NEW_PROJECT_REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<YOUR_ANON_KEY>"
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"
```

### Langkah 6.3: Tautkan Supabase CLI ke Project Hosted
Login ke akun Supabase Anda:
```bash
npx supabase login
```
Hubungkan workspace lokal ke project hosted yang baru:
```bash
npx supabase link --project-ref <NEW_PROJECT_REF>
```

### Langkah 6.4: Eksekusi Migrasi Database Remote
Sebelum menerapkan migrasi secara aktual, selalu lakukan pemeriksaan awal dengan opsi `--dry-run`:

```bash
# 1. Periksa daftar migrasi yang akan diterapkan:
npx supabase db push --remote --dry-run

# 2. Terapkan seluruh migrasi kanonik ke database hosted (wajib menyertakan flag --remote):
npx supabase db push --remote
```

> [!IMPORTANT]
> Aturan operasional migrasi remote:
> - Flag `--remote` wajib disertakan secara eksplisit.
> - Dilarang menggunakan opsi `--yes` agar operator selalu dapat meninjau konfirmasi target sebelum perubahan diterapkan.
> - Berkas migrasi 0007 secara otomatis mengenali database baru (0 akun di `auth.users`) dan menerapkan seluruh 10 migrasi secara tuntas tanpa jeda.

*Status Akhir Migrasi:*
- Seluruh 10 migrasi (`20261101120001` s/d `20261110000001`) terpasang tuntas.
- Tepat 9 record wilayah (`RT 01` s/d `RT 09`, RW 06) dengan constraint `regions_name_rw_unique`.
- Sequence `public.regions.id` selaras (`RESTART WITH 10`).
- Trigger penegakan invariant admin terakhir (`tr_protect_last_admin`) aktif.
- RPC `verify_ticket`, `reject_ticket`, dan `verify_resident` telah diamankan dengan validasi wilayah NULL-safe.

---

## 7. Prosedur Bootstrap Root Administrator

Setelah 10 migrasi selesai diterapkan, buat akun Administrator perdana menggunakan skrip bootstrap resmi (Auth Admin API):

```bash
ADMIN_EMAIL="admin@sipandu.id" \
ADMIN_PASSWORD="GantiDenganPasswordKuatMin12Karakter!" \
NEXT_PUBLIC_SUPABASE_URL="https://<NEW_PROJECT_REF>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" \
npx tsx scripts/bootstrap-admin.ts
```

*Verifikasi:*
Skrip akan mendaftarkan user dengan klaim tepercaya `app_metadata.sipandu_role = 'admin'` dan menghasilkan profil aktif di tabel `public.profiles` (`is_active = true`, `is_rt_verified = true`).

---

## 8. Prosedur Deployment ke Vercel

Setelah database Supabase Hosted siap dan akun Administrator telah terdaftar:

1. **Push Repositori:** Pastikan kode terbaru telah berada di repositori Git (GitHub/GitLab).
2. **Impor ke Vercel:** Buka [Vercel Dashboard](https://vercel.com/new) dan pilih repositori **SIPANDU**.
3. **Pengaturan Project:**
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
4. **Environment Variables di Vercel:**
   Tambahkan variabel lingkungan berikut pada menu pengaturan Vercel (Environment: Production & Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<NEW_PROJECT_REF>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<YOUR_ANON_KEY>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<YOUR_SERVICE_ROLE_KEY>`
   - `NEXT_PUBLIC_APP_NAME`: `SIPANDU`
   - `NEXT_PUBLIC_APP_RW`: `06`
   - `NEXT_PUBLIC_APP_AREA_NAME`: `Parakan Saat, Bandung`
   - `NEXT_PUBLIC_APP_CITY`: `Kota Bandung`
5. **Jalankan Deployment:** Klik tombol **Deploy** dan verifikasi hasil build Next.js.
6. **Sesuaikan Supabase Auth URL Configuration:**
   Buka **Supabase Dashboard** -> **Authentication** -> **URL Configuration**:
   - **Site URL:** Masukkan domain Vercel produksi Anda (misalnya `https://sipandu-rw06.vercel.app`).
   - **Redirect URLs:** Tambahkan `https://sipandu-rw06.vercel.app/**` dan `https://sipandu-rw06.vercel.app/auth/callback`.

---

# BAGIAN B: Catatan Pemeliharaan Proyek Demo Hosted Terproteksi

Bagian ini mendokumentasikan status dan riwayat operasional proyek demo hosted Supabase SIPANDU.

---

## 1. Status Operasional Proyek Demo

* **Project ID:** `<PROTECTED_DEMO_PROJECT_REF>`
* **Region:** `ap-southeast-2` (AWS Sydney)
* **Status:** **READ-ONLY / DEMO ACTIVE**
* **Kebijakan Pemeliharaan:** Proyek ini digunakan secara aktif untuk demonstrasi capstone. Tidak boleh dilakukan DDL destruktif, reset database, atau operasi pembersihan data pada instans ini.
* **Larangan Target Aplikasi & Testing:** Instance demo hosted terproteksi **DILARANG KERAS** dijadikan target konfigurasi `.env.local` maupun pengembangan lokal. Instans ini terisolasi murni sebagai media tinjauan langsung (demo).

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
   - Blok *preflight assertion* pada migrasi `0007` diperbarui agar memeriksa jumlah total akun di `auth.users` terlebih dahulu. Jika database masih kosong (`0` akun), preflight dilewati dengan `RAISE NOTICE` sehingga `npx supabase db push --remote` dan instalasi baru dapat berjalan satu tahap penuh. Jika `auth.users` sudah berisi akun tetapi belum ada Admin aktif, preflight tetap menolak dengan `RAISE EXCEPTION`.
5. **Catatan Penambahan Migrasi 0010 (`20261110000001_fix_null_region_auth_bypass.sql`):**
   - Migrasi `0010` ditambahkan pada repositori untuk memperbarui definisi RPC `verify_ticket`, `reject_ticket`, dan `verify_resident` agar menolak kondisi `region_id IS NULL` (baik pada pemanggil Ketua RT maupun target warga/tiket) menggunakan pengecekan `IS NULL` eksplisit dan `IS DISTINCT FROM`.

---

## 3. Prosedur Backup & Kontinjensi

Sebelum penerapan migrasi 0009 pada proyek hosted, telah dibuat cadangan penuh (*full snapshot*):
- Disimpan terisolasi di luar repositori Git pada direktori backup terenkripsi offline yang aman (`<SECURE_BACKUP_DIR>`).
- Dienkripsi dengan AES-256 via GPG (`hosted_backup_20261110_000003_predeployment.tar.gz.gpg`).
- Telah diuji restorasi pada container terisolasi PostgreSQL 17 dengan kecocokan baris data 100%.

> [!CAUTION]
> **Larangan Target Cadangan:** Jika terjadi kendala infrastruktur pada lingkungan pengujian baru, pengembang/evaluator **TIDAK BOLEH** mengalihkan `.env.local` ke instance demo hosted yang dilindungi. Solusi yang benar adalah membuat proyek Supabase Hosted pengujian baru yang terisolasi sesuai Bagian A.

---

# BAGIAN C: Prinsip Keamanan & Tata Kelola Kunci Akses

1. **Prinsip Hak Akses Minimal (PoLP)**:
   Token `SUPABASE_SERVICE_ROLE_KEY` memiliki hak akses administratif yang mengabaikan Row Level Security. Kunci ini **HANYA** boleh disimpan pada server internal atau saat mengeksekusi skrip CLI administratif.
2. **Kunci Klien Publik**:
   Frontend browser hanya menggunakan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Seluruh pembatasan akses data diatur secara deterministik oleh Row Level Security (RLS) pada PostgreSQL 17.
3. **Klaim Otorisasi Tepercaya**:
   Peran pengguna (`warga`, `ketua_rt`, `ketua_rw`, `admin`) disimpan pada `auth.users.app_metadata.sipandu_role`. Manipulasi nilai peran melalui `user_metadata` saat pendaftaran publik otomatis ditolak dan diabaikan oleh trigger database.
4. **Proteksi Invariant Database**:
   Penonaktifan atau penghapusan administrator terakhir ditolak secara langsung oleh PostgreSQL trigger (`tr_protect_last_admin`), melindungi sistem dari kehilangan kontrol administratif.
