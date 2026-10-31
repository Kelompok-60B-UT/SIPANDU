// Angka sementara ditulis manual. Nanti diganti data dari Supabase.
const stats = [
  { value: "128", label: "Laporan bulan ini" },
  { value: "68", label: "Laporan selesai" },
  { value: "53%", label: "Tingkat penyelesaian" },
];

export default function Stats() {
  return (
    <section className="border-y border-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-2 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-medium text-primary">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </div>
        ))}
        <p className="text-xs text-muted md:ml-auto md:max-w-50">
          Transparansi untuk semua warga. Statistik pengaduan RW 06, Oktober
          2026.
        </p>
      </div>
    </section>
  );
}
