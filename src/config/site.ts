/**
 * Konfigurasi identitas aplikasi dan wilayah kerja SIPANDU.
 *
 * Catatan: Variabel NEXT_PUBLIC_* di-inline pada saat build sehingga
 * perubahan konfigurasi memerlukan rebuild atau redeployment.
 */

export const siteConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'SIPANDU',
  appFullName: 'Sistem Informasi Layanan Publik dan Pengaduan Warga',

  rwNumber: process.env.NEXT_PUBLIC_APP_RW || '06',
  areaName: process.env.NEXT_PUBLIC_APP_AREA_NAME || 'Parakan Saat, Bandung',
  city: process.env.NEXT_PUBLIC_APP_CITY || 'Kota Bandung',

  contactAddress: process.env.NEXT_PUBLIC_APP_CONTACT_ADDRESS || null,
  contactPhone: process.env.NEXT_PUBLIC_APP_CONTACT_PHONE || null,

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
