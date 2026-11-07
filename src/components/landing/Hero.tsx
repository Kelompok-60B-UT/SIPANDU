import { Suspense } from "react";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MapPin, Plus, ShieldCheck } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { getPublicStats } from "@/app/actions/tickets";
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from "@/utils/supabase/server";
import type { TicketStatus } from "@/types";

interface HeroCardData {
  summaryText: string;
  ticketTitle: string;
  ticketStatus: TicketStatus;
}

const PREVIEW_HERO_CARD: HeroCardData = {
  summaryText: "68 laporan warga telah selesai ditangani",
  ticketTitle: "Saluran air Gang Melati",
  ticketStatus: "selesai",
};

function HeroHighlightCard({
  summaryText,
  ticketTitle,
  ticketStatus,
}: HeroCardData) {
  return (
    <div className="absolute bottom-0 left-1/2 w-[88%] -translate-x-1/2 rounded-xl bg-white p-4 shadow-lg sm:w-[85%]">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Lingkungan lebih baik, bersama.
          </p>
          <p className="text-xs text-muted">{summaryText}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted">{ticketTitle}</span>
        <Badge status={ticketStatus} />
      </div>
    </div>
  );
}

async function fetchHeroCardData(): Promise<HeroCardData> {
  if (!isSupabaseConfigured()) {
    return PREVIEW_HERO_CARD;
  }

  await connection();

  // Ambil angka resmi yang sama persis dengan Stats.tsx (public_stats RPC)
  const statsRes = await getPublicStats();
  const selesaiCount = statsRes.success ? statsRes.data.selesai : 0;
  const totalCount = statsRes.success ? statsRes.data.total_tickets : 0;
  const diprosesCount = statsRes.success ? statsRes.data.diproses : 0;

  const summaryText = `${selesaiCount} laporan warga telah selesai ditangani`;

  // Ambil judul & status tiket terbaru untuk baris highlight bawah
  let featured: { title: string; status: TicketStatus } | null = null;

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const [latestDoneRes, latestAnyRes] = await Promise.all([
        admin
          .from("tickets")
          .select("title, status")
          .eq("status", "selesai")
          .order("completed_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("tickets")
          .select("title, status")
          .neq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      featured = latestDoneRes.data ?? latestAnyRes.data;
    } catch (error) {
      unstable_rethrow(error);
    }
  } else {
    try {
      const supabase = await createClient();
      const { data: visibleDone } = await supabase
        .from("tickets")
        .select("title, status")
        .eq("status", "selesai")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (visibleDone) {
        featured = visibleDone;
      } else {
        const { data: visibleAny } = await supabase
          .from("tickets")
          .select("title, status")
          .neq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        featured = visibleAny;
      }
    } catch (error) {
      unstable_rethrow(error);
    }
  }

  const fallbackStatus: TicketStatus =
    selesaiCount > 0
      ? "selesai"
      : diprosesCount > 0
        ? "diproses_rw"
        : "terkirim";

  const fallbackTitle =
    totalCount > 0
      ? "Pantauan pengaduan warga RW 06"
      : "Belum ada pengaduan warga terbaru";

  return {
    summaryText,
    ticketTitle: featured?.title ?? fallbackTitle,
    ticketStatus: featured?.status ?? fallbackStatus,
  };
}

async function LiveHeroHighlightCard() {
  const data = await fetchHeroCardData();
  return <HeroHighlightCard {...data} />;
}

export default function Hero() {
  return (
    <section id="beranda" className="scroll-mt-20 bg-surface">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase text-primary">
            <MapPin size={12} />
            Untuk warga RW 06 Parakan Saat
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
            alt="Warga RW 06 Parakan Saat bergotong royong membersihkan lingkungan"
            width={640}
            height={560}
            priority
            className="h-80 w-full rounded-3xl object-cover sm:h-90 md:h-100"
          />
          <Suspense fallback={<HeroHighlightCard {...PREVIEW_HERO_CARD} />}>
            <LiveHeroHighlightCard />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
