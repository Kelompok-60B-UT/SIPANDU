import SectionHeading from "@/components/ui/SectionHeading";

const steps = [
  {
    no: "01",
    title: "Daftar dan masuk",
    text: "Gunakan data warga dan pilih RT tempat tinggal Anda di RW 06.",
  },
  {
    no: "02",
    title: "Ceritakan pengaduan",
    text: "Isi kejadian, kategori, lokasi, dan foto yang memperjelas laporan Anda.",
  },
  {
    no: "03",
    title: "Simpan nomor tiket",
    text: "Laporan terkirim! Pantau pembaruan dari pengurus melalui pengaduan saya.",
  },
];

export default function Steps() {
  return (
    <section id="cara-mengadu" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          label="Mudah dari langkah pertama"
          title="Tiga langkah, satu perubahan."
          description="Cukup beberapa menit untuk menyampaikan hal yang perlu diperbaiki."
        />
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.no}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">
                {s.no}
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
