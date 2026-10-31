import Link from "next/link";
import {
  ArrowUpRight,
  Construction,
  Droplets,
  Lightbulb,
  MessagesSquare,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

const categories = [
  { icon: Trash2, name: "Kebersihan", desc: "Sampah dan kebersihan lingkungan" },
  { icon: Droplets, name: "Drainase", desc: "Saluran air dan genangan" },
  { icon: Lightbulb, name: "Penerangan", desc: "Lampu jalan dan fasilitas umum" },
  { icon: Construction, name: "Infrastruktur", desc: "Jalan dan sarana lingkungan" },
  { icon: ShieldCheck, name: "Ketertiban", desc: "Keamanan dan kenyamanan warga" },
  { icon: MessagesSquare, name: "Layanan lainnya", desc: "Saran dan kebutuhan warga" },
];

export default function Categories() {
  return (
    <section id="layanan" className="scroll-mt-20 bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          label="Apa yang bisa dilaporkan?"
          title="Mulai dari sekitar rumah."
          description="Pilih kategori yang paling sesuai agar laporan Anda sampai ke pengurus yang tepat."
        />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.name}
                href="/laporan/baru"
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 hover:border-primary"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <Icon size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    {c.name}
                  </span>
                  <span className="block text-xs text-muted">{c.desc}</span>
                </span>
                <ArrowUpRight size={14} className="text-muted" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
