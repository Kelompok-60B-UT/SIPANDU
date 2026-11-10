import Link from "next/link";
import {
  ArrowUpRight,
  Construction,
  FileText,
  HeartHandshake,
  MessagesSquare,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

const categories = [
  {
    icon: Construction,
    name: "Infrastruktur",
    desc: "Jalan rusak, drainase, penerangan jalan",
  },
  {
    icon: Trash2,
    name: "Kebersihan",
    desc: "Sampah, kebersihan lingkungan, saluran air",
  },
  {
    icon: ShieldCheck,
    name: "Keamanan",
    desc: "Ketertiban dan kenyamanan lingkungan warga",
  },
  {
    icon: HeartHandshake,
    name: "Sosial",
    desc: "Kepedulian warga dan kegiatan kemasyarakatan",
  },
  {
    icon: FileText,
    name: "Administrasi",
    desc: "Pengantar RT/RW dan layanan administrasi warga",
  },
  {
    icon: MessagesSquare,
    name: "Lainnya",
    desc: "Masukan dan pengaduan di luar kategori utama",
  },
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
                href="/login"
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-primary"
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
                <ArrowUpRight size={14} className="shrink-0 text-muted" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
