import Link from "next/link";
import { Headset, MessageSquareText } from "lucide-react";

export default function Footer() {
  return (
    <footer id="bantuan" className="scroll-mt-20 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <MessageSquareText size={16} />
            </span>
            <span className="text-sm font-bold text-ink">
              SIPANDU RW 06 Parakansaat
            </span>
          </div>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-muted">
            Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06
            Parakansaat, Kota Bandung.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <Headset size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-ink">Butuh bantuan?</p>
            <p className="mt-0.5 text-xs text-muted">
              Hubungi pengurus RT setempat atau sekretariat RW 06.
            </p>
            <div className="mt-1.5 flex gap-3 text-xs font-medium text-primary">
              <Link href="/login" className="hover:underline">
                Masuk akun
              </Link>
              <span>•</span>
              <Link href="/register" className="hover:underline">
                Daftar warga
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 py-4 text-center text-[11px] text-muted">
        © 2026 SIPANDU • RW 06 Parakansaat, Bandung. Privasi Anda adalah bagian
        dari layanan kami.
      </div>
    </footer>
  );
}
