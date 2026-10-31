import { Route, ScanSearch, Send } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

const items = [
  {
    icon: Send,
    title: "Mengadu tanpa ribet",
    text: "Tulis laporan dan lampirkan foto dari ponsel. Nomor tiket langsung tersedia setelah terkirim.",
  },
  {
    icon: Route,
    title: "Penanganan yang jelas",
    text: "Setiap laporan diverifikasi RT, lalu diteruskan ke RW untuk ditindaklanjuti sesuai kebutuhan.",
  },
  {
    icon: ScanSearch,
    title: "Pantau sampai tuntas",
    text: "Lihat status, catatan pengurus, dan bukti penyelesaian dalam satu riwayat yang mudah dipahami.",
  },
];

export default function Features() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          label="Layanan dekat, warga terlibat"
          title="Satu pintu untuk suara Anda."
          description="Tak perlu bingung harus menghubungi siapa. SIPANDU menghubungkan warga dengan pengurus RT dan RW."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl bg-surface p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary">
                  <Icon size={18} />
                </span>
                <h3 className="mt-5 text-base font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
