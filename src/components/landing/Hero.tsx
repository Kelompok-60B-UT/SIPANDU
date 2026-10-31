import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MapPin, Plus, ShieldCheck } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function Hero() {
  return (
    <section id="beranda" className="scroll-mt-20 bg-surface">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase text-primary">
            <MapPin size={12} />
            Untuk warga RW 06 Parakansaat
          </span>

          <h1 className="mt-6 text-4xl font-light leading-tight text-ink sm:text-5xl">
            Suara warga,
            <span className="block text-primary">langkah bersama.</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-muted">
            Sampaikan pengaduan, pantau penanganannya, dan ikut wujudkan
            lingkungan yang lebih nyaman. Kini, semuanya lebih dekat lewat
            SIPANDU.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <Plus size={16} />
              Buat pengaduan
            </Link>
            <Link
              href="#cara-mengadu"
              className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-surface"
            >
              Cara mengadu
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck size={14} className="shrink-0 text-green-600" />
            Gratis untuk warga • Proses transparan • Data terlindungi
          </p>
        </div>

        <div className="relative pb-6">
          <Image
            src="/hero.jpg"
            alt="Warga RW 06 Parakansaat bergotong royong membersihkan lingkungan"
            width={640}
            height={560}
            priority
            className="h-80 w-full rounded-3xl object-cover sm:h-90 md:h-100"
          />
          <div className="absolute bottom-0 left-1/2 w-[88%] -translate-x-1/2 rounded-xl bg-white p-4 shadow-lg sm:w-[85%]">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">
                  Lingkungan lebih baik, bersama.
                </p>
                <p className="text-xs text-muted">
                  68 laporan telah ditangani bulan ini
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">
                Saluran air Gang Melati
              </span>
              <Badge status="selesai" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
