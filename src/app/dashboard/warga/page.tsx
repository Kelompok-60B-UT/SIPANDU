import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Files,
  Plus,
  Wrench,
} from "lucide-react";
import WargaShell from "@/components/warga/WargaShell";
import WargaTicketsCard from "@/components/warga/WargaTicketsCard";
import NotificationsCard from "@/components/warga/NotificationsCard";
import { listNotifications } from "@/app/actions/profile";
import {
  getDashboardStats,
  getTickets,
  type DashboardStats,
  type TicketListItem,
} from "@/data/tickets";
import {
  getWargaUserContext,
  PREVIEW_NOTIFICATIONS,
  PREVIEW_STATS,
  PREVIEW_TICKETS,
  PREVIEW_USER,
  type WargaUserContext,
} from "@/data/warga-preview";
import { roleLabelId } from "@/utils/roles";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import type { Notification } from "@/types";

export const metadata: Metadata = {
  title: "Ruang Layanan Warga — SIPANDU RW 06 Parakansaat",
  description: "Ringkasan dan pemantauan pengaduan warga RW 06 Parakansaat.",
};

const DAYS_ID = [
  "MINGGU",
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
];

const MONTHS_ID = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
];

function formatBannerDate(isPreview: boolean): string {
  if (isPreview) return "SABTU, 31 OKTOBER 2026";
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${DAYS_ID[now.getUTCDay()]}, ${now.getUTCDate()} ${MONTHS_ID[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
}

function formatGreeting(fullName: string, isPreview: boolean): string {
  if (isPreview) return "Selamat pagi, Bu Dewi 👋";
  const firstName = fullName.trim().split(/\s+/)[0] || "Warga";
  return `Selamat pagi, ${firstName} 👋`;
}

function DashboardView({
  userCtx,
  stats,
  tickets,
  notifications,
}: {
  userCtx: WargaUserContext;
  stats: DashboardStats;
  tickets: TicketListItem[];
  notifications: Notification[];
}) {
  const roleLabel = roleLabelId(userCtx.role);
  const regionLabel = `${userCtx.region.name} / RW ${userCtx.region.rw}`;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const latestCompleted = tickets.find((t) => t.status === "selesai");
  const inProgressTotal = stats.diverifikasi_rt + stats.diproses_rw;
  const submittedTotal = stats.total - stats.draft;

  return (
    <WargaShell
      activeMenu="ringkasan"
      fullName={userCtx.profile.full_name}
      roleLabel={roleLabel}
      regionLabel={regionLabel}
      unreadCount={unreadCount}
    >
      <div className="space-y-6">
        {/* Baris Sapaan & Tombol Buat Pengaduan */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {formatBannerDate(userCtx.isPreview)}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
              {formatGreeting(userCtx.profile.full_name, userCtx.isPreview)}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Terima kasih sudah ikut menjaga lingkungan kita.
            </p>
          </div>

          <Link
            href="/tickets/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:self-auto sm:text-sm"
          >
            <Plus size={16} />
            Buat pengaduan
          </Link>
        </div>

        {/* Banner Hijau Pengaduan Selesai */}
        {latestCompleted && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/75 px-4 py-3.5">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                Pengaduan Anda sudah selesai
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/90">
                {userCtx.isPreview
                  ? "Saluran air Gang Melati telah dibersihkan. Lihat bukti penyelesaian pada tiket PG-2026-0261."
                  : `${latestCompleted.title} telah diselesaikan. Lihat bukti penyelesaian pada tiket ${latestCompleted.ticket_number ?? `#${latestCompleted.id}`}.`}
              </p>
            </div>
          </div>
        )}

        {/* 4 Kartu Statistik Ringkasan */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Total pengaduan
              </span>
              <Files size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{submittedTotal}</p>
            <p className="mt-2 text-[11px] text-muted">Seluruh laporan Anda</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Menunggu RT</span>
              <Clock size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.terkirim}</p>
            <p className="mt-2 text-[11px] text-muted">Status Terkirim</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Dalam penanganan
              </span>
              <Wrench size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">
              {inProgressTotal}
            </p>
            <p className="mt-2 text-[11px] text-muted">
              {stats.diverifikasi_rt} diverifikasi • {stats.diproses_rw} diproses
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Selesai</span>
              <CheckCircle2 size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.selesai}</p>
            <p className="mt-2 text-[11px] text-muted">
              {stats.ditolak > 0
                ? `${stats.ditolak} lainnya Ditolak`
                : "Laporan tuntas ditangani"}
            </p>
          </div>
        </div>

        {/* Tabel Pengaduan Saya */}
        <WargaTicketsCard
          tickets={tickets}
          reporterName={userCtx.profile.full_name}
        />

        {/* Baris Bawah: Notifikasi Terbaru & Panduan Pengaduan */}
        <div className="grid gap-5 lg:grid-cols-2">
          <NotificationsCard initialNotifications={notifications} />

          <div className="flex flex-col justify-between rounded-2xl border border-blue-100/90 bg-blue-50/60 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold text-ink">
                Laporan yang jelas, respons lebih tepat
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Sertakan lokasi yang mudah ditemukan, ceritakan kejadiannya, dan
                unggah foto yang relevan. Hindari data pribadi orang lain.
              </p>
            </div>

            <Link
              href="/#cara-mengadu"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <BookOpen size={15} />
              <span>Baca panduan pengaduan</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </WargaShell>
  );
}

async function LiveWargaDashboard() {
  if (!isSupabaseConfigured()) {
    return (
      <DashboardView
        userCtx={PREVIEW_USER}
        stats={PREVIEW_STATS}
        tickets={PREVIEW_TICKETS}
        notifications={PREVIEW_NOTIFICATIONS}
      />
    );
  }

  const [userCtx, stats, ticketsRes, notifRes] = await Promise.all([
    getWargaUserContext(),
    getDashboardStats().catch(() => PREVIEW_STATS),
    getTickets({ limit: 50 }).catch(() => ({
      tickets: PREVIEW_TICKETS,
      total: PREVIEW_TICKETS.length,
    })),
    listNotifications(),
  ]);

  if (userCtx.isPreview) {
    return (
      <DashboardView
        userCtx={PREVIEW_USER}
        stats={PREVIEW_STATS}
        tickets={PREVIEW_TICKETS}
        notifications={PREVIEW_NOTIFICATIONS}
      />
    );
  }

  return (
    <DashboardView
      userCtx={userCtx}
      stats={stats}
      tickets={ticketsRes.tickets}
      notifications={notifRes.success ? notifRes.data : []}
    />
  );
}

export default function WargaDashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardView
          userCtx={PREVIEW_USER}
          stats={PREVIEW_STATS}
          tickets={PREVIEW_TICKETS}
          notifications={PREVIEW_NOTIFICATIONS}
        />
      }
    >
      <LiveWargaDashboard />
    </Suspense>
  );
}
