import Link from "next/link";
import { Clock, Headset, MapPin, MessageSquareText, PhoneCall } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function Footer() {
  return (
    <footer id="bantuan" className="scroll-mt-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Kolom Kiri: Brand & Deskripsi */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                <MessageSquareText size={18} />
              </span>
              <span className="text-base font-bold text-ink">
                {siteConfig.appName} {siteConfig.rwLabel}
              </span>
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-muted">
              {siteConfig.appFullName} {siteConfig.rwLabel}. Wadah
              transparan dan terintegrasi untuk menghubungkan warga dengan
              pengurus RT dan RW.
            </p>

            <div className="mt-5 space-y-2 text-xs text-muted">
              {siteConfig.contactAddress ? (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-primary" />
                  <span>{siteConfig.contactAddress}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted/70">
                  <MapPin size={14} className="shrink-0 text-muted/50" />
                  <span>Alamat sekretariat belum dikonfigurasi</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock size={14} className="shrink-0 text-primary" />
                <span>Senin – Jumat: 08.00 – 16.00 WIB • Sabtu: 08.00 – 12.00 WIB</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Kartu Kontak Pengurus */}
          <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <Headset size={20} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Pusat Bantuan & Layanan Pengurus
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Memerlukan bantuan verifikasi akun, perbaikan data wilayah, atau pendampingan pengaduan?
                  Pengurus RT di wilayah Anda dan sekretariat {siteConfig.rwShortLabel} siap membantu.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
                  {siteConfig.contactPhone ? (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-ink">
                      <PhoneCall size={13} className="text-primary" />
                      <span>Sekretariat {siteConfig.rwShortLabel}: {siteConfig.contactPhone}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-muted">
                      <PhoneCall size={13} className="text-muted/60" />
                      <span>Kontak belum tersedia</span>
                    </div>
                  )}
                  <Link
                    href="/login"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    Masuk akun
                  </Link>
                  <span className="text-border">•</span>
                  <Link
                    href="/register"
                    className="cursor-pointer text-primary hover:underline"
                  >
                    Daftar warga
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/70 pt-5 text-center text-[11px] text-muted">
          © 2026 {siteConfig.appName} • {siteConfig.rwLabel}. Privasi Anda adalah bagian
          dari integritas layanan kami.
        </div>
      </div>
    </footer>
  );
}
