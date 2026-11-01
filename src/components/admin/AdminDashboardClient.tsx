"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Files,
  Info,
  Loader2,
  Plus,
  Save,
  Search,
  Upload,
  UserPlus,
  Wrench,
} from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";
import Badge from "@/components/ui/Badge";
import {
  completeTicket,
  processTicket,
  rejectTicket,
  verifyTicket,
} from "@/app/actions/tickets";
import { registerAttachment } from "@/app/actions/attachments";
import {
  createStaff,
  saveCategory,
  setCategoryActive,
  setStaffActive,
} from "@/app/actions/admin";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import { roleLabelId } from "@/utils/roles";
import { statusLabelId } from "@/utils/transition";
import { generateStoragePath, validateAttachment } from "@/utils/upload";
import type { TicketStatus, UserRole } from "@/types";
import type {
  AdminAccountRow,
  AdminActivityLog,
  AdminCategorySummary,
  AdminDashboardData,
  AdminRtInfo,
  AdminTicketRow,
} from "@/data/admin-preview";

const ADMIN_STATUS_CHOICES: TicketStatus[] = [
  "terkirim",
  "diverifikasi_rt",
  "diproses_rw",
  "selesai",
  "ditolak",
];

function shortCode(ticketNumber: string): string {
  const parts = ticketNumber.split("-");
  return `#${parts[parts.length - 1] ?? ticketNumber}`;
}

export default function AdminDashboardClient({
  initialData,
}: {
  initialData: AdminDashboardData;
}) {
  const [tickets, setTickets] = useState<AdminTicketRow[]>(initialData.tickets);
  const [stats, setStats] = useState(initialData.stats);
  const [accounts, setAccounts] = useState<AdminAccountRow[]>(
    initialData.accounts,
  );
  const [rtRegions, setRtRegions] = useState<AdminRtInfo[]>(
    initialData.rtRegions,
  );
  const [categories, setCategories] = useState<AdminCategorySummary[]>(
    initialData.categories,
  );
  const [activities, setActivities] = useState<AdminActivityLog[]>(
    initialData.activities,
  );

  // Pilih default #PG-2026-0265 sesuai desain mockup
  const defaultTicket =
    initialData.tickets.find((t) => t.id === 265) ?? initialData.tickets[0];
  const [selectedTicketId, setSelectedTicketId] = useState<number>(
    defaultTicket?.id ?? 0,
  );

  // Filter tabel pengaduan lintas wilayah
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("");
  const [ticketRtFilter, setTicketRtFilter] = useState("");

  // State panel Bantuan penanganan & status langsung
  const [targetStatuses, setTargetStatuses] = useState<
    Record<number, TicketStatus>
  >(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [
        t.id,
        t.status === "terkirim"
          ? "diverifikasi_rt"
          : t.status === "diverifikasi_rt"
            ? "diproses_rw"
            : "selesai",
      ]),
    ),
  );
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [t.id, t.defaultAdminNote]),
    ),
  );
  const [assistFlags, setAssistFlags] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(initialData.tickets.map((t) => [t.id, true])),
  );
  const [proofFiles, setProofFiles] = useState<
    Record<number, { fileName: string; sizeBytes: number } | null>
  >({});
  const [savedTickets, setSavedTickets] = useState<Record<number, boolean>>({});
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // State Akun & Hak Akses
  const [accountSearch, setAccountSearch] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);

  // State Wilayah RT / RW
  const [selectedRtId, setSelectedRtId] = useState<number>(
    initialData.rtRegions[2]?.id ?? initialData.rtRegions[0]?.id ?? 3,
  );
  const [rwLabel, setRwLabel] = useState("RW 06 Parakansaat, Bandung");
  const [editingRw, setEditingRw] = useState(false);

  // State Kategori Layanan
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [downloadingRekap, setDownloadingRekap] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [isPending, startTransition] = useTransition();

  const managePanelRef = useRef<HTMLElement>(null);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? tickets[0] ?? null,
    [tickets, selectedTicketId],
  );

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      if (ticketStatusFilter && t.status !== ticketStatusFilter) return false;
      if (ticketRtFilter && t.regionName !== ticketRtFilter) return false;
      if (!q) return true;
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketRtFilter]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        roleLabelId(a.role).toLowerCase().includes(q),
    );
  }, [accounts, accountSearch]);

  const selectedRt =
    rtRegions.find((r) => r.id === selectedRtId) ?? rtRegions[0];

  const inProgressTotal = stats.diverifikasi_rt + stats.diproses_rw;

  const prependActivity = (message: string) => {
    setActivities((prev) => [
      { id: Date.now(), text: `Baru saja • ${initialData.adminName} ${message}` },
      ...prev,
    ]);
  };

  // Unduh Rekap (/api/rekap)
  const handleDownloadRekap = async () => {
    setDownloadingRekap(true);
    try {
      const res = await fetch("/api/rekap");
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-sipandu-rw06-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingRekap(false);
    }
  };

  const handleSelectTicket = (t: AdminTicketRow) => {
    setSelectedTicketId(t.id);
    setStatusFeedback(null);
    managePanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;
    setStatusFeedback(null);

    const check = validateAttachment(file);
    if (!check.valid) {
      setStatusFeedback({
        type: "error",
        text: check.error ?? "File bukti tidak valid",
      });
      return;
    }

    const currentId = selectedTicket.id;

    if (isSupabaseConfigured()) {
      setUploadingProof(true);
      try {
        const storagePath = generateStoragePath(
          currentId,
          "penyelesaian",
          file.name,
        );
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("ticket-attachments")
          .upload(storagePath, file, { contentType: file.type });
        if (upErr) throw new Error(upErr.message);

        const regRes = await registerAttachment({
          ticketId: currentId,
          type: "penyelesaian",
          storagePath,
          fileName: file.name,
          mimeType: file.type as "image/jpeg" | "image/png",
          sizeBytes: file.size,
        });
        if (!regRes.success) throw new Error(regRes.error);
      } catch (errObj) {
        setStatusFeedback({
          type: "error",
          text:
            errObj instanceof Error
              ? errObj.message
              : "Gagal mengunggah bukti penanganan",
        });
        setUploadingProof(false);
        return;
      }
      setUploadingProof(false);
    }

    setProofFiles((prev) => ({
      ...prev,
      [currentId]: { fileName: file.name, sizeBytes: file.size },
    }));
    setSavedTickets((prev) => ({ ...prev, [currentId]: false }));
  };

  const handleSaveTicketStatus = () => {
    if (!selectedTicket) return;
    const currentId = selectedTicket.id;
    const prevStatus = selectedTicket.status;
    const nextStatus = targetStatuses[currentId] ?? "diproses_rw";
    const note = (adminNotes[currentId] ?? "").trim();
    const hasProof = Boolean(proofFiles[currentId]);

    setStatusFeedback(null);

    if (note.length < 5) {
      setStatusFeedback({
        type: "error",
        text: "Catatan tindakan Admin wajib diisi (minimal 5 karakter).",
      });
      return;
    }

    if (nextStatus === "selesai" && !hasProof) {
      setStatusFeedback({
        type: "error",
        text: "Untuk status Selesai, mohon unggah bukti penanganan terlebih dahulu.",
      });
      return;
    }

    startTransition(async () => {
      if (nextStatus === "diverifikasi_rt" && prevStatus === "terkirim") {
        const r = await verifyTicket(currentId);
        if (!r.success) {
          setStatusFeedback({ type: "error", text: r.error });
          return;
        }
      } else if (nextStatus === "diproses_rw") {
        const r = await processTicket(currentId);
        if (!r.success) {
          setStatusFeedback({ type: "error", text: r.error });
          return;
        }
      } else if (nextStatus === "selesai") {
        const r = await completeTicket(currentId);
        if (!r.success) {
          setStatusFeedback({ type: "error", text: r.error });
          return;
        }
      } else if (nextStatus === "ditolak") {
        const fd = new FormData();
        fd.set("ticket_id", String(currentId));
        fd.set("reason", note);
        const r = await rejectTicket(fd);
        if (!r.success) {
          setStatusFeedback({ type: "error", text: r.error });
          return;
        }
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === currentId
            ? {
                ...t,
                status: nextStatus,
                statusContextNote: `${t.reporterName} • ${t.regionName}. Diperbarui langsung oleh Admin: ${note}`,
              }
            : t,
        ),
      );

      if (prevStatus !== nextStatus) {
        setStats((prev) => {
          const copy = { ...prev };
          if (prevStatus in copy) {
            copy[prevStatus] = Math.max(0, copy[prevStatus] - 1);
          }
          if (nextStatus in copy) {
            copy[nextStatus] = copy[nextStatus] + 1;
          }
          return copy;
        });
      }

      setSavedTickets((prev) => ({ ...prev, [currentId]: true }));
      prependActivity(
        `mengubah ${shortCode(selectedTicket.ticketNumber)} menjadi ${statusLabelId(nextStatus)}.`,
      );
      setStatusFeedback({
        type: "success",
        text: `Status tiket ${selectedTicket.ticketNumber} berhasil diperbarui menjadi ${statusLabelId(nextStatus)}.`,
      });
    });
  };

  const handleCreateAccount = (formData: FormData) => {
    setAccountFeedback(null);
    startTransition(async () => {
      const res = await createStaff(formData);
      if (!res.success) {
        setAccountFeedback(res.error);
        return;
      }

      const fullName = String(formData.get("full_name") ?? "");
      const email = String(formData.get("email") ?? "");
      const role = String(formData.get("role") ?? "ketua_rt") as UserRole;
      const regId = Number(formData.get("region_id") || 3);
      const regName =
        role === "ketua_rt" || role === "warga"
          ? (rtRegions.find((r) => r.id === regId)?.name ?? "RT 03")
          : "RW 06";

      setAccounts((prev) => [
        {
          id: res.data.id,
          fullName,
          email,
          role,
          regionLabel: regName,
          permissionDesc:
            role === "admin"
              ? "Kelola data & status langsung"
              : role === "ketua_rw"
                ? "Tindak lanjut & penyelesaian"
                : `Verifikasi laporan ${regName}`,
          isActive: true,
        },
        ...prev,
      ]);
      prependActivity(
        `menambahkan akun ${roleLabelId(role)} baru (${fullName}).`,
      );
      setShowAddAccount(false);
    });
  };

  const handleToggleAccount = (acc: AdminAccountRow) => {
    if (acc.role === "admin" && acc.fullName === initialData.adminName) {
      setAccountFeedback("Akun Admin yang sedang aktif tidak dapat dinonaktifkan.");
      return;
    }
    setAccountFeedback(null);
    const nextActive = !acc.isActive;

    startTransition(async () => {
      const res = await setStaffActive(acc.id, nextActive);
      if (!res.success) {
        setAccountFeedback(res.error);
        return;
      }
      setAccounts((prev) =>
        prev.map((item) =>
          item.id === acc.id ? { ...item, isActive: nextActive } : item,
        ),
      );
      prependActivity(
        `${nextActive ? "mengaktifkan" : "menonaktifkan"} akun ${acc.fullName}.`,
      );
    });
  };

  const handleAddRt = () => {
    const nextNum = rtRegions.length + 1;
    const padded = String(nextNum).padStart(2, "0");
    const newRt: AdminRtInfo = {
      id: Date.now(),
      name: `RT ${padded}`,
      leaderName: "Belum ditetapkan",
      residentCount: 0,
      isActive: true,
    };
    setRtRegions((prev) => [...prev, newRt]);
    setSelectedRtId(newRt.id);
    prependActivity(`menambahkan wilayah baru ${newRt.name} ke RW 06.`);
  };

  const handleSaveCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed.length < 2) return;

    const fd = new FormData();
    fd.set("name", trimmed);

    startTransition(async () => {
      const res = await saveCategory(fd);
      if (res.success) {
        setCategories((prev) => [
          ...prev,
          {
            id: res.data.id,
            name: trimmed,
            reportCount: 0,
            isActive: true,
          },
        ]);
        prependActivity(`menambahkan kategori layanan "${trimmed}".`);
        setNewCategoryName("");
        setShowAddCategory(false);
      }
    });
  };

  const handleToggleCategory = (cat: AdminCategorySummary) => {
    const nextState = !cat.isActive;
    startTransition(async () => {
      const res = await setCategoryActive(cat.id, nextState);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === cat.id ? { ...c, isActive: nextState } : c,
          ),
        );
      }
    });
  };

  const activeTargetStatus = selectedTicket
    ? (targetStatuses[selectedTicket.id] ?? "diproses_rw")
    : "diproses_rw";
  const activeProof = selectedTicket
    ? (proofFiles[selectedTicket.id] ?? null)
    : null;
  const isTicketSaved = selectedTicket
    ? Boolean(savedTickets[selectedTicket.id])
    : false;

  return (
    <StaffShell
      role="admin"
      fullName={initialData.adminName}
      subHeaderLabel="RW 06 Parakansaat"
      unreadCount={initialData.unreadCount}
    >
      <div id="ringkasan" className="scroll-mt-20 space-y-6">
        {/* Header Atas & Tombol Unduh Rekap */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              ADMINISTRASI RW 06 PARAKANSAAT
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
              Layanan tertata, warga terbantu.
            </h1>
            <p className="mt-1 text-sm text-muted">
              Kelola pengaduan lintas RT, akun, wilayah, dan kategori layanan.
            </p>
          </div>

          <button
            type="button"
            disabled={downloadingRekap}
            onClick={handleDownloadRekap}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-surface disabled:opacity-50 sm:self-auto sm:text-sm"
          >
            {downloadingRekap ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            Unduh rekap
          </button>
        </div>

        {/* Banner Kuning Notifikasi Operasional */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/75 px-4 py-3.5">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div>
            <p className="text-xs font-bold text-amber-800">
              Notifikasi operasional
            </p>
            <p className="mt-0.5 text-xs text-amber-800/85">
              {stats.terkirim} laporan Terkirim menunggu RT. Ada{" "}
              {stats.diverifikasi_rt} laporan Diverifikasi RT yang dapat dibantu
              untuk ditindaklanjuti.
            </p>
          </div>
        </div>

        {/* 4 Kartu Statistik Admin */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">
                Seluruh pengaduan
              </span>
              <Files size={16} className="text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{stats.total}</p>
            <p className="mt-2 text-[11px] text-muted">
              Oktober 2026 • {rtRegions.length} RT
            </p>
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
              {stats.ditolak} lainnya Ditolak
            </p>
          </div>
        </div>

        {/* Kartu Tabel: Pengaduan Lintas Wilayah */}
        <section
          id="pengaduan-lintas-wilayah"
          className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
        >
          <div>
            <h2 className="text-base font-bold text-ink">
              Pengaduan lintas wilayah
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Admin dapat membuka, membantu penanganan, dan mengubah status
              seluruh tiket.
            </p>
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
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Cari nomor tiket atau laporan..."
                className="w-full rounded-xl border border-border bg-white py-2.5 pr-3.5 pl-9 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 sm:w-40">
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  aria-label="Filter status"
                  className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pr-4 pl-8 text-xs font-semibold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  <option value="">Semua status</option>
                  {ADMIN_STATUS_CHOICES.map((st) => (
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
                  value={ticketRtFilter}
                  onChange={(e) => setTicketRtFilter(e.target.value)}
                  aria-label="Filter wilayah RT"
                  className="w-full appearance-none rounded-xl border border-border bg-white py-2.5 pr-4 pl-8 text-xs font-semibold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  <option value="">Semua RT</option>
                  {rtRegions.map((rt) => (
                    <option key={rt.id} value={rt.name}>
                      {rt.name}
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

          {/* Tabel */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="bg-surface/90 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <th className="rounded-l-lg px-3.5 py-2.5">Nomor Tiket</th>
                  <th className="px-3.5 py-2.5">Laporan / Wilayah</th>
                  <th className="px-3.5 py-2.5">Tanggal</th>
                  <th className="px-3.5 py-2.5">Status</th>
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
                      Tidak ada tiket yang sesuai dengan pencarian saat ini.
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
                          <Badge status={ticket.status} dot />
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
                            Kelola tiket
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
            {filteredTickets.length} dari {stats.total} pengaduan •{" "}
            {ticketRtFilter || "Semua RT"} di RW 06
          </div>
        </section>

        {/* Kartu Bantuan Penanganan & Status Langsung */}
        {selectedTicket && (
          <section
            ref={managePanelRef}
            className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
          >
            <div>
              <h2 className="text-base font-bold text-ink">
                Bantuan penanganan & status langsung
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Tiket {selectedTicket.ticketNumber} • {selectedTicket.title}
              </p>
            </div>

            {statusFeedback && (
              <div
                className={`mt-4 flex items-start gap-2 rounded-xl border p-3.5 text-xs ${
                  statusFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {statusFeedback.type === "success" ? (
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
                <span>{statusFeedback.text}</span>
              </div>
            )}

            <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_1.05fr]">
              {/* Kiri */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">Status saat ini</span>
                  <Badge status={selectedTicket.status} dot />
                </div>

                <p className="mt-3.5 text-xs leading-relaxed text-ink sm:text-[13px]">
                  {selectedTicket.statusContextNote}
                </p>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/75 p-4">
                  <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      Admin memiliki akses tindakan langsung
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      Anda dapat mengubah seluruh status dan membantu koordinasi
                      tanpa menunggu aksi RT/RW. Setiap perubahan wajib disertai
                      catatan dan tercatat dalam riwayat.
                    </p>
                  </div>
                </div>

                <label className="mt-3.5 flex cursor-pointer items-center gap-2.5 rounded-xl bg-blue-50/75 px-4 py-3 text-xs font-semibold text-primary">
                  <input
                    type="checkbox"
                    checked={assistFlags[selectedTicket.id] ?? true}
                    onChange={(e) =>
                      setAssistFlags((prev) => ({
                        ...prev,
                        [selectedTicket.id]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>Bantu koordinasi penanganan tiket ini</span>
                </label>

                <p
                  className={`mt-3 text-[11px] ${
                    isTicketSaved ? "font-medium text-emerald-600" : "text-muted"
                  }`}
                >
                  {isTicketSaved
                    ? "Perubahan status telah disimpan dan tercatat dalam riwayat."
                    : "Perubahan masih berupa draf. Status tiket belum berubah."}
                </p>
              </div>

              {/* Kanan */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="admin_status_select"
                    className="block text-xs font-semibold text-ink"
                  >
                    Status baru <span className="text-ink">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id="admin_status_select"
                      value={activeTargetStatus}
                      disabled={isPending}
                      onChange={(e) => {
                        setTargetStatuses((prev) => ({
                          ...prev,
                          [selectedTicket.id]: e.target.value as TicketStatus,
                        }));
                        setSavedTickets((prev) => ({
                          ...prev,
                          [selectedTicket.id]: false,
                        }));
                      }}
                      className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    >
                      {ADMIN_STATUS_CHOICES.map((st) => (
                        <option key={st} value={st}>
                          {statusLabelId(st)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    Pilihan: Terkirim, Diverifikasi RT, Diproses RW, Selesai,
                    Ditolak.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="admin_action_note"
                    className="block text-xs font-semibold text-ink"
                  >
                    Catatan tindakan Admin <span className="text-ink">*</span>
                  </label>
                  <textarea
                    id="admin_action_note"
                    rows={3}
                    disabled={isPending}
                    value={adminNotes[selectedTicket.id] ?? ""}
                    onChange={(e) => {
                      setAdminNotes((prev) => ({
                        ...prev,
                        [selectedTicket.id]: e.target.value,
                      }));
                      setSavedTickets((prev) => ({
                        ...prev,
                        [selectedTicket.id]: false,
                      }));
                    }}
                    placeholder="Tuliskan catatan koordinasi atau alasan perubahan status..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  <p className="mt-1.5 text-[11px] text-muted">
                    Untuk Ditolak: alasan wajib diisi. Untuk Selesai: unggah
                    bukti penyelesaian.
                  </p>
                </div>

                <div className="space-y-2.5 pt-0.5">
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-surface sm:text-sm">
                    {uploadingProof ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    <span>
                      {uploadingProof
                        ? "Mengunggah bukti..."
                        : activeProof
                          ? `Bukti terpilih: ${activeProof.fileName}`
                          : "Unggah bukti penanganan"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={uploadingProof || isPending}
                      onChange={handleUploadProof}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={isPending || uploadingProof}
                    onClick={handleSaveTicketStatus}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  >
                    {isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}
                    Simpan perubahan status
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Kartu Akun & Hak Akses */}
        <section
          id="akun-hak-akses"
          className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
        >
          <div>
            <h2 className="text-base font-bold text-ink">Akun & hak akses</h2>
            <p className="mt-0.5 text-xs text-muted">
              {initialData.residentTotal} akun warga •{" "}
              {initialData.staffActiveTotal} akun pengurus aktif
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Cari nama atau email akun..."
                className="w-full rounded-xl border border-border bg-white py-2.5 pr-3.5 pl-9 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddAccount((prev) => !prev)}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <UserPlus size={15} />
              Tambah akun
            </button>
          </div>

          {accountFeedback && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
              {accountFeedback}
            </p>
          )}

          {/* Form Inline Tambah Akun Pengurus (createStaff) */}
          {showAddAccount && (
            <form
              action={handleCreateAccount}
              className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              <input
                name="full_name"
                type="text"
                required
                minLength={2}
                placeholder="Nama lengkap"
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="Email akun"
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Kata sandi (min. 8)"
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  name="role"
                  defaultValue="ketua_rt"
                  className="w-full rounded-xl border border-border bg-white px-2.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                >
                  <option value="ketua_rt">Ketua RT</option>
                  <option value="ketua_rw">Ketua RW</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  name="region_id"
                  defaultValue={rtRegions[0]?.id ?? 1}
                  className="w-24 shrink-0 rounded-xl border border-border bg-white px-2 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                >
                  {rtRegions.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="cursor-pointer rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Simpan akun
              </button>
            </form>
          )}

          {/* Daftar Akun */}
          <div className="mt-4 divide-y divide-border/70">
            {filteredAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="sm:w-56">
                  <p className="text-xs font-bold text-ink sm:text-[13px]">
                    {acc.fullName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {roleLabelId(acc.role)} • {acc.regionLabel} •{" "}
                    <span
                      className={
                        acc.isActive ? "text-muted" : "font-medium text-red-600"
                      }
                    >
                      {acc.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </p>
                </div>

                <p className="flex-1 text-xs text-muted">
                  {acc.permissionDesc}
                </p>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleAccount(acc)}
                  className="self-start cursor-pointer text-xs font-semibold text-primary hover:underline sm:self-auto"
                >
                  {acc.isActive
                    ? "Ubah peran / Nonaktifkan"
                    : "Aktifkan kembali"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Grid 2 Kolom: Data RT/RW & Kategori Layanan */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Kartu Data RT / RW */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Data RT / RW</h2>
                {editingRw ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={rwLabel}
                      onChange={(e) => setRwLabel(e.target.value)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs text-ink focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingRw(false)}
                      className="cursor-pointer text-xs font-semibold text-primary"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-muted">{rwLabel}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingRw((prev) => !prev)}
                className="cursor-pointer text-xs font-semibold text-primary hover:underline"
              >
                Kelola
              </button>
            </div>

            <p className="mt-4 text-xs font-semibold text-ink">
              {rtRegions.length} wilayah RT terdaftar • Semua aktif
            </p>

            {/* Chip Pilihan RT */}
            <div className="mt-3 flex flex-wrap gap-2">
              {rtRegions.map((rt) => {
                const isSelected = selectedRt?.id === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setSelectedRtId(rt.id)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-blue-50 text-primary"
                        : "border-border bg-surface/60 text-ink hover:border-primary/40"
                    }`}
                  >
                    {rt.name}
                  </button>
                );
              })}
            </div>

            {selectedRt && (
              <p className="mt-4 text-xs text-muted">
                {selectedRt.name} • {selectedRt.leaderName} •{" "}
                {selectedRt.residentCount} akun warga
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleAddRt}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface"
              >
                <Plus size={14} />
                Tambah RT
              </button>
              <button
                type="button"
                onClick={() => setEditingRw(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface"
              >
                Ubah data RW
              </button>
            </div>
          </section>

          {/* Kartu Kategori Layanan */}
          <section
            id="kategori-layanan"
            className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Kategori layanan
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {categories.filter((c) => c.isActive).length} kategori •{" "}
                  {stats.total} pengaduan bulan ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManageCategories((prev) => !prev)}
                className="cursor-pointer text-xs font-semibold text-primary hover:underline"
              >
                {manageCategories ? "Selesai" : "Kelola"}
              </button>
            </div>

            <ul className="mt-4 space-y-2.5">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span
                    className={`font-medium ${
                      cat.isActive ? "text-ink" : "text-muted line-through"
                    }`}
                  >
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted">
                      {cat.reportCount} laporan
                    </span>
                    {manageCategories && (
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {showAddCategory ? (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nama kategori baru..."
                  className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveCategory}
                  className="cursor-pointer rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName("");
                  }}
                  className="cursor-pointer rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-surface"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface"
                >
                  <Plus size={14} />
                  Tambah kategori
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Kartu Catatan Aktivitas Terbaru */}
        <section
          id="catatan-aktivitas"
          className="scroll-mt-20 rounded-2xl border border-border bg-white p-5 sm:p-6"
        >
          <h2 className="text-base font-bold text-ink">
            Catatan aktivitas terbaru
          </h2>
          <ul className="mt-3.5 space-y-2.5 text-xs text-muted">
            {activities.slice(0, 6).map((act) => (
              <li key={act.id}>{act.text}</li>
            ))}
          </ul>
        </section>
      </div>
    </StaffShell>
  );
}
