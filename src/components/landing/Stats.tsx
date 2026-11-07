import { Suspense } from "react";
import { connection } from "next/server";
import { getPublicStats } from "@/app/actions/tickets";
import { StatsSkeleton } from "@/components/ui/Skeleton";
import { isSupabaseConfigured } from "@/utils/supabase/server";

const FALLBACK_ITEMS = [
  { value: "128", label: "Laporan terkirim" },
  { value: "68", label: "Laporan selesai" },
  { value: "53%", label: "Tingkat penyelesaian" },
];

function StatsGrid({
  items,
}: {
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-2 md:grid-cols-4">
      {items.map((s) => (
        <div key={s.label}>
          <p className="text-3xl font-medium text-primary">{s.value}</p>
          <p className="mt-1 text-xs text-muted">{s.label}</p>
        </div>
      ))}
      <p className="text-xs text-muted md:ml-auto md:max-w-50">
        Transparansi untuk semua warga. Statistik pengaduan publik RW 06
        Parakan Saat.
      </p>
    </div>
  );
}

async function LiveStats() {
  if (!isSupabaseConfigured()) {
    return <StatsGrid items={FALLBACK_ITEMS} />;
  }

  await connection();
  const res = await getPublicStats();
  if (!res.success) {
    return (
      <StatsGrid
        items={[
          { value: "0", label: "Laporan terkirim" },
          { value: "0", label: "Laporan selesai" },
          { value: "0%", label: "Tingkat penyelesaian" },
        ]}
      />
    );
  }

  const { total_tickets, selesai } = res.data;
  const rate =
    total_tickets > 0 ? Math.round((selesai / total_tickets) * 100) : 0;

  return (
    <StatsGrid
      items={[
        { value: String(total_tickets), label: "Laporan terkirim" },
        { value: String(selesai), label: "Laporan selesai" },
        { value: `${rate}%`, label: "Tingkat penyelesaian" },
      ]}
    />
  );
}

export default function Stats() {
  return (
    <section className="border-y border-border bg-white">
      <Suspense fallback={<StatsSkeleton />}>
        <LiveStats />
      </Suspense>
    </section>
  );
}
