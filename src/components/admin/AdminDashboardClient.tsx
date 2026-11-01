"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Files,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  UserPlus,
  Wrench,
} from "lucide-react";
import StaffShell from "@/components/staff/StaffShell";
import Badge from "@/components/ui/Badge";
import RekapDownloadButton from "@/components/common/RekapDownloadButton";
import {
  adminUpdateTicketStatus,
  deleteTicketByAdmin,
} from "@/app/actions/tickets";
import {
  deleteAttachment,
  uploadAttachment,
} from "@/app/actions/attachments";
import {
  createStaff,
  deleteCategory,
  deleteRegion,
  deleteUserByAdmin,
  saveCategory,
  saveRegion,
  setCategoryActive,
  setStaffActive,
  updateRwSettings,
  updateUserRole,
} from "@/app/actions/admin";
import { isSupabaseConfigured } from "@/utils/supabase/client";
import { roleLabelId } from "@/utils/roles";
import { statusLabelId } from "@/utils/transition";
import { validateAttachment } from "@/utils/upload";
import type { TicketStatus, UserRole } from "@/types";
import type {
  AdminAccountRow,
  AdminActivityLog,
  AdminCategorySummary,
  AdminDashboardData,
  AdminRtInfo,
  AdminTicketRow,
} from "@/data/admin-preview";
import type { StaffAttachmentItem } from "@/data/staff-preview";

const ADMIN_STATUS_CHOICES: TicketStatus[] = [
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

function shortCode(ticketNumber: string): string {
  const parts = ticketNumber.split("-");
  return `#${parts[parts.length - 1] ?? ticketNumber}`;
}

export default function AdminDashboardClient({
  initialData,
}: {
  initialData: AdminDashboardData;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminTicketRow[]>(initialData.tickets);
  const [stats, setStats] = useState(initialData.stats);
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setTickets(initialData.tickets);
    setStats(initialData.stats);
  }

  const handleRefreshTickets = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
    Record<number, StaffAttachmentItem[]>
  >(() =>
    Object.fromEntries(
      initialData.tickets.map((t) => [t.id, t.proofAttachments ?? []]),
    ),
  );
  const [savedTickets, setSavedTickets] = useState<Record<number, boolean>>({});
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // State Akun & Hak Akses
  const [accountSearch, setAccountSearch] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [editingRoleAccountId, setEditingRoleAccountId] = useState<
    string | null
  >(null);
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<
    string | null
  >(null);
  const [draftRole, setDraftRole] = useState<UserRole>("warga");
  const [draftRegionId, setDraftRegionId] = useState<number>(3);

  // State Wilayah RT / RW
  const [selectedRtId, setSelectedRtId] = useState<number>(
    initialData.rtRegions[2]?.id ?? initialData.rtRegions[0]?.id ?? 3,
  );
  const [rwNumber, setRwNumber] = useState(initialData.rwNumber || "06");
  const [rwAreaName, setRwAreaName] = useState(
    initialData.rwAreaName || "Parakansaat, Bandung",
  );
  const [rwLeaderUserId, setRwLeaderUserId] = useState<string>(() => {
    const rwAcc = initialData.accounts.find((a) => a.role === "ketua_rw");
    return rwAcc?.id ?? "";
  });
  const [editingRw, setEditingRw] = useState(false);
  const [showAddRtForm, setShowAddRtForm] = useState(false);
  const [newRtName, setNewRtName] = useState("");
  const [newRtLeaderId, setNewRtLeaderId] = useState("");
  const [editingRtId, setEditingRtId] = useState<number | null>(null);
  const [editRtName, setEditRtName] = useState("");
  const [editRtLeaderId, setEditRtLeaderId] = useState("");
  const [rtFeedback, setRtFeedback] = useState<string | null>(null);

  // State Kategori Layanan
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);

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
    e.target.value = "";
    if (!file || !selectedTicket) return;
    setStatusFeedback(null);

    const currentId = selectedTicket.id;
    const existingList = proofFiles[currentId] ?? [];
    if (existingList.length >= 3) {
      setStatusFeedback({
        type: "error",
        text: "Maksimal 3 foto bukti penyelesaian yang dapat dilampirkan.",
      });
      return;
    }

    const check = validateAttachment(file);
    if (!check.valid) {
      setStatusFeedback({
        type: "error",
        text: check.error ?? "File bukti tidak valid",
      });
      return;
    }

    const localUrl = URL.createObjectURL(file);

    if (isSupabaseConfigured()) {
      setUploadingProof(true);
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
        setSavedTickets((prev) => ({ ...prev, [currentId]: false }));
        setStatusFeedback({
          type: "success",
          text: "Foto bukti penanganan berhasil diunggah.",
        });
      } catch (errObj) {
        setStatusFeedback({
          type: "error",
          text:
            errObj instanceof Error
              ? errObj.message
              : "Gagal mengunggah bukti penanganan",
        });
      } finally {
        setUploadingProof(false);
      }
      return;
    }

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
    setSavedTickets((prev) => ({ ...prev, [currentId]: false }));
  };

  const handleRemoveProof = (ticketId: number, attachmentId: number) => {
    setStatusFeedback(null);
    if (isSupabaseConfigured() && attachmentId > 0) {
      startTransition(async () => {
        const res = await deleteAttachment(attachmentId);
        if (!res.success) {
          setStatusFeedback({ type: "error", text: res.error });
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

  const handleSaveTicketStatus = () => {
    if (!selectedTicket) return;
    const currentId = selectedTicket.id;
    const prevStatus = selectedTicket.status;
    const nextStatus = targetStatuses[currentId] ?? "diproses_rw";
    const note = (adminNotes[currentId] ?? "").trim();
    const proofs = proofFiles[currentId] ?? [];

    setStatusFeedback(null);

    if (note.length < 5) {
      setStatusFeedback({
        type: "error",
        text: "Catatan tindakan Admin wajib diisi (minimal 5 karakter).",
      });
      return;
    }

    if (nextStatus === "selesai" && proofs.length === 0) {
      setStatusFeedback({
        type: "error",
        text: "Untuk status Selesai, mohon unggah minimal 1 bukti penanganan terlebih dahulu.",
      });
      return;
    }

    startTransition(async () => {
      const r = await adminUpdateTicketStatus({
        ticketId: currentId,
        status: nextStatus,
        note,
      });
      if (!r.success) {
        setStatusFeedback({ type: "error", text: r.error });
        return;
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === currentId
            ? {
                ...t,
                status: nextStatus,
                proofAttachments: proofs,
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

  const handleDeleteTicket = (target: AdminTicketRow) => {
    setStatusFeedback(null);
    startTransition(async () => {
      const res = await deleteTicketByAdmin(target.id);
      if (!res.success) {
        setStatusFeedback({ type: "error", text: res.error });
        return;
      }

      const remaining = tickets.filter((t) => t.id !== target.id);
      setTickets(remaining);
      if (selectedTicketId === target.id) {
        setSelectedTicketId(remaining[0]?.id ?? 0);
      }

      setStats((prev) => {
        const copy = { ...prev, total: Math.max(0, prev.total - 1) };
        if (target.status in copy) {
          copy[target.status] = Math.max(0, copy[target.status] - 1);
        }
        return copy;
      });

      setCategories((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === target.categoryName.toLowerCase()
            ? { ...c, reportCount: Math.max(0, c.reportCount - 1) }
            : c,
        ),
      );

      prependActivity(`menghapus tiket ${target.ticketNumber} (${target.title}).`);
      setStatusFeedback({
        type: "success",
        text: `Tiket ${target.ticketNumber} berhasil dihapus permanen.`,
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
          : `RW ${rwNumber}`;

      setAccounts((prev) => [
        {
          id: res.data.id,
          fullName,
          email,
          role,
          regionId: role === "ketua_rt" || role === "warga" ? regId : null,
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
      if (role === "ketua_rt") {
        setRtRegions((prev) =>
          prev.map((rt) =>
            rt.id === regId
              ? { ...rt, leaderName: fullName, leaderUserId: res.data.id }
              : rt,
          ),
        );
      }
      prependActivity(
        `menambahkan akun ${roleLabelId(role)} baru (${fullName}).`,
      );
      setShowAddAccount(false);
    });
  };

  const handleOpenRoleEditor = (acc: AdminAccountRow) => {
    if (editingRoleAccountId === acc.id) {
      setEditingRoleAccountId(null);
      return;
    }
    setAccountFeedback(null);
    setEditingRoleAccountId(acc.id);
    setDraftRole(acc.role);
    const matchedRt = rtRegions.find(
      (r) => r.id === acc.regionId || r.name === acc.regionLabel,
    );
    setDraftRegionId(matchedRt?.id ?? rtRegions[0]?.id ?? 1);
  };

  const handleSaveAccountRole = (acc: AdminAccountRow) => {
    if (
      acc.role === "admin" &&
      acc.fullName === initialData.adminName &&
      draftRole !== "admin"
    ) {
      setAccountFeedback(
        "Tidak dapat menurunkan peran akun Admin yang sedang digunakan.",
      );
      return;
    }
    setAccountFeedback(null);

    const needsRegion = draftRole === "warga" || draftRole === "ketua_rt";
    const targetRegionId = needsRegion ? draftRegionId : null;
    const targetRegionName = needsRegion
      ? (rtRegions.find((r) => r.id === draftRegionId)?.name ?? "RT 01")
      : `RW ${rwNumber}`;
    const nextPerm =
      draftRole === "admin"
        ? "Kelola data & status langsung"
        : draftRole === "ketua_rw"
          ? "Tindak lanjut & penyelesaian"
          : draftRole === "ketua_rt"
            ? `Verifikasi laporan ${targetRegionName}`
            : "Buat & pantau laporan sendiri";

    startTransition(async () => {
      const res = await updateUserRole({
        userId: acc.id,
        role: draftRole,
        regionId: targetRegionId,
      });
      if (!res.success) {
        setAccountFeedback(res.error);
        return;
      }

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === acc.id
            ? {
                ...item,
                role: draftRole,
                regionId: targetRegionId,
                regionLabel: targetRegionName,
                permissionDesc: nextPerm,
              }
            : item,
        ),
      );

      if (draftRole === "ketua_rt" && targetRegionId) {
        setRtRegions((prev) =>
          prev.map((rt) =>
            rt.id === targetRegionId
              ? { ...rt, leaderName: acc.fullName, leaderUserId: acc.id }
              : rt.leaderUserId === acc.id
                ? { ...rt, leaderName: "Belum ditetapkan", leaderUserId: null }
                : rt,
          ),
        );
      } else if (acc.role === "ketua_rt") {
        setRtRegions((prev) =>
          prev.map((rt) =>
            rt.leaderUserId === acc.id || rt.leaderName === acc.fullName
              ? { ...rt, leaderName: "Belum ditetapkan", leaderUserId: null }
              : rt,
          ),
        );
      }

      if (draftRole === "ketua_rw") {
        setRwLeaderUserId(acc.id);
      }

      setEditingRoleAccountId(null);
      setAccountFeedback(
        `Peran ${acc.fullName} berhasil diubah menjadi ${roleLabelId(draftRole)} (${targetRegionName}).`,
      );
      prependActivity(
        `mengubah peran akun ${acc.fullName} menjadi ${roleLabelId(draftRole)} (${targetRegionName}).`,
      );
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

  const handleDeleteAccount = (acc: AdminAccountRow) => {
    if (acc.role === "admin" && acc.fullName === initialData.adminName) {
      setAccountFeedback(
        "Akun Admin yang sedang digunakan tidak dapat dihapus.",
      );
      return;
    }
    setAccountFeedback(null);

    startTransition(async () => {
      const res = await deleteUserByAdmin(acc.id);
      if (!res.success) {
        setAccountFeedback(res.error);
        return;
      }

      setAccounts((prev) => prev.filter((item) => item.id !== acc.id));

      if (acc.role === "ketua_rt") {
        setRtRegions((prev) =>
          prev.map((rt) =>
            rt.leaderUserId === acc.id || rt.leaderName === acc.fullName
              ? { ...rt, leaderName: "Belum ditetapkan", leaderUserId: null }
              : rt,
          ),
        );
      } else if (acc.role === "warga") {
        setRtRegions((prev) =>
          prev.map((rt) =>
            rt.id === acc.regionId || rt.name === acc.regionLabel
              ? { ...rt, residentCount: Math.max(0, rt.residentCount - 1) }
              : rt,
          ),
        );
      }

      if (rwLeaderUserId === acc.id) {
        setRwLeaderUserId("");
      }

      setConfirmDeleteAccountId(null);
      setEditingRoleAccountId(null);
      setAccountFeedback(
        `Akun ${acc.fullName} (${roleLabelId(acc.role)}) berhasil dihapus permanen.`,
      );
      prependActivity(
        `menghapus akun ${acc.fullName} (${roleLabelId(acc.role)}).`,
      );
    });
  };

  const handleOpenAddRt = () => {
    const nextNum = rtRegions.length + 1;
    const padded = String(nextNum).padStart(2, "0");
    setNewRtName(`RT ${padded}`);
    setNewRtLeaderId("");
    setEditingRtId(null);
    setShowAddRtForm(true);
    setRtFeedback(null);
  };

  const handleCreateRt = () => {
    const trimmed = newRtName.trim();
    if (trimmed.length < 2) {
      setRtFeedback("Nama RT wajib diisi (contoh: RT 07).");
      return;
    }
    setRtFeedback(null);
    startTransition(async () => {
      const res = await saveRegion({
        name: trimmed,
        rw: rwNumber,
        isActive: true,
        leaderUserId: newRtLeaderId || null,
      });
      if (!res.success) {
        setRtFeedback(res.error);
        return;
      }
      const chosenLeader = accounts.find((a) => a.id === newRtLeaderId);
      const newRt: AdminRtInfo = {
        id: res.data.id,
        name: res.data.name,
        rw: res.data.rw,
        leaderName: chosenLeader?.fullName ?? "Belum ditetapkan",
        leaderUserId: chosenLeader?.id ?? null,
        residentCount: 0,
        isActive: true,
      };
      setRtRegions((prev) => [...prev, newRt]);
      if (chosenLeader) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === chosenLeader.id
              ? {
                  ...a,
                  role: "ketua_rt",
                  regionId: newRt.id,
                  regionLabel: newRt.name,
                  permissionDesc: `Verifikasi laporan ${newRt.name}`,
                }
              : a,
          ),
        );
      }
      setSelectedRtId(newRt.id);
      setShowAddRtForm(false);
      setRtFeedback(`Wilayah ${newRt.name} berhasil ditambahkan.`);
      prependActivity(
        `menambahkan wilayah baru ${newRt.name} ke RW ${rwNumber}.`,
      );
    });
  };

  const handleStartEditRt = (rt: AdminRtInfo) => {
    setShowAddRtForm(false);
    setEditingRtId(rt.id);
    setEditRtName(rt.name);
    const currentLeader = accounts.find(
      (a) =>
        a.id === rt.leaderUserId ||
        (a.role === "ketua_rt" && a.regionLabel === rt.name),
    );
    setEditRtLeaderId(currentLeader?.id ?? "");
    setRtFeedback(null);
  };

  const handleSaveEditRt = (rt: AdminRtInfo) => {
    const trimmed = editRtName.trim();
    if (trimmed.length < 2) {
      setRtFeedback("Nama RT wajib diisi.");
      return;
    }
    setRtFeedback(null);
    startTransition(async () => {
      const res = await saveRegion({
        id: rt.id,
        name: trimmed,
        rw: rwNumber,
        isActive: rt.isActive,
        leaderUserId: editRtLeaderId || null,
      });
      if (!res.success) {
        setRtFeedback(res.error);
        return;
      }
      const chosenLeader = accounts.find((a) => a.id === editRtLeaderId);
      setRtRegions((prev) =>
        prev.map((item) =>
          item.id === rt.id
            ? {
                ...item,
                name: trimmed,
                leaderName: chosenLeader?.fullName ?? item.leaderName,
                leaderUserId: chosenLeader?.id ?? item.leaderUserId,
              }
            : item,
        ),
      );
      if (chosenLeader) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === chosenLeader.id
              ? {
                  ...a,
                  role: "ketua_rt",
                  regionId: rt.id,
                  regionLabel: trimmed,
                  permissionDesc: `Verifikasi laporan ${trimmed}`,
                }
              : a,
          ),
        );
      }
      setEditingRtId(null);
      setRtFeedback(`Data ${trimmed} berhasil diperbarui.`);
      prependActivity(`memperbarui data wilayah ${trimmed}.`);
    });
  };

  const handleToggleRtActive = (rt: AdminRtInfo) => {
    const nextActive = !rt.isActive;
    setRtFeedback(null);
    startTransition(async () => {
      const res = await saveRegion({
        id: rt.id,
        name: rt.name,
        rw: rwNumber,
        isActive: nextActive,
      });
      if (!res.success) {
        setRtFeedback(res.error);
        return;
      }
      setRtRegions((prev) =>
        prev.map((item) =>
          item.id === rt.id ? { ...item, isActive: nextActive } : item,
        ),
      );
      setRtFeedback(
        `Wilayah ${rt.name} ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`,
      );
      prependActivity(
        `${nextActive ? "mengaktifkan" : "menonaktifkan"} wilayah ${rt.name}.`,
      );
    });
  };

  const handleDeleteRt = (rt: AdminRtInfo) => {
    if (rtRegions.length <= 1) {
      setRtFeedback("Minimal harus ada 1 wilayah RT terdaftar.");
      return;
    }
    setRtFeedback(null);
    startTransition(async () => {
      const res = await deleteRegion(rt.id);
      if (!res.success) {
        setRtFeedback(res.error);
        return;
      }
      const remaining = rtRegions.filter((item) => item.id !== rt.id);
      setRtRegions(remaining);
      if (selectedRtId === rt.id && remaining[0]) {
        setSelectedRtId(remaining[0].id);
      }
      setEditingRtId(null);
      setRtFeedback(
        `Wilayah ${rt.name} berhasil dihapus (data warga/laporan dipindahkan ke ${res.data.fallbackRegionName}).`,
      );
      prependActivity(`menghapus wilayah ${rt.name}.`);
    });
  };

  const handleSaveRwSettings = () => {
    const cleanRw = rwNumber.trim() || "06";
    const cleanArea = rwAreaName.trim() || "Parakansaat, Bandung";
    setRtFeedback(null);
    startTransition(async () => {
      const res = await updateRwSettings({
        rwNumber: cleanRw,
        rwAreaName: cleanArea,
        rwLeaderUserId: rwLeaderUserId || null,
      });
      if (!res.success) {
        setRtFeedback(res.error);
        return;
      }
      setRwNumber(cleanRw);
      setRwAreaName(cleanArea);
      if (rwLeaderUserId) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === rwLeaderUserId
              ? {
                  ...a,
                  role: "ketua_rw",
                  regionLabel: `RW ${cleanRw}`,
                  permissionDesc: "Tindak lanjut & penyelesaian",
                }
              : a,
          ),
        );
      }
      setEditingRw(false);
      setRtFeedback(`Data RW ${cleanRw} (${cleanArea}) berhasil disimpan.`);
      prependActivity(`memperbarui pengaturan wilayah RW ${cleanRw}.`);
    });
  };

  const handleSaveCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed.length < 2) return;
    setCategoryFeedback(null);

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
        setCategoryFeedback(`Kategori "${trimmed}" berhasil ditambahkan.`);
        prependActivity(`menambahkan kategori layanan "${trimmed}".`);
        setNewCategoryName("");
        setShowAddCategory(false);
      } else {
        setCategoryFeedback(res.error);
      }
    });
  };

  const handleToggleCategory = (cat: AdminCategorySummary) => {
    const nextState = !cat.isActive;
    setCategoryFeedback(null);
    startTransition(async () => {
      const res = await setCategoryActive(cat.id, nextState);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === cat.id ? { ...c, isActive: nextState } : c,
          ),
        );
        setCategoryFeedback(
          `Kategori "${cat.name}" berhasil ${nextState ? "diaktifkan" : "dinonaktifkan"}.`,
        );
        prependActivity(
          `${nextState ? "mengaktifkan" : "menonaktifkan"} kategori layanan "${cat.name}".`,
        );
      } else {
        setCategoryFeedback(res.error);
      }
    });
  };

  const handleDeleteCategory = (cat: AdminCategorySummary) => {
    const lower = cat.name.trim().toLowerCase();
    if (lower === "lainnya" || lower === "layanan lainnya") {
      setCategoryFeedback(
        'Kategori "Lainnya" merupakan kategori penampung utama dan tidak dapat dihapus.',
      );
      return;
    }
    setCategoryFeedback(null);

    startTransition(async () => {
      const res = await deleteCategory(cat.id);
      if (!res.success) {
        setCategoryFeedback(res.error);
        return;
      }

      const movedCount = Math.max(cat.reportCount, res.data.movedCount);
      const fallbackName = res.data.fallbackCategoryName || "Layanan lainnya";

      setCategories((prev) => {
        const withoutTarget = prev.filter((c) => c.id !== cat.id);
        const hasFallback = withoutTarget.some(
          (c) =>
            c.id === res.data.fallbackCategoryId ||
            c.name.toLowerCase().includes("lainnya"),
        );
        if (hasFallback) {
          return withoutTarget.map((c) =>
            c.id === res.data.fallbackCategoryId ||
            c.name.toLowerCase().includes("lainnya")
              ? {
                  ...c,
                  isActive: true,
                  reportCount: c.reportCount + cat.reportCount,
                }
              : c,
          );
        }
        return [
          ...withoutTarget,
          {
            id: res.data.fallbackCategoryId,
            name: fallbackName,
            reportCount: cat.reportCount,
            isActive: true,
          },
        ];
      });

      if (movedCount > 0) {
        setTickets((prev) =>
          prev.map((t) =>
            t.categoryName.toLowerCase() === cat.name.toLowerCase()
              ? { ...t, categoryName: fallbackName }
              : t,
          ),
        );
      }

      setCategoryFeedback(
        movedCount > 0
          ? `Kategori "${cat.name}" dihapus. ${movedCount} laporan dipindahkan ke kategori "${fallbackName}".`
          : `Kategori "${cat.name}" berhasil dihapus.`,
      );
      prependActivity(
        movedCount > 0
          ? `menghapus kategori "${cat.name}" dan memindahkan ${movedCount} laporan ke "${fallbackName}".`
          : `menghapus kategori layanan "${cat.name}".`,
      );
    });
  };

  const activeTargetStatus = selectedTicket
    ? (targetStatuses[selectedTicket.id] ?? "diproses_rw")
    : "diproses_rw";
  const activeProofs = selectedTicket
    ? (proofFiles[selectedTicket.id] ?? [])
    : [];
  const isTicketSaved = selectedTicket
    ? Boolean(savedTickets[selectedTicket.id])
    : false;

  return (
    <StaffShell
      role="admin"
      fullName={initialData.adminName}
      subHeaderLabel="RW 06 Parakansaat"
      unreadCount={initialData.unreadCount}
      avatarUrl={initialData.avatarUrl}
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

          <RekapDownloadButton />
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">
                Pengaduan lintas wilayah
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Admin dapat membuka, membantu penanganan, dan mengubah status
                seluruh tiket.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshTickets}
              disabled={isRefreshing}
              title="Muat ulang daftar & status tiket"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-blue-50 disabled:opacity-60"
            >
              <RefreshCw
                size={13}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </button>
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
                  <th className="px-3.5 py-2.5">Status & Rating</th>
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
                          <div className="flex flex-col items-start gap-1">
                            <Badge status={ticket.status} dot />
                            {ticket.rating != null && (
                              <span
                                title={
                                  ticket.ratingComment ||
                                  `Penilaian warga: ${ticket.rating}/5`
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
                              >
                                <Star
                                  size={11}
                                  className="fill-amber-400 text-amber-400"
                                />
                                {ticket.rating}/5
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-3.5 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
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
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTicket(ticket);
                              }}
                              title={`Hapus tiket ${ticket.ticketNumber}`}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 size={11} />
                              Hapus
                            </button>
                          </div>
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

                {selectedTicket.rating != null && (
                  <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-amber-900">
                        Hasil Penilaian Warga
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={13}
                            className={
                              star <= (selectedTicket.rating ?? 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }
                          />
                        ))}
                        <span className="ml-1 text-xs font-bold text-amber-900">
                          {selectedTicket.rating}/5
                        </span>
                      </div>
                    </div>
                    {selectedTicket.ratingComment && (
                      <p className="mt-1.5 text-xs italic text-amber-900/90">
                        &ldquo;{selectedTicket.ratingComment}&rdquo;
                      </p>
                    )}
                  </div>
                )}

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
                    bukti penyelesaian (maksimal 3 foto).
                  </p>
                </div>

                {/* Daftar foto bukti penanganan terunggah (maks. 3 foto) */}
                {activeProofs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-ink">
                      Foto bukti penanganan ({activeProofs.length}/3)
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {activeProofs.map((proof, idx) => (
                        <div
                          key={proof.id}
                          className="overflow-hidden rounded-xl border border-border bg-surface/40"
                        >
                          {proof.previewUrl && (
                            <div className="relative h-24 w-full bg-slate-900/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={proof.previewUrl}
                                alt={proof.fileName}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute left-2 top-2 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                Bukti {idx + 1}/3
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-ink">
                                {proof.fileName}
                              </p>
                              <p className="text-[10px] text-muted">
                                {formatBytesMb(proof.sizeBytes)} • Terunggah
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveProof(selectedTicket.id, proof.id)
                              }
                              disabled={isPending || uploadingProof}
                              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 size={11} />
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 pt-0.5">
                  <label
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-primary transition-colors sm:text-sm ${
                      uploadingProof || isPending || activeProofs.length >= 3
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-surface"
                    }`}
                  >
                    {uploadingProof ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Upload size={15} />
                    )}
                    <span>
                      {uploadingProof
                        ? "Mengunggah bukti..."
                        : activeProofs.length >= 3
                          ? "Batas maksimal 3 foto bukti tercapai"
                          : `Unggah bukti penanganan • ${activeProofs.length} dari 3`}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={
                        uploadingProof || isPending || activeProofs.length >= 3
                      }
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

                  <button
                    type="button"
                    disabled={isPending || uploadingProof}
                    onClick={() => handleDeleteTicket(selectedTicket)}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Hapus tiket {selectedTicket.ticketNumber}
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
              {accounts.filter((a) => a.role === "warga").length} akun warga •{" "}
              {accounts.filter((a) => a.role !== "warga" && a.isActive).length}{" "}
              akun pengurus aktif
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
            <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs text-primary">
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
                  <option value="warga">Warga</option>
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
            {filteredAccounts.map((acc) => {
              const isEditingRole = editingRoleAccountId === acc.id;
              const isConfirmingDelete = confirmDeleteAccountId === acc.id;
              const isSelfAdmin =
                acc.role === "admin" && acc.fullName === initialData.adminName;
              return (
                <div key={acc.id} className="py-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="sm:w-64">
                      <p className="text-xs font-bold text-ink sm:text-[13px]">
                        {acc.fullName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {roleLabelId(acc.role)} • {acc.regionLabel} •{" "}
                        <span
                          className={
                            acc.isActive
                              ? "text-emerald-700 font-medium"
                              : "font-medium text-red-600"
                          }
                        >
                          {acc.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </p>
                    </div>

                    <p className="flex-1 text-xs text-muted">
                      {acc.permissionDesc}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setConfirmDeleteAccountId(null);
                          handleOpenRoleEditor(acc);
                        }}
                        className="cursor-pointer text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                      >
                        {isEditingRole ? "Tutup ubah peran" : "Ubah peran"}
                      </button>
                      <span className="text-border">•</span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleAccount(acc)}
                        className={`cursor-pointer text-xs font-semibold hover:underline disabled:opacity-50 ${
                          acc.isActive ? "text-amber-700" : "text-emerald-600"
                        }`}
                      >
                        {acc.isActive ? "Nonaktifkan" : "Aktifkan kembali"}
                      </button>
                      {!isSelfAdmin && (
                        <>
                          <span className="text-border">•</span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setEditingRoleAccountId(null);
                              setConfirmDeleteAccountId(
                                isConfirmingDelete ? null : acc.id,
                              );
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            Hapus akun
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isConfirmingDelete && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3">
                      <p className="text-xs text-red-800">
                        Hapus permanen akun{" "}
                        <span className="font-bold">{acc.fullName}</span> (
                        {roleLabelId(acc.role)}) beserta seluruh aksesnya?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteAccount(acc)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Ya, hapus permanen
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmDeleteAccountId(null)}
                          className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditingRole && (
                    <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-blue-200/80 bg-blue-50/50 p-3">
                      <span className="text-xs font-semibold text-ink">
                        Peran baru:
                      </span>
                      <select
                        value={draftRole}
                        onChange={(e) =>
                          setDraftRole(e.target.value as UserRole)
                        }
                        disabled={isPending}
                        className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink focus:border-primary focus:outline-none"
                      >
                        <option value="warga">Warga</option>
                        <option value="ketua_rt">Ketua RT</option>
                        <option value="ketua_rw">Ketua RW</option>
                        <option value="admin">Admin</option>
                      </select>

                      {(draftRole === "warga" || draftRole === "ketua_rt") && (
                        <>
                          <span className="text-xs font-semibold text-ink">
                            Wilayah RT:
                          </span>
                          <select
                            value={draftRegionId}
                            onChange={(e) =>
                              setDraftRegionId(Number(e.target.value))
                            }
                            disabled={isPending}
                            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink focus:border-primary focus:outline-none"
                          >
                            {rtRegions.map((rt) => (
                              <option key={rt.id} value={rt.id}>
                                {rt.name}
                              </option>
                            ))}
                          </select>
                        </>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSaveAccountRole(acc)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                          {isPending && (
                            <Loader2 size={12} className="animate-spin" />
                          )}
                          Simpan peran
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setEditingRoleAccountId(null)}
                          className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Grid 2 Kolom: Data RT/RW & Kategori Layanan */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Kartu Data RT / RW */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Data RT / RW</h2>
                <p className="mt-0.5 text-xs text-muted">
                  RW {rwNumber} • {rwAreaName} • Ketua RW:{" "}
                  <span className="font-semibold text-ink">
                    {accounts.find((a) => a.role === "ketua_rw")?.fullName ??
                      "Belum ditetapkan"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRw((prev) => !prev)}
                className="cursor-pointer text-xs font-semibold text-primary hover:underline"
              >
                {editingRw ? "Tutup" : "Kelola RW"}
              </button>
            </div>

            {rtFeedback && (
              <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs text-primary">
                {rtFeedback}
              </p>
            )}

            {/* Form Pengelolaan Data RW */}
            {editingRw && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface p-3.5">
                <p className="text-xs font-bold text-ink">
                  Pengaturan Wilayah RW
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted">
                      Nomor RW
                    </label>
                    <input
                      type="text"
                      value={rwNumber}
                      onChange={(e) => setRwNumber(e.target.value)}
                      placeholder="06"
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted">
                      Nama Wilayah / Kelurahan
                    </label>
                    <input
                      type="text"
                      value={rwAreaName}
                      onChange={(e) => setRwAreaName(e.target.value)}
                      placeholder="Parakansaat, Bandung"
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted">
                    Ketua RW Aktif
                  </label>
                  <select
                    value={rwLeaderUserId}
                    onChange={(e) => setRwLeaderUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Pilih Ketua RW --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.fullName} ({roleLabelId(acc.role)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveRwSettings}
                    className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    Simpan data RW
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRw(false)}
                    className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs font-semibold text-ink">
              {rtRegions.length} wilayah RT terdaftar •{" "}
              {rtRegions.filter((r) => r.isActive).length} aktif
            </p>

            {/* Chip Pilihan RT */}
            <div className="mt-3 flex flex-wrap gap-2">
              {rtRegions.map((rt) => {
                const isSelected = selectedRt?.id === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      setSelectedRtId(rt.id);
                      setEditingRtId(null);
                    }}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-blue-50 text-primary"
                        : rt.isActive
                          ? "border-border bg-surface/60 text-ink hover:border-primary/40"
                          : "border-border bg-slate-100 text-muted line-through"
                    }`}
                  >
                    {rt.name}
                  </button>
                );
              })}
            </div>

            {/* Detail & Pengelolaan RT Terpilih */}
            {selectedRt && (
              <div className="mt-4 rounded-xl border border-border bg-surface/50 p-3.5">
                {editingRtId === selectedRt.id ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-ink">
                      Ubah Data {selectedRt.name}
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted">
                          Nama RT
                        </label>
                        <input
                          type="text"
                          value={editRtName}
                          onChange={(e) => setEditRtName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted">
                          Ketua RT
                        </label>
                        <select
                          value={editRtLeaderId}
                          onChange={(e) => setEditRtLeaderId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Pilih Ketua RT --</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.fullName} ({roleLabelId(acc.role)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSaveEditRt(selectedRt)}
                        className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                      >
                        Simpan RT
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRtId(null)}
                        className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">
                          {selectedRt.name} / RW {rwNumber}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            selectedRt.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {selectedRt.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Ketua RT:{" "}
                        <span className="font-semibold text-ink">
                          {selectedRt.leaderName}
                        </span>{" "}
                        • {selectedRt.residentCount} akun warga
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStartEditRt(selectedRt)}
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        Edit RT
                      </button>
                      <span className="text-border">•</span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleRtActive(selectedRt)}
                        className="cursor-pointer font-semibold text-amber-700 hover:underline"
                      >
                        {selectedRt.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      {rtRegions.length > 1 && (
                        <>
                          <span className="text-border">•</span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDeleteRt(selectedRt)}
                            className="cursor-pointer font-semibold text-red-600 hover:underline"
                          >
                            Hapus RT
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Tambah RT Baru */}
            {showAddRtForm && (
              <div className="mt-3 space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5">
                <p className="text-xs font-bold text-ink">
                  Tambah Wilayah RT Baru
                </p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted">
                      Nama RT Baru
                    </label>
                    <input
                      type="text"
                      value={newRtName}
                      onChange={(e) => setNewRtName(e.target.value)}
                      placeholder="Contoh: RT 07"
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted">
                      Ketua RT (Opsional)
                    </label>
                    <select
                      value={newRtLeaderId}
                      onChange={(e) => setNewRtLeaderId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      <option value="">-- Belum ditetapkan --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.fullName} ({roleLabelId(acc.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleCreateRt}
                    className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    Simpan RT baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRtForm(false)}
                    className="cursor-pointer rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleOpenAddRt}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface"
              >
                <Plus size={14} />
                Tambah RT
              </button>
              <button
                type="button"
                onClick={() => setEditingRw((prev) => !prev)}
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
                  {categories.filter((c) => c.isActive).length} kategori aktif •{" "}
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

            {categoryFeedback && (
              <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs text-primary">
                {categoryFeedback}
              </p>
            )}

            <ul className="mt-4 space-y-2.5">
              {categories.map((cat) => {
                const isFallbackLainnya =
                  cat.name.trim().toLowerCase() === "lainnya" ||
                  cat.name.trim().toLowerCase() === "layanan lainnya";
                return (
                  <li
                    key={cat.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-1.5 text-xs transition-colors hover:border-border/60 hover:bg-surface/40"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          cat.isActive ? "text-ink" : "text-muted line-through"
                        }`}
                      >
                        {cat.name}
                      </span>
                      {!cat.isActive && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted">
                        {cat.reportCount} laporan
                      </span>
                      {manageCategories && (
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleCategory(cat)}
                            className="cursor-pointer font-semibold text-primary hover:underline disabled:opacity-50"
                          >
                            {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          {!isFallbackLainnya && (
                            <>
                              <span className="text-border">•</span>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeleteCategory(cat)}
                                title={
                                  cat.reportCount > 0
                                    ? `Hapus kategori dan pindahkan ${cat.reportCount} laporan ke Lainnya`
                                    : "Hapus kategori"
                                }
                                className="inline-flex cursor-pointer items-center gap-1 font-semibold text-red-600 hover:underline disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                                Hapus
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {manageCategories && (
              <p className="mt-3 text-[11px] text-muted">
                Menghapus kategori yang memiliki laporan akan otomatis
                memindahkan laporannya ke kategori{" "}
                <span className="font-semibold text-ink">Lainnya</span>.
              </p>
            )}

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
