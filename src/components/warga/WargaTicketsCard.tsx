"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, RefreshCw, Search, Star } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { statusLabelId } from "@/utils/transition";
import type { TicketStatus } from "@/types";
import type { TicketListItem } from "@/data/tickets";

const STATUS_OPTIONS: TicketStatus[] = [
  "terkirim",
  "diverifikasi_rt",
  "diproses_rw",
  "selesai",
  "ditolak",
  "draft",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatDateShortId(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function WargaTicketsCard({
  tickets,
  reporterName,
}: {
  tickets: TicketListItem[];
  reporterName: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      const ticketNo = (t.ticket_number ?? "draf").toLowerCase();
      const cat = (t.categories?.name ?? "").toLowerCase();
      return (
        ticketNo.includes(q) ||
        t.title.toLowerCase().includes(q) ||
        cat.includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  return (
    <section
      id="pengaduan-saya"
      className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Pengaduan saya</h2>
          <p className="mt-0.5 text-xs text-muted">
            Semua pembaruan laporan Anda, dalam satu tempat.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              className={
                isRefreshing ? "animate-spin text-primary" : "text-primary"
              }
            />
            <span>{isRefreshing ? "Memuat..." : "Refresh"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
            className="shrink-0 cursor-pointer text-xs font-semibold text-primary hover:underline"
          >
            Lihat semua
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Filter Status */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor tiket atau laporan..."
            className="w-full rounded-xl border border-border bg-white py-2.5 pr-3.5 pl-9 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="relative sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter status pengaduan"
            className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pr-9 pl-8 text-xs font-semibold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {statusLabelId(st)}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary"
          />
        </div>
      </div>

      {/* Tabel Pengaduan */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="bg-surface/90 text-[10px] font-semibold uppercase tracking-wider text-muted">
              <th className="rounded-l-lg px-3.5 py-2.5">Nomor Tiket</th>
              <th className="px-3.5 py-2.5">Laporan / Wilayah</th>
              <th className="px-3.5 py-2.5">Tanggal</th>
              <th className="px-3.5 py-2.5">Status &amp; Rating</th>
              <th className="rounded-r-lg px-3.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3.5 py-10 text-center text-xs text-muted"
                >
                  Belum ada pengaduan yang sesuai dengan pencarian Anda.
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => {
                const hasRejection =
                  ticket.status === "ditolak" && Boolean(ticket.rejection_reason);

                return (
                  <Fragment key={ticket.id}>
                    <tr
                      className={
                        hasRejection
                          ? "border-b-0 transition-colors hover:bg-surface/50"
                          : "transition-colors hover:bg-surface/50"
                      }
                    >
                      <td className="px-3.5 py-3.5 align-middle text-xs font-semibold text-primary whitespace-nowrap">
                        {ticket.ticket_number ?? `DRAF-${ticket.id}`}
                      </td>
                      <td className="px-3.5 py-3.5 align-middle">
                        <p className="text-xs font-semibold text-ink sm:text-[13px]">
                          {ticket.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {ticket.categories?.name ?? "Umum"} •{" "}
                          {ticket.regions?.name ?? "RT -"} • {reporterName}
                        </p>
                      </td>
                      <td className="px-3.5 py-3.5 align-middle text-xs text-muted whitespace-nowrap">
                        {formatDateShortId(
                          ticket.submitted_at ?? ticket.created_at,
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <Badge status={ticket.status} dot />
                          {ticket.rating ? (
                            <div
                              className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50/70 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
                              title={ticket.rating_comment ?? undefined}
                            >
                              <Star
                                size={11}
                                className="fill-amber-400 text-amber-400"
                              />
                              <span>{ticket.rating}/5</span>
                              {ticket.rating_comment && (
                                <span className="max-w-[130px] truncate font-normal text-amber-900/80">
                                  • “{ticket.rating_comment}”
                                </span>
                              )}
                            </div>
                          ) : ticket.status === "selesai" ? (
                            <span className="text-[10px] font-medium text-muted">
                              Belum dinilai
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 align-middle">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary whitespace-nowrap hover:underline"
                        >
                          Lihat detail
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                    {hasRejection && (
                      <tr className="border-t-0">
                        <td
                          colSpan={5}
                          className="px-3.5 pt-0 pb-3.5 text-xs text-red-600"
                        >
                          Alasan penolakan: {ticket.rejection_reason}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Tabel */}
      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3.5 text-xs text-muted">
        <span>
          Menampilkan {filtered.length} dari {tickets.length} pengaduan
        </span>
        <span className="font-semibold text-primary">Halaman 1</span>
      </div>
    </section>
  );
}
