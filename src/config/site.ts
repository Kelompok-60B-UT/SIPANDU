/**
 * Konfigurasi Terpusat Identitas Aplikasi dan Wilayah SIPANDU (Opsi A - Single-Tenant).
 *
 * Catatan Teknis:
 * Variabel lingkungan berawalan `NEXT_PUBLIC_` di-inline oleh Next.js pada saat proses build (build time).
 * Setiap pembaruan nilai konfigurasi deployment memerlukan proses rebuild/redeploy agar berlaku pada klien.
 */

export const siteConfig = {
  // 1. Identitas Inti Aplikasi (SIPANDU)
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'SIPANDU',
  appFullName: 'Sistem Informasi Layanan Publik dan Pengaduan Warga',

  // 2. Identitas Wilayah Deployment (Single-Tenant: 1 RW per Instalasi)
  rwNumber: process.env.NEXT_PUBLIC_APP_RW || '06',
  areaName: process.env.NEXT_PUBLIC_APP_AREA_NAME || 'Parakan Saat, Bandung',
  city: process.env.NEXT_PUBLIC_APP_CITY || 'Kota Bandung',

  // 3. Kontak Operasional Sekretariat (Terpisah dari Nama Wilayah; Null jika belum diisi)
  contactAddress: process.env.NEXT_PUBLIC_APP_CONTACT_ADDRESS || null,
  contactPhone: process.env.NEXT_PUBLIC_APP_CONTACT_PHONE || null,

  // 4. Computed Getters untuk Konsistensi Penamaan Lintas Komponen
  get rwLabel(): string {
    return `RW ${this.rwNumber} ${this.areaName}`.trim()
  },
  get rwShortLabel(): string {
    return `RW ${this.rwNumber}`
  },
  get subHeaderLabel(): string {
    return `RW ${this.rwNumber} ${this.areaName.split(',')[0].trim()}`
  },
  get metaTitleDefault(): string {
    return `${this.appName} — Layanan Pengaduan Warga ${this.rwLabel}`
  },
  get metaDescriptionDefault(): string {
    return `${this.appFullName} ${this.rwLabel}.`
  },
} as const
