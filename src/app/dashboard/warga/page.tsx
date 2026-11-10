import { Suspense } from "react";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
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
import { WargaGreetingHeader } from "@/components/ui/LocalTimeGreeting";
import { WargaDashboardSkeleton } from "@/components/ui/Skeleton";
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
import { siteConfig } from "@/config/site";
import type { Notification } from "@/types";

export const metadata: Metadata = {
  title: `Ruang Layanan Warga — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Ringkasan dan pemantauan pengaduan warga ${siteConfig.rwLabel}.`,
};

const EMPTY_STATS: DashboardStats = {
  total: 0,
  draft: 0,
  terkirim: 0,
  diverifikasi_rt: 0,
  diproses_rw: 0,
  selesai: 0,
  ditolak: 0,
};

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
      <div id="ringkasan" className="scroll-mt-20 space-y-6">
        {/* Baris Sapaan & Tombol Buat Pengaduan */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <WargaGreetingHeader
            fullName={userCtx.profile.full_name}
            isPreview={userCtx.isPreview}
          />

          {userCtx.profile.is_rt_verified ? (
            <Link
              href="/tickets/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:self-auto sm:text-sm"
            >
              <Plus size={16} />
              Buat pengaduan
            </Link>
          ) : (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <Link
                href="/tickets/new"
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 sm:self-auto sm:text-sm"
              >
                <Clock size={16} />
                Menunggu persetujuan
              </Link>
              <span className="text-[11px] text-muted">
                Persetujuan RT / RW / Admin diperlukan
              </span>
            </div>
          )}
        </div>

        {/* Banner Akun Menunggu Persetujuan */}
        {!userCtx.profile.is_rt_verified && (
          <div className="flex flex-col items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs sm:flex-row">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">
                  Akun Menunggu Persetujuan Pengurus
                </h3>
                <span className="inline-flex items-center rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                  Menunggu Verifikasi
                </span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800">
                Pendaftaran akun Anda di <strong>{regionLabel}</strong> telah tercatat dan saat ini sedang menunggu verifikasi dari <strong>Ketua RT {userCtx.region.name}</strong>, <strong>Ketua {siteConfig.rwShortLabel}</strong>, atau <strong>Admin</strong>. Fitur pembuatan pengaduan baru akan otomatis terbuka setelah akun Anda disetujui.
              </p>
            </div>
          </div>
        )}

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
              href="/bantuan#panduan-warga"
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

  await connection();

  const [userCtx, stats, ticketsRes, notifRes] = await Promise.all([
    getWargaUserContext(),
    getDashboardStats().catch((err) => {
      unstable_rethrow(err);
      return EMPTY_STATS;
    }),
    getTickets({ limit: 50 }).catch((err) => {
      unstable_rethrow(err);
      return {
        tickets: [] as TicketListItem[],
        total: 0,
      };
    }),
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
    <Suspense fallback={<WargaDashboardSkeleton />}>
      <LiveWargaDashboard />
    </Suspense>
  );
}
