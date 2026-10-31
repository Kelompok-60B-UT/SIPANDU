import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageSquareText, ShieldCheck } from "lucide-react";

type AuthShellProps = {
  headline: ReactNode;
  children: ReactNode;
};

export default function AuthShell({ headline, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[42%_58%]">
      {/* Panel Kiri: Identitas SIPANDU */}
      <aside className="bg-navy px-6 py-8 text-white sm:px-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-12 lg:py-11 xl:px-14">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary">
              <MessageSquareText size={20} />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight text-white">
                SIPANDU
              </span>
              <span className="block text-[11px] text-blue-100/80">
                RW 06 Parakansaat, Bandung
              </span>
            </span>
          </Link>

          <h2 className="mt-7 text-2xl font-bold leading-[1.2] tracking-tight text-white sm:text-3xl lg:mt-11 xl:text-[38px]">
            {headline}
          </h2>

          <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-100/80 lg:mt-4">
            Suara Anda berarti. Bersama RT dan RW, wujudkan Parakansaat yang
            lebih nyaman untuk semua.
          </p>

          <div className="mt-8 hidden overflow-hidden rounded-2xl lg:block">
            <Image
              src="/loginhero.jpg"
              alt="Warga RW 06 Parakansaat merawat lingkungan bersama"
              width={640}
              height={420}
              priority
              className="h-auto w-full scale-[1.03] object-cover"
            />
          </div>
        </div>

        <div className="mt-8 hidden lg:block">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck size={16} className="shrink-0 text-blue-200" />
            <span>Aman, transparan, dan dekat dengan warga.</span>
          </div>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-blue-100/75">
            Satu akun untuk menyampaikan pengaduan dan memantau setiap langkah
            penanganannya.
          </p>
          <p className="mt-8 text-[11px] text-blue-200/60">
            Sistem Informasi Layanan Publik dan Pengaduan Warga
          </p>
        </div>
      </aside>

      {/* Panel Kanan: Form Autentikasi */}
      <main className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 lg:py-11 xl:px-20">
        <div className="mx-auto flex w-full max-w-[500px] items-center justify-between text-xs text-muted lg:max-w-none">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            Kembali ke beranda
          </Link>
          <Link
            href="/#bantuan"
            className="transition-colors hover:text-ink"
          >
            Butuh bantuan?
          </Link>
        </div>

        <div className="mx-auto my-8 w-full max-w-[500px] sm:my-10 lg:mx-0">
          {children}
        </div>

        <footer className="mx-auto w-full max-w-[500px] text-[11px] leading-relaxed text-muted lg:mx-0">
          <p>© 2026 SIPANDU • RW 06 Parakansaat, Bandung</p>
          <p>Privasi Anda adalah bagian dari layanan kami.</p>
        </footer>
      </main>
    </div>
  );
}
