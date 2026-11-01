"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Files,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";
import Badge from "@/components/ui/Badge";
import RekapDownloadButton from "@/components/common/RekapDownloadButton";
import { completeTicket, processTicket } from "@/app/actions/tickets";
import {
  deleteAttachment,
  uploadAttachment,
} from "@/app/actions/attachments";
import { isSupabaseConfigured } from "@/utils/supabase/client";
import { statusLabelId } from "@/utils/transition";
import { validateAttachment } from "@/utils/upload";
import type { TicketStatus } from "@/types";
import type {
  StaffAttachmentItem,
  StaffContextData,
  StaffTicketItem,
} from "@/data/staff-preview";

const STATUS_FILTER_OPTIONS: TicketStatus[] = [
  "diverifikasi_rt",
  "diproses_rw",
  "selesai",
  "terkirim",
  "ditolak",
];

const RT_FILTER_OPTIONS = [
  "RT 01",
  "RT 02",
  "RT 03",
  "RT 04",
  "RT 05",
  "RT 06",
  "RT 07",
  "RT 08",
];

function formatBytesMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

function shortTicketCode(ticketNumber: string): string {
  const parts = ticketNumber.split("-");
  return `#${parts[parts.length - 1] ?? ticketNumber}`;
}

export default function RwDashboardClient({
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

  // Pilih default #PG-2026-0264 sesuai desain (atau tiket pertama)
  const defaultSelected =
    initialData.tickets.find((t) => t.id === 264) ?? initialData.tickets[0];
  const [selectedId, setSelectedId] = useState<number>(
    defaultSelected?.id ?? 0,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rtFilter, setRtFilter] = useState<string>("");

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? tickets[0] ?? null,
    [tickets, selectedId],
  );

  const [targetStatuses, setTargetStatuses] = useState<
    Record<number, "diproses_rw" | "selesai">
  >(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [
        t.id,
        t.status === "diverifikasi_rt" ? "diproses_rw" : "selesai",
      ]),
    ),
  );

  const [rwNotes, setRwNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [t.id, t.defaultRwNote]),
    ),
  );

  const [proofFiles, setProofFiles] = useState<
    Record<number, StaffAttachmentItem[]>
  >(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [t.id, t.proofAttachments ?? []]),
    ),
  );

  const [savedIds, setSavedIds] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<{
    ticketId: number;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [latestCompletedMsg, setLatestCompletedMsg] = useState(() => {
    if (initialData.isPreview) {
      return "Tiket #0261 selesai pada 30 Oktober pukul 15.30. Bukti pembersihan saluran sudah tersedia untuk warga.";
    }
    const latestDone = initialData.tickets.find((t) => t.status === "selesai");
    if (latestDone) {
      return `Tiket ${shortTicketCode(latestDone.ticketNumber)} (${latestDone.title}) telah selesai ditangani.`;
    }
    return "Belum ada laporan yang diselesaikan baru-baru ini.";
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const updatePanelRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (rtFilter && t.regionName !== rtFilter) return false;
      if (!q) return true;
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter, rtFilter]);

  const newestVerified = useMemo(
    () => tickets.find((t) => t.status === "diverifikasi_rt") ?? null,
    [tickets],
  );

  const completionPercent =
    stats.total > 0 ? Math.round((stats.selesai / stats.total) * 100) : 0;

  const handleSelectTicket = (ticket: StaffTicketItem) => {
    setSelectedId(ticket.id);
    setFeedback(null);
    updatePanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const handleProofFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedTicket) return;
    setFeedback(null);

    const currentId = selectedTicket.id;
    const existingList = proofFiles[currentId] ?? [];
    if (existingList.length >= 3) {
      setFeedback({
        ticketId: currentId,
        type: "error",
        text: "Maksimal 3 foto bukti penyelesaian yang dapat dilampirkan.",
      });
      return;
    }

    const check = validateAttachment(file);
    if (!check.valid) {
      setFeedback({
        ticketId: currentId,
        type: "error",
        text: check.error ?? "File tidak valid",
      });
      return;
    }

    const localUrl = URL.createObjectURL(file);

    if (isSupabaseConfigured()) {
      setUploadingPhoto(true);
      try {
        const fd = new FormData();
        fd.set("ticket_id", String(currentId));
        fd.set("type", "penyelesaian");
        fd.set("file", file);

        const uploadRes = await uploadAttachment(fd);
        if (!uploadRes.success) throw new Error(uploadRes.error);

        const newItem: StaffAttachmentItem = {
          id: uploadRes.data.id,
          type: "penyelesaian",
          fileName: file.name,
          sizeBytes: file.size,
          previewUrl: uploadRes.data.signedUrl || localUrl,
          storagePath: uploadRes.data.storagePath,
        };

        setProofFiles((prev) => ({
          ...prev,
          [currentId]: [...(prev[currentId] ?? []), newItem],
        }));
        setSavedIds((prev) => ({ ...prev, [currentId]: false }));
      } catch (errObj) {
        setFeedback({
          ticketId: currentId,
          type: "error",
          text:
            errObj instanceof Error
              ? errObj.message
              : "Gagal mengunggah foto bukti",
        });
      } finally {
        setUploadingPhoto(false);
      }
      return;
    }

    // Mode pratinjau FE
    const newItem: StaffAttachmentItem = {
      id: Date.now(),
      type: "penyelesaian",
      fileName: file.name,
      sizeBytes: file.size,
      previewUrl: localUrl,
    };
    setProofFiles((prev) => ({
      ...prev,
      [currentId]: [...(prev[currentId] ?? []), newItem],
    }));
    setSavedIds((prev) => ({ ...prev, [currentId]: false }));
  };

  const handleRemoveProofPhoto = (ticketId: number, attachmentId: number) => {
    setFeedback(null);
    if (isSupabaseConfigured() && attachmentId > 0) {
      startTransition(async () => {
        const res = await deleteAttachment(attachmentId);
        if (!res.success) {
          setFeedback({
            ticketId,
            type: "error",
            text: res.error,
          });
          return;
        }
        setProofFiles((prev) => ({
          ...prev,
          [ticketId]: (prev[ticketId] ?? []).filter(
            (item) => item.id !== attachmentId,
          ),
        }));
      });
      return;
    }

    setProofFiles((prev) => ({
      ...prev,
      [ticketId]: (prev[ticketId] ?? []).filter(
        (item) => item.id !== attachmentId,
      ),
    }));
  };

  // Eksekusi langsung tanpa dialog konfirmasi (sesuai instruksi)
  const handleSaveUpdate = () => {
    if (!selectedTicket) return;
    const currentId = selectedTicket.id;
    const nextStatus =
      targetStatuses[currentId] ??
      (selectedTicket.status === "diverifikasi_rt" ? "diproses_rw" : "selesai");
    const note = (rwNotes[currentId] ?? "").trim();
    const proofs = proofFiles[currentId] ?? [];

    if (!note) {
      setFeedback({
        ticketId: currentId,
        type: "error",
        text: "Catatan penanganan / penyelesaian wajib diisi.",
      });
      return;
    }

    if (nextStatus === "selesai" && proofs.length === 0) {
      setFeedback({
        ticketId: currentId,
        type: "error",
        text: "Minimal 1 foto bukti penyelesaian wajib diunggah sebelum menyelesaikan tiket.",
      });
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const prevStatus = selectedTicket.status;

      if (nextStatus === "diproses_rw" && prevStatus === "diverifikasi_rt") {
        const res = await processTicket(currentId, note);
        if (!res.success) {
          setFeedback({ ticketId: currentId, type: "error", text: res.error });
          return;
        }
      } else if (nextStatus === "selesai") {
        if (prevStatus === "diverifikasi_rt") {
          const step1 = await processTicket(currentId, note);
          if (!step1.success) {
            setFeedback({
              ticketId: currentId,
              type: "error",
              text: step1.error,
            });
            return;
          }
        }
        if (prevStatus !== "selesai") {
          const res = await completeTicket(currentId, note);
          if (!res.success) {
            setFeedback({
              ticketId: currentId,
              type: "error",
              text: res.error,
            });
            return;
          }
        }
      }

      const nowLabel = "Baru saja";

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== currentId) return t;
          return {
            ...t,
            status: nextStatus,
            proofAttachments: proofs,
            timeline: [
              ...t.timeline,
              {
                id: Date.now(),
                status: nextStatus,
                dateLabel: nowLabel,
                actorNote: note,
              },
            ],
          };
        }),
      );

      if (prevStatus !== nextStatus) {
        setStats((prev) => {
          const copy = { ...prev };
          if (prevStatus === "diverifikasi_rt") {
            copy.diverifikasi_rt = Math.max(0, copy.diverifikasi_rt - 1);
          } else if (prevStatus === "diproses_rw") {
            copy.diproses_rw = Math.max(0, copy.diproses_rw - 1);
          }
          if (nextStatus === "diproses_rw") copy.diproses_rw += 1;
          if (nextStatus === "selesai") copy.selesai += 1;
          return copy;
        });
      }

      if (nextStatus === "diproses_rw") {
        setTargetStatuses((prev) => ({ ...prev, [currentId]: "selesai" }));
      }

      setSavedIds((prev) => ({ ...prev, [currentId]: true }));

      if (nextStatus === "selesai") {
        setLatestCompletedMsg(
          `Tiket ${shortTicketCode(selectedTicket.ticketNumber)} (${selectedTicket.title}) telah diselesaikan. Bukti penyelesaian sudah tersedia untuk warga.`,
        );
      }

      setFeedback({
        ticketId: currentId,
        type: "success",
        text: `Pembaruan status ${statusLabelId(nextStatus)} beserta catatan berhasil disimpan dan warga telah diberi tahu.`,
      });
    });
  };

  const greetingFirstName =
    initialData.fullName.trim().split(/\s+/)[0] || "Pengurus";
  const activeTargetStatus = selectedTicket
    ? (targetStatuses[selectedTicket.id] ??
      (selectedTicket.status === "diverifikasi_rt" ? "diproses_rw" : "selesai"))
    : "selesai";
  const activeProofs = selectedTicket
    ? (proofFiles[selectedTicket.id] ?? [])
    : [];
  const isSaved = selectedTicket ? Boolean(savedIds[selectedTicket.id]) : false;

  return (
    <StaffShell
      role="ketua_rw"
      fullName={initialData.fullName}
      subHeaderLabel="RW 06 Parakansaat"
      unreadCount={initialData.unreadCount}
      avatarUrl={initialData.avatarUrl}
    >
      <div id="ringkasan" className="scroll-mt-20 space-y-6">
        {/* Header Sapaan RW & Unduh Rekap */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              RW 06 PARAKANSAAT • OKTOBER 2026
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
              Dari laporan, jadi tindakan.
            </h1>
            <p className="mt-1 text-sm text-muted">
              Selamat pagi, Pak {greetingFirstName}. Koordinasikan tindak lanjut
              laporan yang sudah diverifikasi RT.
            </p>
          </div>

          <RekapDownloadButton />
        </div>

        {/* Banner Biru Laporan Baru Diteruskan RT */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/75 px-4 py-3.5">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            {newestVerified ? (
              <>
                <p className="text-xs font-semibold text-primary">
                  Laporan baru diteruskan oleh {newestVerified.regionName}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {newestVerified.title} (
                  {shortTicketCode(newestVerified.ticketNumber)}) sudah
                  Diverifikasi RT dan menunggu penugasan dari RW.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-primary">
                  Semua laporan terverifikasi sedang dalam penanganan RW
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Pantau penyelesaian dan unggah bukti foto untuk laporan yang
                  telah rampung di lapangan.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 4 Kartu Statistik RW */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Seluruh laporan
              </span>
              <Files size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.total}</p>
            <p className="mt-2 text-[11px] text-muted">
              {stats.terkirim} terkirim • {stats.ditolak} ditolak
            </p>
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
            <p className="mt-2 text-[11px] text-muted">Siap ditindaklanjuti</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Diproses RW
              </span>
              <Wrench size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">
              {stats.diproses_rw}
            </p>
            <p className="mt-2 text-[11px] text-muted">Dalam penanganan</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Selesai</span>
              <CheckCircle2 size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.selesai}</p>
            <p className="mt-2 text-[11px] text-muted">
              {completionPercent}% dari seluruh laporan
            </p>
          </div>
        </div>

        {/* Kartu Tabel: Antrean Tindak Lanjut */}
        <section
          id="antrean-tindak-lanjut"
          className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">
                Antrean tindak lanjut
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Laporan valid dari RT dan penanganan yang sedang berjalan.
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
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setRtFilter("");
                }}
                className="shrink-0 cursor-pointer text-xs font-semibold text-primary hover:underline"
              >
                Lihat seluruhnya
              </button>
            </div>
          </div>

          {/* Pencarian + Filter Status + Filter RT */}
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

            <div className="flex gap-3">
              <div className="relative flex-1 sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter status"
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

              <div className="relative flex-1 sm:w-32">
                <select
                  value={rtFilter}
                  onChange={(e) => setRtFilter(e.target.value)}
                  aria-label="Filter wilayah RT"
                  className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pr-4 pl-8 text-xs font-semibold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  <option value="">Semua RT</option>
                  {RT_FILTER_OPTIONS.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                />
              </div>
            </div>
          </div>

          {/* Tabel Antrean RW */}
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
                      Tidak ada pengaduan yang sesuai dengan filter saat ini.
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
                            Tindak lanjuti
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
            Laporan Diverifikasi RT dapat mulai ditangani dengan status Diproses
            RW.
          </div>
        </section>

        {/* Kartu Perbarui Penanganan Dinamis */}
        {selectedTicket && (
          <section
            ref={updatePanelRef}
            id="perbarui-penanganan"
            className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
          >
            <div>
              <h2 className="text-base font-bold text-ink">
                Perbarui penanganan #{selectedTicket.ticketNumber}
              </h2>
              <p
                className={`mt-0.5 text-xs ${
                  isSaved ? "font-medium text-emerald-600" : "text-muted"
                }`}
              >
                {isSaved
                  ? "Pembaruan tersimpan • warga telah diberi tahu"
                  : "Rencana pembaruan • belum disimpan"}
              </p>
            </div>

            <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_1.05fr]">
              {/* Kiri: Ringkasan Tiket & Riwayat Penanganan */}
              <div>
                <h3 className="text-xl font-bold tracking-tight text-ink">
                  {selectedTicket.title}
                </h3>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
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

                <p className="mt-3 text-xs text-muted">
                  {selectedTicket.reporterName} • {selectedTicket.regionName} •{" "}
                  {selectedTicket.categoryName}
                </p>

                {selectedTicket.rating && (
                  <div className="mt-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
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

                {/* Kotak Riwayat Timeline */}
                <div className="mt-4 space-y-3.5 rounded-2xl bg-surface p-4">
                  {selectedTicket.timeline.map((item) => (
                    <div key={item.id}>
                      <p className="text-xs font-bold text-ink">
                        {item.dateLabel} • {statusLabelId(item.status)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {item.actorNote}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Info Bukti Wajib */}
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/75 p-4">
                  <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      Bukti wajib untuk Selesai
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      Unggah foto hasil penanganan (maks. 3 foto) dan tuliskan
                      catatan penyelesaian yang dapat dipahami warga.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kanan: Form Pembaruan Status & Bukti Penyelesaian */}
              <div className="space-y-4">
                {feedback && feedback.ticketId === selectedTicket.id && (
                  <div
                    className={`flex items-start gap-2 rounded-xl border p-3.5 text-xs ${
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

                <div>
                  <label
                    htmlFor="rw_status"
                    className="block text-xs font-semibold text-ink"
                  >
                    Status baru <span className="text-ink">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="rw_status"
                      value={activeTargetStatus}
                      disabled={isPending}
                      onChange={(e) => {
                        setTargetStatuses((prev) => ({
                          ...prev,
                          [selectedTicket.id]: e.target.value as
                            | "diproses_rw"
                            | "selesai",
                        }));
                        setSavedIds((prev) => ({
                          ...prev,
                          [selectedTicket.id]: false,
                        }));
                      }}
                      className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    >
                      <option value="diproses_rw">Diproses RW</option>
                      <option value="selesai">Selesai</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    Pilihan RW: Diproses RW atau Selesai.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="rw_note"
                    className="block text-xs font-semibold text-ink"
                  >
                    Catatan / pesan penyelesaian untuk warga{" "}
                    <span className="text-ink">*</span>
                  </label>
                  <textarea
                    id="rw_note"
                    rows={3}
                    disabled={isPending}
                    value={rwNotes[selectedTicket.id] ?? ""}
                    onChange={(e) => {
                      setRwNotes((prev) => ({
                        ...prev,
                        [selectedTicket.id]: e.target.value,
                      }));
                      setSavedIds((prev) => ({
                        ...prev,
                        [selectedTicket.id]: false,
                      }));
                    }}
                    placeholder="Tuliskan tindakan lapangan atau hasil penyelesaian untuk warga..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Foto bukti penyelesaian ({activeProofs.length}/3){" "}
                    {activeTargetStatus === "selesai" && (
                      <span className="text-ink">*</span>
                    )}
                  </label>

                  {/* Daftar Foto Bukti Terunggah (hingga 3 foto) */}
                  {activeProofs.length > 0 && (
                    <div className="mt-2 space-y-2.5">
                      {activeProofs.map((proofItem, idx) => (
                        <div
                          key={proofItem.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/50 p-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {proofItem.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={proofItem.previewUrl}
                                alt={proofItem.fileName}
                                className="h-14 w-20 shrink-0 rounded-lg border border-border object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-primary">
                                <ImageIcon size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-ink">
                                Bukti #{idx + 1} • {proofItem.fileName}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted">
                                {formatBytesMb(proofItem.sizeBytes)} • Terunggah
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleRemoveProofPhoto(
                                selectedTicket.id,
                                proofItem.id,
                              )
                            }
                            aria-label={`Hapus ${proofItem.fileName}`}
                            className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tombol Unggah Tetap Ada Setelah Mengunggah (Maks 3 Foto) */}
                  <label
                    className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs font-semibold transition-colors ${
                      activeProofs.length >= 3 || uploadingPhoto
                        ? "cursor-not-allowed border-border bg-surface text-muted"
                        : "cursor-pointer border-primary/50 bg-blue-50/40 text-primary hover:bg-blue-50/80"
                    }`}
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    <span>
                      {uploadingPhoto
                        ? "Mengunggah foto bukti..."
                        : activeProofs.length >= 3
                          ? "Batas maksimal 3 foto bukti tercapai (3 dari 3)"
                          : `Unggah foto bukti • ${activeProofs.length} dari 3 terunggah`}
                    </span>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={
                        uploadingPhoto || isPending || activeProofs.length >= 3
                      }
                      onChange={handleProofFileSelect}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-1.5 text-[11px] text-muted">
                    JPG, PNG • Maks. 5 MB per foto • Maks. 3 foto
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={isPending || uploadingPhoto}
                    onClick={handleSaveUpdate}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  >
                    {isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    Simpan & beri tahu warga
                  </button>
                  <p className="mt-2 text-[11px] text-muted">
                    Warga menerima notifikasi setelah pembaruan disimpan.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Banner Hijau Kabar Penanganan Terbaru */}
        <div
          id="kabar-terbaru"
          className="scroll-mt-20 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/75 px-4 py-3.5"
        >
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-emerald-600"
          />
          <div>
            <p className="text-xs font-semibold text-emerald-800">
              Kabar penanganan terbaru
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/90">
              {latestCompletedMsg}
            </p>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
