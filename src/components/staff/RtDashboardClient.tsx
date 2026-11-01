"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Files,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Star,
  X,
  XCircle,
} from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";
import Badge from "@/components/ui/Badge";
import { rejectTicket, verifyTicket } from "@/app/actions/tickets";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import { statusLabelId } from "@/utils/transition";
import type { TicketStatus } from "@/types";
import type {
  StaffAttachmentItem,
  StaffContextData,
  StaffTicketItem,
} from "@/data/staff-preview";

const STATUS_FILTER_OPTIONS: TicketStatus[] = [
  "terkirim",
  "diverifikasi_rt",
  "diproses_rw",
  "selesai",
  "ditolak",
];

function formatBytesMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

function shortTicketCode(ticketNumber: string): string {
  const parts = ticketNumber.split("-");
  return `#${parts[parts.length - 1] ?? ticketNumber}`;
}

function StaffAttachmentThumb({
  attachment,
  onOpen,
}: {
  attachment: StaffAttachmentItem;
  onOpen: (url: string, fileName: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const resolvedUrl = attachment.previewUrl || signedUrl;

  useEffect(() => {
    if (
      attachment.previewUrl ||
      !attachment.storagePath ||
      !isSupabaseConfigured()
    ) {
      return;
    }
    let active = true;
    const supabase = createClient();
    supabase.storage
      .from("ticket-attachments")
      .createSignedUrl(attachment.storagePath, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      });
    return () => {
      active = false;
    };
  }, [attachment.previewUrl, attachment.storagePath]);

  return (
    <div className="mt-4 flex items-center gap-3.5">
      {resolvedUrl ? (
        <button
          type="button"
          onClick={() => onOpen(resolvedUrl, attachment.fileName)}
          className="h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-surface"
        >
          <Image
            src={resolvedUrl}
            alt={attachment.fileName}
            width={120}
            height={84}
            unoptimized={!resolvedUrl.startsWith("/")}
            className="h-full w-full scale-[1.05] object-cover"
          />
        </button>
      ) : (
        <div
          aria-busy="true"
          className="h-16 w-24 shrink-0 animate-pulse rounded-xl bg-slate-200/80"
        />
      )}
      <div>
        <p className="text-xs font-bold text-ink">{attachment.fileName}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {formatBytesMb(attachment.sizeBytes)}
        </p>
        {resolvedUrl ? (
          <button
            type="button"
            onClick={() => onOpen(resolvedUrl, attachment.fileName)}
            className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Lihat foto lengkap →
          </button>
        ) : (
          <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200/80" />
        )}
      </div>
    </div>
  );
}

export default function RtDashboardClient({
  initialData,
}: {
  initialData: StaffContextData;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<StaffTicketItem[]>(
    initialData.tickets,
  );
  const [stats, setStats] = useState(initialData.stats);
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setTickets(initialData.tickets);
    setStats(initialData.stats);
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const [selectedId, setSelectedId] = useState<number>(
    initialData.tickets[0]?.id ?? 0,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? tickets[0] ?? null,
    [tickets, selectedId],
  );

  const [rtNotes, setRtNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [t.id, t.defaultRtNote]),
    ),
  );
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>(
    {},
  );
  const [feedback, setFeedback] = useState<{
    ticketId: number;
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const inspectionRef = useRef<HTMLElement>(null);
  const rejectInputRef = useRef<HTMLTextAreaElement>(null);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  const waitingTickets = useMemo(
    () => tickets.filter((t) => t.status === "terkirim"),
    [tickets],
  );

  const handleSelectTicket = (ticket: StaffTicketItem) => {
    setSelectedId(ticket.id);
    setFeedback(null);
    inspectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  // Eksekusi langsung tanpa dialog konfirmasi (sesuai instruksi)
  const handleVerify = () => {
    if (!selectedTicket || selectedTicket.status !== "terkirim") return;
    const currentId = selectedTicket.id;
    const noteText =
      (rtNotes[currentId] ?? "").trim() || selectedTicket.defaultRtNote;
    setFeedback(null);

    startTransition(async () => {
      const res = await verifyTicket(currentId, noteText);
      if (!res.success) {
        setFeedback({
          ticketId: currentId,
          type: "error",
          text: res.error,
        });
        return;
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === currentId ? { ...t, status: "diverifikasi_rt" } : t,
        ),
      );
      setStats((prev) => ({
        ...prev,
        terkirim: Math.max(0, prev.terkirim - 1),
        diverifikasi_rt: prev.diverifikasi_rt + 1,
      }));
      setFeedback({
        ticketId: currentId,
        type: "success",
        text: `Laporan #${selectedTicket.ticketNumber} berhasil diverifikasi dan diteruskan ke RW beserta catatan.`,
      });
    });
  };

  // Eksekusi tolak langsung tanpa dialog konfirmasi
  const handleReject = () => {
    if (!selectedTicket || selectedTicket.status !== "terkirim") return;
    const currentId = selectedTicket.id;
    const reason = (rejectReasons[currentId] ?? "").trim();

    if (reason.length < 5) {
      setFeedback({
        ticketId: currentId,
        type: "error",
        text: "Alasan penolakan wajib diisi minimal 5 karakter.",
      });
      rejectInputRef.current?.focus();
      return;
    }

    setFeedback(null);
    const formData = new FormData();
    formData.set("ticket_id", String(currentId));
    formData.set("reason", reason);

    startTransition(async () => {
      const res = await rejectTicket(formData);
      if (!res.success) {
        setFeedback({
          ticketId: currentId,
          type: "error",
          text: res.error,
        });
        return;
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === currentId
            ? { ...t, status: "ditolak", rejectionReason: reason }
            : t,
        ),
      );
      setStats((prev) => ({
        ...prev,
        terkirim: Math.max(0, prev.terkirim - 1),
        ditolak: prev.ditolak + 1,
      }));
      setFeedback({
        ticketId: currentId,
        type: "success",
        text: `Laporan #${selectedTicket.ticketNumber} telah ditolak dan alasan dikirim ke warga.`,
      });
    });
  };

  const greetingFirstName =
    initialData.fullName.trim().split(/\s+/)[0] || "Pengurus";
  const reportAttachmentsList =
    selectedTicket && selectedTicket.reportAttachments.length > 0
      ? selectedTicket.reportAttachments
      : initialData.isPreview
        ? [
            {
              id: 0,
              type: "laporan" as const,
              fileName: "kondisi-gang-melati.jpg",
              sizeBytes: Math.round(1.8 * 1024 * 1024),
              previewUrl: "/dummysampah.jpg",
            },
          ]
        : [];

  return (
    <StaffShell
      role="ketua_rt"
      fullName={initialData.fullName}
      subHeaderLabel={`${initialData.regionName} / RW ${initialData.rw}`}
      unreadCount={waitingTickets.length || initialData.unreadCount}
    >
      <div id="ringkasan" className="scroll-mt-20 space-y-6">
        {/* Header Sapaan */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            WILAYAH {initialData.regionName} / RW {initialData.rw}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Selamat pagi, Pak {greetingFirstName}.
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pastikan laporan warga terverifikasi dan sampai ke pengurus RW.
          </p>
        </div>

        {/* Banner Informasi Laporan Baru */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/75 px-4 py-3.5">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            {waitingTickets.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-primary">
                  {waitingTickets.length} laporan baru menunggu pemeriksaan
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {waitingTickets
                    .slice(0, 2)
                    .map(
                      (t) =>
                        `Tiket ${shortTicketCode(t.ticketNumber)} dari ${t.reporterName.split(" ")[0]}`,
                    )
                    .join(" dan ")}{" "}
                  masuk hari ini. Tinjau kelengkapan dan lokasi laporan.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-primary">
                  Seluruh laporan terbaru sudah diperiksa
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Terima kasih, tidak ada laporan baru yang tertunda pada
                  antrean {initialData.regionName}.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 4 Kartu Statistik RT */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Laporan {initialData.regionName}
              </span>
              <Files size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.total}</p>
            <p className="mt-2 text-[11px] text-muted">Oktober 2026</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Menunggu verifikasi
              </span>
              <Clock size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.terkirim}</p>
            <p className="mt-2 text-[11px] text-muted">Status Terkirim</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Diverifikasi RT
              </span>
              <ClipboardCheck size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">
              {stats.diverifikasi_rt}
            </p>
            <p className="mt-2 text-[11px] text-muted">
              Menunggu tindak lanjut RW
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Selesai</span>
              <CheckCircle2 size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.selesai}</p>
            <p className="mt-2 text-[11px] text-muted">
              {stats.diproses_rw} diproses • {stats.ditolak} ditolak
            </p>
          </div>
        </div>

        {/* Kartu Tabel: Antrean Verifikasi RT */}
        <section
          id="antrean-verifikasi"
          className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">
                Antrean verifikasi {initialData.regionName}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Hanya pengaduan dari wilayah Anda yang ditampilkan.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isRefreshing || isPending}
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
              <span className="shrink-0 text-xs font-semibold text-primary">
                {stats.terkirim} menunggu
              </span>
            </div>
          </div>

          {/* Pencarian & Filter */}
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
                aria-label="Filter status laporan"
                className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pr-4 pl-8 text-xs font-semibold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Semua status</option>
                {STATUS_FILTER_OPTIONS.map((st) => (
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

          {/* Tabel Antrean */}
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
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3.5 py-8 text-center text-xs text-muted"
                    >
                      Tidak ada laporan yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const isSelected = selectedTicket?.id === ticket.id;
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/40" : "hover:bg-surface/60"
                        }`}
                      >
                        <td className="px-3.5 py-3.5 align-middle text-xs font-semibold text-primary whitespace-nowrap">
                          {ticket.ticketNumber}
                        </td>
                        <td className="px-3.5 py-3.5 align-middle">
                          <p className="text-xs font-semibold text-ink sm:text-[13px]">
                            {ticket.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted">
                            {ticket.categoryName} • {ticket.regionName} •{" "}
                            {ticket.reporterName}
                          </p>
                        </td>
                        <td className="px-3.5 py-3.5 align-middle text-xs text-muted whitespace-nowrap">
                          {ticket.dateShort}
                        </td>
                        <td className="px-3.5 py-3.5 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            <Badge status={ticket.status} dot />
                            {ticket.rating ? (
                              <div
                                className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50/70 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
                                title={ticket.ratingComment ?? undefined}
                              >
                                <Star
                                  size={11}
                                  className="fill-amber-400 text-amber-400"
                                />
                                <span>{ticket.rating}/5</span>
                                {ticket.ratingComment && (
                                  <span className="max-w-[120px] truncate font-normal text-amber-900/80">
                                    • “{ticket.ratingComment}”
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTicket(ticket);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary whitespace-nowrap hover:underline"
                          >
                            Periksa
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 border-t border-border/70 pt-3.5 text-xs text-muted">
            {filteredTickets.length} laporan terbaru dari {stats.terkirim} yang
            menunggu verifikasi.
          </div>
        </section>

        {/* Kartu Pemeriksaan Laporan Dinamis */}
        {selectedTicket && (
          <section
            ref={inspectionRef}
            id="pemeriksaan-laporan"
            className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
          >
            <div>
              <h2 className="text-base font-bold text-ink">
                Pemeriksaan laporan #{selectedTicket.ticketNumber}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Terkirim pada {selectedTicket.submittedFullLabel}
              </p>
            </div>

            <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.08fr_1fr]">
              {/* Kiri: Detail Laporan Warga */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={selectedTicket.status} dot />
                  {selectedTicket.rating && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      <Star
                        size={12}
                        className="fill-amber-400 text-amber-400"
                      />
                      <span>Rating Warga: {selectedTicket.rating}/5</span>
                    </div>
                  )}
                </div>

                <h3 className="mt-3.5 text-xl font-bold tracking-tight text-ink">
                  {selectedTicket.title}
                </h3>

                <p className="mt-1.5 text-xs text-muted">
                  {selectedTicket.reporterName} • {selectedTicket.regionName} •{" "}
                  {selectedTicket.categoryName}
                </p>

                <p className="mt-4 text-xs leading-relaxed text-ink sm:text-[13px]">
                  {selectedTicket.description}
                </p>

                <p className="mt-4 text-xs text-muted">
                  Lokasi: {selectedTicket.locationLandmark}
                </p>

                {selectedTicket.rating && (
                  <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <Star
                        size={13}
                        className="fill-amber-400 text-amber-400"
                      />
                      <span>
                        Penilaian Warga ({selectedTicket.rating}/5 Bintang)
                      </span>
                    </div>
                    {selectedTicket.ratingComment && (
                      <p className="mt-1 text-xs italic text-ink/85">
                        “{selectedTicket.ratingComment}”
                      </p>
                    )}
                  </div>
                )}

                {/* Lampiran Foto (hingga 3 foto) */}
                {reportAttachmentsList.length > 0 ? (
                  <div className="space-y-1">
                    {reportAttachmentsList.map((att) => (
                      <StaffAttachmentThumb
                        key={att.id}
                        attachment={att}
                        onOpen={(url, fileName) =>
                          setLightbox({ url, fileName })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-surface px-3.5 py-2.5 text-xs text-muted">
                    Tidak ada foto lampiran pada laporan ini.
                  </p>
                )}

                {selectedTicket.status === "ditolak" &&
                  selectedTicket.rejectionReason && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <span className="font-semibold">Alasan penolakan: </span>
                      {selectedTicket.rejectionReason}
                    </div>
                  )}
              </div>

              {/* Kanan: Panel Hasil Pemeriksaan RT */}
              <div className="rounded-2xl border border-border/70 bg-surface/80 p-5">
                <h3 className="text-sm font-bold text-ink">Hasil pemeriksaan</h3>
                <p className="mt-1 text-xs text-muted">
                  Pastikan lokasi di {selectedTicket.regionName}, isi laporan
                  jelas, dan foto sesuai kejadian.
                </p>

                {feedback && feedback.ticketId === selectedTicket.id && (
                  <div
                    className={`mt-3.5 flex items-start gap-2 rounded-xl border p-3 text-xs ${
                      feedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2
                        size={15}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                    ) : (
                      <AlertCircle
                        size={15}
                        className="mt-0.5 shrink-0 text-red-600"
                      />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="mt-4">
                  <label
                    htmlFor="rt_note"
                    className="block text-xs font-semibold text-ink"
                  >
                    Catatan untuk RW (opsional)
                  </label>
                  <textarea
                    id="rt_note"
                    rows={3}
                    disabled={selectedTicket.status !== "terkirim" || isPending}
                    value={rtNotes[selectedTicket.id] ?? ""}
                    onChange={(e) =>
                      setRtNotes((prev) => ({
                        ...prev,
                        [selectedTicket.id]: e.target.value,
                      }))
                    }
                    placeholder="Tambahkan catatan lokasi atau konteks untuk pengurus RW..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-surface"
                  />
                </div>

                <button
                  type="button"
                  disabled={selectedTicket.status !== "terkirim" || isPending}
                  onClick={handleVerify}
                  className="mt-3.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  {isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Verifikasi & teruskan ke RW
                </button>

                <p className="mt-2 text-[11px] text-muted">
                  Status menjadi Diverifikasi RT. RW menerima laporan untuk
                  ditindaklanjuti.
                </p>

                <div className="my-4 h-px bg-border" />

                <p className="text-xs font-bold text-ink">
                  Jika laporan tidak valid
                </p>

                <div className="mt-2.5">
                  <label
                    htmlFor="reject_reason"
                    className="block text-xs font-semibold text-ink"
                  >
                    Alasan penolakan <span className="text-ink">*</span>
                  </label>
                  <textarea
                    ref={rejectInputRef}
                    id="reject_reason"
                    rows={3}
                    disabled={selectedTicket.status !== "terkirim" || isPending}
                    value={rejectReasons[selectedTicket.id] ?? ""}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({
                        ...prev,
                        [selectedTicket.id]: e.target.value,
                      }))
                    }
                    placeholder="Wajib diisi jika laporan ditolak"
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs leading-relaxed text-ink placeholder:text-muted focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-surface"
                  />
                </div>

                <button
                  type="button"
                  disabled={selectedTicket.status !== "terkirim" || isPending}
                  onClick={handleReject}
                  className="mt-3.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/75 px-4 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100/80 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                >
                  <XCircle size={15} />
                  Tolak laporan
                </button>

                <p className="mt-2 text-[11px] text-muted">
                  Alasan akan terlihat oleh warga pada detail tiket.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Banner Batas Kewenangan Ketua RT */}
        <div
          id="batas-kewenangan"
          className="scroll-mt-20 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/75 px-4 py-3.5"
        >
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-primary">
              Batas kewenangan Ketua RT
            </p>
            <p className="mt-0.5 text-xs text-muted">
              RT memverifikasi atau menolak laporan wilayahnya. Tindak lanjut,
              pembaruan Diproses RW, dan penyelesaian dilakukan oleh RW atau
              Admin.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Pratinjau Foto Lengkap */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs"
          onClick={() => setLightbox(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-ink">{lightbox.fileName}</p>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Tutup foto"
                className="cursor-pointer rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.fileName}
              className="max-h-[70vh] w-full rounded-xl object-contain bg-surface"
            />
          </div>
        </div>
      )}
    </StaffShell>
  );
}
