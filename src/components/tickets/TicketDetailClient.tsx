"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import WargaShell from "@/components/warga/WargaShell";
import StaffShell from "@/components/staff/StaffShell";
import Badge from "@/components/ui/Badge";
import {
  completeTicket,
  deleteDraft,
  deleteTicketByAdmin,
  processTicket,
  rateTicket,
  rejectTicket,
  submitTicket,
  updateDraft,
  verifyTicket,
} from "@/app/actions/tickets";
import {
  deleteAttachment,
  uploadAttachment,
} from "@/app/actions/attachments";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import { validateAttachment, compressImageFile } from "@/utils/upload";
import type { TicketStatus } from "@/types";
import type {
  TicketAttachmentView,
  TicketDetailPageData,
  TicketDetailView,
} from "@/data/ticket-detail-preview";

const MONTHS_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
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

function toWibDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}

function formatFullDateId(iso: string | null | undefined): string {
  const wib = toWibDate(iso);
  if (!wib) return "-";
  return `${wib.getUTCDate()} ${MONTHS_FULL[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
}

function formatFullDateTimeWib(iso: string | null | undefined): string {
  const wib = toWibDate(iso);
  if (!wib) return "-";
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${wib.getUTCDate()} ${MONTHS_FULL[wib.getUTCMonth()]} ${wib.getUTCFullYear()}, ${hh}.${mm} WIB`;
}

function formatShortDateTimeWib(iso: string | null | undefined): string {
  const wib = toWibDate(iso);
  if (!wib) return "-";
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]}, ${hh}.${mm}`;
}

function formatTimelineDateWib(iso: string | null | undefined): string {
  const wib = toWibDate(iso);
  if (!wib) return "-";
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${wib.getUTCDate()} ${MONTHS_SHORT[wib.getUTCMonth()]} ${wib.getUTCFullYear()} • ${hh}.${mm} WIB`;
}

const PROGRESS_STEPS: Array<{ key: TicketStatus; label: string }> = [
  { key: "terkirim", label: "Terkirim" },
  { key: "diverifikasi_rt", label: "Diverifikasi RT" },
  { key: "diproses_rw", label: "Diproses RW" },
  { key: "selesai", label: "Selesai" },
];

function getStepIndex(status: TicketStatus): number {
  switch (status) {
    case "draft":
      return -1;
    case "terkirim":
      return 0;
    case "diverifikasi_rt":
      return 1;
    case "diproses_rw":
      return 2;
    case "selesai":
      return 3;
    case "ditolak":
      return 0;
  }
}

function SafeTicketImage({
  attachment,
  alt,
  onClick,
}: {
  attachment: TicketAttachmentView;
  alt: string;
  onClick?: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const resolvedSrc = attachment.previewUrl ?? signedUrl;

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

  if (!resolvedSrc) {
    return (
      <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-slate-200/80" />
    );
  }

  const isDummyAsset = resolvedSrc.startsWith("/dummy");

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-surface text-left focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <Image
        src={resolvedSrc}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 380px"
        unoptimized={!resolvedSrc.startsWith("/")}
        className={`object-cover transition-transform duration-300 ${
          isDummyAsset
            ? "scale-[1.03] group-hover:scale-[1.06]"
            : "group-hover:scale-[1.03]"
        }`}
      />
    </button>
  );
}

export default function TicketDetailClient({
  data,
}: {
  data: TicketDetailPageData;
}) {
  const router = useRouter();
  const { categories, regions } = data;
  const [previewRole, setPreviewRole] = useState(data.viewer.role);

  useEffect(() => {
    const syncRole = () => {
      if (!data.isPreview) return;
      try {
        const saved = localStorage.getItem("sipandu_last_role");
        if (
          saved === "admin" ||
          saved === "ketua_rw" ||
          saved === "ketua_rt" ||
          saved === "warga"
        ) {
          setPreviewRole(saved);
        }
      } catch {
        // ignore
      }
    };
    syncRole();
    window.addEventListener("sipandu-profile-change", syncRole);
    return () => window.removeEventListener("sipandu-profile-change", syncRole);
  }, [data.isPreview]);

  const viewer = useMemo(() => {
    if (!data.isPreview) return data.viewer;
    if (previewRole === "admin") {
      return {
        ...data.viewer,
        fullName: "Rina Marlina",
        role: "admin" as const,
        roleLabel: "Admin",
        regionLabel: "Seluruh Wilayah RW 06",
      };
    }
    if (previewRole === "ketua_rw") {
      return {
        ...data.viewer,
        fullName: "Bambang Heryana",
        role: "ketua_rw" as const,
        roleLabel: "Ketua RW",
        regionLabel: "RW 06 Parakan Saat",
      };
    }
    if (previewRole === "ketua_rt") {
      return {
        ...data.viewer,
        fullName: "Agus Setiawan",
        role: "ketua_rt" as const,
        roleLabel: "Ketua RT",
        regionLabel: "RT 03 / RW 06",
      };
    }
    return data.viewer;
  }, [data.isPreview, data.viewer, previewRole]);
  const [ticket, setTicket] = useState<TicketDetailView | null>(data.ticket);
  const [prevDataTicket, setPrevDataTicket] = useState<TicketDetailView | null>(
    data.ticket,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (prevDataTicket !== data.ticket) {
    setPrevDataTicket(data.ticket);
    setTicket(data.ticket);
  }

  const [copied, setCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // State penilaian warga (rateTicket)
  const [selectedRating, setSelectedRating] = useState<number>(
    data.ticket?.rating ?? 0,
  );
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>(
    data.ticket?.ratingComment ?? "",
  );
  const [showCommentInput, setShowCommentInput] = useState<boolean>(false);

  // State tindakan RT / RW / Draf Warga
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rtVerifyNote, setRtVerifyNote] = useState(
    `Lokasi dan kondisi sesuai laporan ${data.ticket?.regionName ?? "RT"}. Diteruskan ke Ketua RW untuk tindak lanjut.`,
  );
  const [rwProcessNote, setRwProcessNote] = useState(
    "Pengurus RW menjadwalkan petugas dan warga untuk penanganan di lokasi kejadian.",
  );
  const [rwCompleteNote, setRwCompleteNote] = useState(
    "Penanganan lapangan telah selesai dilaksanakan. Foto bukti penyelesaian dilampirkan.",
  );
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftTitle, setDraftTitle] = useState(data.ticket?.title ?? "");
  const [draftCategoryId, setDraftCategoryId] = useState(
    String(data.ticket?.categoryId ?? 1),
  );
  const [draftRegionId, setDraftRegionId] = useState(
    String(data.ticket?.regionId ?? 3),
  );
  const [draftLandmark, setDraftLandmark] = useState(
    data.ticket?.locationLandmark ?? "",
  );
  const [draftDescription, setDraftDescription] = useState(
    data.ticket?.description ?? "",
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const draftPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const backLink = useMemo(() => {
    if (viewer.role === "ketua_rt") {
      return { href: "/dashboard/rt", label: "Kembali ke ruang Ketua RT" };
    }
    if (viewer.role === "ketua_rw") {
      return { href: "/dashboard/rw", label: "Kembali ke ruang Ketua RW" };
    }
    if (viewer.role === "admin") {
      return { href: "/dashboard/admin", label: "Kembali ke ruang Admin" };
    }
    return {
      href: "/dashboard/warga#pengaduan-saya",
      label: "Kembali ke pengaduan saya",
    };
  }, [viewer.role]);

  const wrapInRoleShell = (content: React.ReactNode) => {
    if (
      viewer.role === "ketua_rt" ||
      viewer.role === "ketua_rw" ||
      viewer.role === "admin"
    ) {
      return (
        <StaffShell
          role={viewer.role}
          fullName={viewer.fullName}
          subHeaderLabel={`${viewer.roleLabel} • ${viewer.regionLabel}`}
          unreadCount={viewer.unreadCount}
          avatarUrl={viewer.avatarUrl}
        >
          {content}
        </StaffShell>
      );
    }

    return (
      <WargaShell
        activeMenu="pengaduan"
        fullName={viewer.fullName}
        roleLabel={viewer.roleLabel}
        regionLabel={viewer.regionLabel}
        unreadCount={viewer.unreadCount}
        avatarUrl={viewer.avatarUrl}
      >
        {content}
      </WargaShell>
    );
  };

  if (!ticket) {
    return wrapInRoleShell(
      <div>
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={14} />
          {backLink.label}
        </Link>

        <div className="mt-6 rounded-2xl border border-border bg-white p-8 text-center">
          <AlertCircle size={28} className="mx-auto text-muted" />
          <h1 className="mt-3 text-lg font-bold text-ink">
            Tiket pengaduan tidak ditemukan
          </h1>
          <p className="mt-1 text-xs text-muted">
            Nomor tiket tidak terdaftar atau Anda tidak memiliki akses ke
            laporan ini.
          </p>
          <Link
            href={backLink.href}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            {backLink.label}
          </Link>
        </div>
      </div>,
    );
  }

  const reportPhotos = ticket.attachments.filter((a) => a.type === "laporan");
  const completionPhotos = ticket.attachments.filter(
    (a) => a.type === "penyelesaian",
  );
  const allLightboxPhotos = [...reportPhotos, ...completionPhotos];

  const isOwner = viewer.userId === ticket.userId;
  const currentStepIdx = getStepIndex(ticket.status);

  const handleCopyTicketNumber = async () => {
    try {
      await navigator.clipboard.writeText(ticket.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleRefreshStatus = () => {
    setFeedback(null);
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      setFeedback({
        type: "success",
        message: "Status penanganan dan kronologi tiket telah diperbarui.",
      });
    }, 550);
  };

  // --- Handler Upload Foto (Laporan saat Draf / Penyelesaian saat RW) ---
  const handleUploadAttachment = async (
    file: File,
    type: "laporan" | "penyelesaian",
  ) => {
    setFeedback(null);
    const check = validateAttachment(file);
    if (!check.valid) {
      setFeedback({
        type: "error",
        message: check.error ?? "Format atau ukuran foto tidak sesuai.",
      });
      return;
    }

    if (type === "laporan" && reportPhotos.length >= 3) {
      setFeedback({
        type: "error",
        message: "Maksimal 3 foto laporan yang dapat dilampirkan.",
      });
      return;
    }

    if (type === "penyelesaian" && completionPhotos.length >= 3) {
      setFeedback({
        type: "error",
        message: "Maksimal 3 foto bukti penyelesaian yang dapat dilampirkan.",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      let storagePath: string | null = null;
      let previewUrl = URL.createObjectURL(file);
      let attachmentId = Date.now();

      if (isSupabaseConfigured()) {
        const fileToUpload = await compressImageFile(file);
        const fd = new FormData();
        fd.set("ticket_id", String(ticket.id));
        fd.set("type", type);
        fd.set("file", fileToUpload);

        const res = await uploadAttachment(fd);
        if (!res.success) {
          throw new Error(res.error);
        }

        attachmentId = res.data.id;
        storagePath = res.data.storagePath;
        if (res.data.signedUrl) {
          previewUrl = res.data.signedUrl;
        }
      }

      const newAtt: TicketAttachmentView = {
        id: attachmentId,
        type,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath,
        previewUrl,
        createdAt: new Date().toISOString(),
        uploaderName: viewer.fullName,
      };

      setTicket((prev) =>
        prev ? { ...prev, attachments: [...prev.attachments, newAtt] } : prev,
      );
      setFeedback({
        type: "success",
        message:
          type === "penyelesaian"
            ? "Foto bukti penyelesaian berhasil diunggah."
            : "Foto laporan berhasil ditambahkan.",
      });
      if (isSupabaseConfigured()) router.refresh();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Gagal mengunggah foto lampiran.";
      setFeedback({ type: "error", message });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteTicketByAdmin = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteTicketByAdmin(ticket.id);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      router.push("/dashboard/admin");
    });
  };

  const handleDeleteAttachment = (attachmentId: number) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteAttachment(attachmentId);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.filter(
                (a) => a.id !== attachmentId,
              ),
            }
          : prev,
      );
      setFeedback({ type: "success", message: "Foto lampiran dihapus." });
    });
  };

  // --- Handler Penilaian Warga (rateTicket) ---
  const handleRateSubmit = () => {
    setFeedback(null);
    if (selectedRating < 1 || selectedRating > 5) {
      setShowCommentInput(true);
      setFeedback({
        type: "error",
        message: "Silakan pilih bintang penilaian (1 sampai 5) terlebih dahulu.",
      });
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("ticket_id", String(ticket.id));
      fd.set("rating", String(selectedRating));
      if (ratingComment.trim()) {
        fd.set("rating_comment", ratingComment.trim());
      }

      const res = await rateTicket(fd);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }

      const nowIso = new Date().toISOString();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              rating: selectedRating,
              ratingComment: ratingComment.trim() || null,
              ratedAt: nowIso,
            }
          : prev,
      );
      setShowCommentInput(false);
      setFeedback({
        type: "success",
        message: "Terima kasih! Penilaian Anda telah tersimpan.",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  // --- Handler Transisi Status sesuai Matriks Bab 2 ---
  const appendLocalTimeline = (toStatus: TicketStatus, note: string) => {
    const nowIso = new Date().toISOString();
    setTicket((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: toStatus,
        updatedAt: nowIso,
        ...(toStatus === "terkirim" ? { submittedAt: nowIso } : {}),
        ...(toStatus === "diverifikasi_rt" ? { verifiedAt: nowIso } : {}),
        ...(toStatus === "diproses_rw" ? { processedAt: nowIso } : {}),
        ...(toStatus === "selesai" ? { completedAt: nowIso } : {}),
        ...(toStatus === "ditolak"
          ? { rejectedAt: nowIso, rejectionReason: note }
          : {}),
        timeline: [
          ...prev.timeline,
          {
            id: Date.now(),
            fromStatus: prev.status,
            toStatus,
            actorName: viewer.fullName,
            actorRoleDisplay: `${viewer.roleLabel} • ${viewer.regionLabel}`,
            note,
            createdAt: nowIso,
          },
        ],
      };
    });
  };

  const handleSubmitDraft = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await submitTicket(ticket.id);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      appendLocalTimeline(
        "terkirim",
        `Laporan berhasil dikirim ke Ketua ${ticket.regionName}.`,
      );
      setFeedback({
        type: "success",
        message: "Pengaduan berhasil dikirim ke Ketua RT!",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  const handleUpdateDraft = () => {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", draftTitle.trim());
      fd.set("description", draftDescription.trim());
      fd.set("category_id", draftCategoryId);
      fd.set("region_id", draftRegionId);
      fd.set("location_landmark", draftLandmark.trim());

      const res = await updateDraft(ticket.id, fd);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }

      const catObj = categories.find((c) => String(c.id) === draftCategoryId);
      const regObj = regions.find((r) => String(r.id) === draftRegionId);

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              title: draftTitle.trim(),
              description: draftDescription.trim(),
              categoryId: Number(draftCategoryId),
              categoryName: catObj?.name ?? prev.categoryName,
              regionId: Number(draftRegionId),
              regionName: regObj?.name ?? prev.regionName,
              locationLandmark:
                draftLandmark.trim() || prev.locationLandmark,
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
      setEditingDraft(false);
      setFeedback({
        type: "success",
        message: "Perubahan draf pengaduan berhasil disimpan.",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  const handleDeleteDraft = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteDraft(ticket.id);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      router.push("/dashboard/warga");
    });
  };

  const handleVerifyRt = () => {
    setFeedback(null);
    const noteText =
      rtVerifyNote.trim() ||
      `Lokasi dan kondisi sesuai laporan ${ticket.regionName}. Diteruskan ke Ketua RW 06.`;
    startTransition(async () => {
      const res = await verifyTicket(ticket.id, noteText);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      appendLocalTimeline("diverifikasi_rt", noteText);
      setFeedback({
        type: "success",
        message: "Tiket diverifikasi dan diteruskan ke Ketua RW beserta catatan.",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  const handleRejectRt = () => {
    setFeedback(null);
    if (rejectReason.trim().length < 5) {
      setFeedback({
        type: "error",
        message: "Alasan penolakan wajib diisi minimal 5 karakter.",
      });
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("ticket_id", String(ticket.id));
      fd.set("reason", rejectReason.trim());

      const res = await rejectTicket(fd);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      appendLocalTimeline("ditolak", rejectReason.trim());
      setShowRejectBox(false);
      setFeedback({
        type: "success",
        message: "Pengaduan ditolak beserta alasan resmi.",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  const handleProcessRw = () => {
    setFeedback(null);
    const noteText =
      rwProcessNote.trim() ||
      "Pengurus RW mulai melakukan penanganan di lokasi kejadian.";
    startTransition(async () => {
      const res = await processTicket(ticket.id, noteText);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      appendLocalTimeline("diproses_rw", noteText);
      setFeedback({
        type: "success",
        message: "Status tiket diperbarui menjadi Diproses RW beserta pesan penanganan.",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  const handleCompleteRw = () => {
    setFeedback(null);
    if (completionPhotos.length === 0) {
      setFeedback({
        type: "error",
        message:
          "Wajib mengunggah minimal 1 foto bukti penyelesaian sebelum menyelesaikan tiket.",
      });
      return;
    }

    const noteText =
      rwCompleteNote.trim() ||
      "Penanganan selesai dilaksanakan. Foto bukti penyelesaian dilampirkan.";

    startTransition(async () => {
      const res = await completeTicket(ticket.id, noteText);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      appendLocalTimeline("selesai", noteText);
      setFeedback({
        type: "success",
        message: "Pengaduan berhasil ditandai Selesai!",
      });
      if (isSupabaseConfigured()) router.refresh();
    });
  };

  // --- Banner Kontekstual Berdasarkan Status Tiket ---
  const renderStatusAlertBanner = () => {
    if (ticket.status === "selesai") {
      return (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-emerald-600"
          />
          <div>
            <p className="text-xs font-bold text-emerald-800 sm:text-[13px]">
              Pengaduan selesai. Terima kasih sudah peduli!
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-700/90">
              Pengurus RW menyelesaikan penanganan pada{" "}
              {formatFullDateId(ticket.completedAt ?? ticket.updatedAt)}. Lihat
              kronologi dan bukti penyelesaian di bawah.
            </p>
          </div>
        </div>
      );
    }

    if (ticket.status === "ditolak") {
      return (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4">
          <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="text-xs font-bold text-red-800 sm:text-[13px]">
              Pengaduan belum dapat ditindaklanjuti (Ditolak)
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-700">
              Alasan penolakan:{" "}
              {ticket.rejectionReason ??
                "Silakan periksa catatan pengurus pada kronologi di bawah."}
            </p>
          </div>
        </div>
      );
    }

    if (ticket.status === "diproses_rw") {
      return (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-bold text-amber-900 sm:text-[13px]">
              Pengaduan sedang ditangani di lapangan oleh pengurus RW
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90">
              Pengurus RW 06 sedang menindaklanjuti laporan ini. Bukti
              penyelesaian akan dilampirkan setelah pekerjaan selesai.
            </p>
          </div>
        </div>
      );
    }

    if (ticket.status === "diverifikasi_rt") {
      return (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-purple-200 bg-purple-50/70 px-5 py-4">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-purple-600"
          />
          <div>
            <p className="text-xs font-bold text-purple-900 sm:text-[13px]">
              Laporan lolos verifikasi Ketua {ticket.regionName}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-purple-800/90">
              Tiket telah diteruskan ke Ketua RW {ticket.regionRw} untuk
              penjadwalan tindakan lapangan.
            </p>
          </div>
        </div>
      );
    }

    if (ticket.status === "terkirim") {
      return (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-4">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-bold text-blue-900 sm:text-[13px]">
              Laporan terkirim dan menunggu verifikasi Ketua {ticket.regionName}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-blue-800/90">
              Ketua RT wilayah lokasi kejadian akan memeriksa kelengkapan
              laporan sebelum diteruskan ke RW.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-white px-5 py-4">
        <Info size={18} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="text-xs font-bold text-ink sm:text-[13px]">
            Laporan masih tersimpan sebagai Draf
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Periksa kembali informasi dan foto laporan Anda, lalu kirim ke Ketua
            RT agar nomor tiket resmi diterbitkan.
          </p>
        </div>
      </div>
    );
  };

  // --- Kartu Aksi Berdasarkan Matriks Role × Status (Bab 2) ---
  const renderRoleActionCard = () => {
    // 1. Warga + Selesai -> Kartu "Bagaimana hasilnya?" sesuai desain Pelacakan Tiket Desktop.png
    if (viewer.role === "warga" && ticket.status === "selesai") {
      const alreadyRated = Boolean(ticket.ratedAt || ticket.rating);
      const displayStars = hoverRating || selectedRating || ticket.rating || 0;

      return (
        <section className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Bagaimana hasilnya?</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Masukan Anda membantu kami memperbaiki layanan lingkungan.
          </p>

          <div
            className="mt-4 flex items-center gap-2"
            role="radiogroup"
            aria-label="Penilaian penyelesaian tiket"
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= displayStars;
              return (
                <button
                  key={star}
                  type="button"
                  disabled={alreadyRated || isPending}
                  onMouseEnter={() => !alreadyRated && setHoverRating(star)}
                  onMouseLeave={() => !alreadyRated && setHoverRating(0)}
                  onClick={() => {
                    if (alreadyRated) return;
                    setSelectedRating(star);
                    setShowCommentInput(true);
                    setFeedback(null);
                  }}
                  aria-label={`Beri ${star} bintang`}
                  className="rounded-md p-0.5 transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
                >
                  <Star
                    size={22}
                    strokeWidth={1.8}
                    className={
                      filled
                        ? "fill-primary text-primary"
                        : "fill-transparent text-primary"
                    }
                  />
                </button>
              );
            })}
          </div>

          {alreadyRated ? (
            <div className="mt-4 rounded-xl border border-blue-200/70 bg-white px-3.5 py-3">
              <p className="text-xs font-semibold text-primary">
                Penilaian terkirim ({ticket.rating ?? selectedRating}/5 bintang)
              </p>
              {ticket.ratingComment && (
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  “{ticket.ratingComment}”
                </p>
              )}
            </div>
          ) : (
            <>
              {showCommentInput && (
                <div className="mt-3.5">
                  <textarea
                    name="rating_comment"
                    rows={2}
                    maxLength={500}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Tulis ulasan atau masukan singkat (opsional)..."
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              )}

              <button
                type="button"
                disabled={isPending}
                onClick={handleRateSubmit}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200/80 bg-white py-2.5 text-xs font-semibold text-primary shadow-2xs transition-colors hover:bg-blue-50/60 disabled:opacity-60"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Beri penilaian
              </button>
            </>
          )}
        </section>
      );
    }

    // 2. Warga + Draft (Pemilik) -> Edit Draf, Upload Foto (Max 3), Kirim Pengaduan, Hapus Draf
    if (viewer.role === "warga" && isOwner && ticket.status === "draft") {
      return (
        <section className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Kelola draf laporan</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Anda masih dapat mengubah isi laporan atau menambah foto (maks. 3)
            sebelum dikirim ke Ketua RT.
          </p>

          <input
            ref={draftPhotoInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUploadAttachment(file, "laporan");
              e.target.value = "";
            }}
          />

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmitDraft}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Kirim pengaduan ke RT
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setEditingDraft((v) => !v)}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-2 text-xs font-semibold text-ink hover:bg-surface"
              >
                <Edit3 size={13} />
                {editingDraft ? "Batal edit" : "Edit draf"}
              </button>

              <button
                type="button"
                disabled={uploadingPhoto || reportPhotos.length >= 3}
                onClick={() => draftPhotoInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-2 text-xs font-semibold text-primary hover:bg-surface disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                Foto ({reportPhotos.length}/3)
              </button>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteDraft}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={13} />
              Hapus draf
            </button>
          </div>
        </section>
      );
    }

    // 3. Ketua RT + Terkirim -> Verifikasi Tiket / Tolak Tiket
    if (viewer.role === "ketua_rt" && ticket.status === "terkirim") {
      return (
        <section className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">
            Verifikasi Ketua {ticket.regionName}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Pastikan laporan berada di wilayah Anda sebelum diteruskan ke Ketua
            RW 06. Pesan/catatan di bawah akan tampil pada kronologi warga.
          </p>

          <div className="mt-3.5">
            <label className="block text-[11px] font-semibold text-ink">
              Pesan / catatan verifikasi RT untuk warga &amp; RW
            </label>
            <textarea
              rows={2}
              value={rtVerifyNote}
              onChange={(e) => setRtVerifyNote(e.target.value)}
              placeholder="Tulis catatan verifikasi lokasi atau arahan tindak lanjut..."
              className="mt-1.5 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-3.5 space-y-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={handleVerifyRt}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Verifikasi tiket
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowRejectBox((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Tolak tiket
            </button>

            {showRejectBox && (
              <div className="rounded-xl border border-red-200 bg-white p-3">
                <label className="block text-[11px] font-semibold text-ink">
                  Alasan penolakan (wajib)
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Lokasi berada di luar wilayah RW 06..."
                  className="mt-1.5 w-full rounded-lg border border-border px-2.5 py-2 text-xs text-ink focus:border-red-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRejectRt}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Konfirmasi penolakan
                </button>
              </div>
            )}
          </div>
        </section>
      );
    }

    // 4. Ketua RW / Admin + Diverifikasi RT -> Mulai Proses
    if (
      (viewer.role === "ketua_rw" || viewer.role === "admin") &&
      ticket.status === "diverifikasi_rt"
    ) {
      return (
        <section className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">Tindak lanjut RW</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Tiket telah diverifikasi Ketua RT dan siap dijadwalkan untuk
            penanganan lapangan.
          </p>
          <div className="mt-3.5">
            <label className="block text-[11px] font-semibold text-ink">
              Pesan / komentar tindak lanjut RW untuk warga
            </label>
            <textarea
              rows={2}
              value={rwProcessNote}
              onChange={(e) => setRwProcessNote(e.target.value)}
              placeholder="Tulis rencana jadwal atau petugas penanganan lapangan..."
              className="mt-1.5 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleProcessRw}
            className="mt-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Mulai proses penanganan
          </button>
        </section>
      );
    }

    // 5. Ketua RW / Admin + Diproses RW -> Upload Foto Bukti (maks 3) + Selesaikan Tiket
    if (
      (viewer.role === "ketua_rw" || viewer.role === "admin") &&
      ticket.status === "diproses_rw"
    ) {
      return (
        <section className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">
            Penyelesaian pengaduan RW
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Unggah foto bukti penyelesaian lapangan (minimal 1, maksimal 3 foto)
            dan tulis pesan hasil penanganan untuk warga.
          </p>

          <input
            ref={proofInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUploadAttachment(file, "penyelesaian");
              e.target.value = "";
            }}
          />

          <div className="mt-3.5">
            <label className="block text-[11px] font-semibold text-ink">
              Pesan / komentar hasil penyelesaian RW
            </label>
            <textarea
              rows={2}
              value={rwCompleteNote}
              onChange={(e) => setRwCompleteNote(e.target.value)}
              placeholder="Tulis ringkasan hasil pekerjaan lapangan yang telah diselesaikan..."
              className="mt-1.5 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-3.5 space-y-2.5">
            <button
              type="button"
              disabled={uploadingPhoto || completionPhotos.length >= 3}
              onClick={() => proofInputRef.current?.click()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-2.5 text-xs font-semibold text-primary hover:bg-blue-50/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingPhoto ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {completionPhotos.length >= 3
                ? "Batas 3 foto bukti tercapai (3/3)"
                : `Unggah foto bukti (${completionPhotos.length}/3)`}
            </button>

            <button
              type="button"
              disabled={isPending || completionPhotos.length === 0}
              onClick={handleCompleteRw}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Selesaikan tiket
            </button>
          </div>
        </section>
      );
    }

    return null;
  };

  return wrapInRoleShell(
    <div>
      {/* Tautan kembali */}
      <Link
        href={backLink.href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={14} />
        {backLink.label}
      </Link>

      {/* Header Nomor Tiket, Judul & Salin Nomor Tiket */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            NOMOR TIKET • {ticket.ticketNumber}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-[26px]">
            {ticket.title}
          </h1>
          <p className="mt-1 text-xs text-muted">
            Dilaporkan oleh {ticket.reporterName} •{" "}
            {formatFullDateTimeWib(ticket.submittedAt ?? ticket.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={handleCopyTicketNumber}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-primary shadow-2xs transition-colors hover:bg-surface"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700">Nomor disalin</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Salin nomor tiket</span>
              </>
            )}
          </button>

          {viewer.role === "admin" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteTicketByAdmin}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 shadow-2xs transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              <span>Hapus tiket</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Aksi (Error / Sukses) */}
      {feedback && (
        <div
          className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pesan"
            className="cursor-pointer rounded p-0.5 hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Banner Kontekstual Status */}
      {renderStatusAlertBanner()}

      {/* Kartu Stepper Status Penanganan */}
      <section className="mt-5 rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink">Status penanganan</h2>
          <button
            type="button"
            disabled={isRefreshing || isPending}
            onClick={handleRefreshStatus}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              className={
                isRefreshing ? "animate-spin text-primary" : "text-primary"
              }
            />
            <span>{isRefreshing ? "Memuat ulang..." : "Refresh status"}</span>
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <Badge status={ticket.status} dot />
          <span className="text-xs text-muted">
            Diperbarui {formatShortDateTimeWib(ticket.updatedAt)}
          </span>
        </div>

        {ticket.status === "ditolak" ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={13} strokeWidth={2.6} />
              </span>
              <span className="text-xs font-semibold text-emerald-800">
                Terkirim
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                <X size={13} strokeWidth={2.6} />
              </span>
              <span className="text-xs font-semibold text-red-700">
                Ditolak
              </span>
            </div>
            <div className="flex items-center gap-2.5 opacity-45">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-bold text-muted">
                3
              </span>
              <span className="text-xs font-medium text-muted">
                Diproses RW
              </span>
            </div>
            <div className="flex items-center gap-2.5 opacity-45">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-bold text-muted">
                4
              </span>
              <span className="text-xs font-medium text-muted">Selesai</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PROGRESS_STEPS.map((step, idx) => {
              const reached = currentStepIdx >= idx;
              return (
                <div key={step.key} className="flex items-center gap-2.5">
                  {reached ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check size={13} strokeWidth={2.6} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-bold text-muted">
                      {idx + 1}
                    </span>
                  )}
                  <span
                    className={
                      reached
                        ? "text-xs font-semibold text-emerald-800"
                        : "text-xs font-medium text-muted"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Grid Utama 2 Kolom */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Kolom Kiri (8/12) */}
        <div className="space-y-5 lg:col-span-8">
          {/* Form Edit Draf (bila mode edit draf aktif) */}
          {editingDraft && ticket.status === "draft" && isOwner && (
            <section className="rounded-2xl border border-primary/30 bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-ink">
                Ubah draf pengaduan
              </h2>
              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Judul laporan
                  </label>
                  <input
                    name="title"
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Kategori
                    </label>
                    <select
                      name="category_id"
                      value={draftCategoryId}
                      onChange={(e) => setDraftCategoryId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Wilayah lokasi kejadian
                    </label>
                    <select
                      name="region_id"
                      value={draftRegionId}
                      onChange={(e) => setDraftRegionId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      {regions.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.name} / RW {reg.rw}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Patokan lokasi
                  </label>
                  <input
                    name="location_landmark"
                    type="text"
                    value={draftLandmark}
                    onChange={(e) => setDraftLandmark(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Deskripsi lengkap
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border px-3.5 py-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDraft(false)}
                    className="cursor-pointer rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleUpdateDraft}
                    className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    Simpan perubahan
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 1. Ringkasan Pengaduan */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">
              Ringkasan pengaduan
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-ink/90 sm:text-[13px]">
              {ticket.description}
            </p>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-bold text-ink">
                  {ticket.locationLandmark}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {ticket.locationSubdetail}
                </p>
              </div>
            </div>
          </section>

          {/* 2. Foto Laporan & Bukti Penyelesaian */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">
              Foto laporan &amp; bukti penyelesaian
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Kondisi sebelum dan sesudah penanganan (maksimal 3 foto per
              bagian).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Foto Laporan Warga (Sebelum) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-ink">
                    Foto laporan warga ({reportPhotos.length}/3)
                  </p>
                </div>

                {reportPhotos.length > 0 ? (
                  <div className="space-y-3">
                    {reportPhotos.map((att, idx) => (
                      <div
                        key={att.id}
                        className="rounded-xl border border-border/80 bg-surface/40 p-2.5"
                      >
                        <SafeTicketImage
                          attachment={att}
                          alt={`Foto laporan warga ${idx + 1} - ${ticket.title}`}
                          onClick={() => setLightboxIndex(idx)}
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">
                              Foto #{idx + 1} • {att.fileName}
                            </p>
                            <p className="text-[11px] text-muted">
                              {formatFullDateId(att.createdAt)} •{" "}
                              {att.uploaderName}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setLightboxIndex(idx)}
                              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              Perbesar
                              <ArrowRight size={11} />
                            </button>
                            {(ticket.status === "draft" ||
                              ticket.status === "terkirim") &&
                              isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="cursor-pointer text-[11px] font-semibold text-red-600 hover:underline"
                                >
                                  Hapus
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center">
                    <p className="text-xs font-semibold text-ink">
                      Belum ada foto laporan
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      Pelapor belum menyertakan foto pada laporan ini.
                    </p>
                  </div>
                )}

                {isOwner &&
                  (ticket.status === "draft" ||
                    ticket.status === "terkirim") && (
                    <label
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        reportPhotos.length >= 3 || uploadingPhoto
                          ? "cursor-not-allowed border-border bg-surface text-muted"
                          : "cursor-pointer border-primary/50 bg-blue-50/40 text-primary hover:bg-blue-50/80"
                      }`}
                    >
                      {uploadingPhoto ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>
                        {reportPhotos.length >= 3
                          ? "Maksimal 3 foto laporan tercapai (3/3)"
                          : `Unggah foto laporan (${reportPhotos.length}/3)`}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={reportPhotos.length >= 3 || uploadingPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            void handleUploadAttachment(file, "laporan");
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
              </div>

              {/* Bukti Penyelesaian dari RW (Sesudah) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-700">
                    Bukti penyelesaian RW ({completionPhotos.length}/3)
                  </p>
                </div>

                {completionPhotos.length > 0 ? (
                  <div className="space-y-3">
                    {completionPhotos.map((att, idx) => (
                      <div
                        key={att.id}
                        className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-2.5"
                      >
                        <SafeTicketImage
                          attachment={att}
                          alt={`Bukti penyelesaian RW ${idx + 1} - ${ticket.title}`}
                          onClick={() =>
                            setLightboxIndex(reportPhotos.length + idx)
                          }
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-emerald-800">
                              Bukti #{idx + 1} • {att.fileName}
                            </p>
                            <p className="text-[11px] text-muted">
                              {formatFullDateId(att.createdAt)} •{" "}
                              {att.uploaderName}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxIndex(reportPhotos.length + idx)
                              }
                              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              Perbesar
                              <ArrowRight size={11} />
                            </button>
                            {(viewer.role === "ketua_rw" ||
                              viewer.role === "admin") &&
                              ticket.status === "diproses_rw" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(att.id)}
                                  className="cursor-pointer text-[11px] font-semibold text-red-600 hover:underline"
                                >
                                  Hapus
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center">
                    <p className="text-xs font-semibold text-ink">
                      Bukti penyelesaian belum tersedia
                    </p>
                    <p className="mt-1 max-w-[230px] text-[11px] leading-relaxed text-muted">
                      Foto kondisi sesudah penanganan akan diunggah oleh
                      pengurus RW setelah pekerjaan lapangan selesai.
                    </p>
                  </div>
                )}

                {(viewer.role === "ketua_rw" || viewer.role === "admin") &&
                  ticket.status === "diproses_rw" && (
                    <label
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        completionPhotos.length >= 3 || uploadingPhoto
                          ? "cursor-not-allowed border-border bg-surface text-muted"
                          : "cursor-pointer border-emerald-400/70 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      {uploadingPhoto ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>
                        {completionPhotos.length >= 3
                          ? "Maksimal 3 foto bukti tercapai (3/3)"
                          : `Unggah foto bukti (${completionPhotos.length}/3)`}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={
                          completionPhotos.length >= 3 || uploadingPhoto
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            void handleUploadAttachment(file, "penyelesaian");
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
              </div>
            </div>
          </section>

          {/* 3. Kronologi Penanganan */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Kronologi penanganan
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Setiap status, pesan, dan komentar dari pengurus RT/RW
                  tercatat secara transparan.
                </p>
              </div>
            </div>

            {ticket.timeline.length === 0 ? (
              <p className="mt-4 text-xs text-muted">
                Belum ada riwayat pembaruan status untuk tiket ini.
              </p>
            ) : (
              <ol className="mt-5 space-y-0">
                {ticket.timeline.map((entry, idx) => {
                  const isLast = idx === ticket.timeline.length - 1;
                  const isFinalSuccess =
                    isLast && entry.toStatus === "selesai";
                  const isRejected = entry.toStatus === "ditolak";
                  const isStaffStatus =
                    entry.toStatus === "diverifikasi_rt" ||
                    entry.toStatus === "diproses_rw" ||
                    entry.toStatus === "selesai" ||
                    entry.toStatus === "ditolak";

                  const fallbackNote =
                    entry.toStatus === "diverifikasi_rt"
                      ? `Laporan telah diverifikasi oleh Ketua ${ticket.regionName} dan diteruskan ke RW ${ticket.regionRw}.`
                      : entry.toStatus === "diproses_rw"
                        ? `Pengurus RW ${ticket.regionRw} sedang menindaklanjuti penanganan di lapangan.`
                        : entry.toStatus === "selesai"
                          ? "Penanganan lapangan telah selesai dilaksanakan oleh pengurus RW."
                          : entry.toStatus === "ditolak"
                            ? (ticket.rejectionReason ??
                              "Laporan belum dapat ditindaklanjuti sesuai ketentuan wilayah.")
                            : `Laporan dikirim oleh pelapor dan diterima pada sistem SIPANDU.`;

                  const resolvedNote = entry.note?.trim() || fallbackNote;

                  const commentBadgeLabel =
                    entry.toStatus === "diverifikasi_rt"
                      ? `Pesan / Catatan Ketua ${ticket.regionName}`
                      : entry.toStatus === "diproses_rw"
                        ? `Pesan / Komentar Ketua RW ${ticket.regionRw}`
                        : entry.toStatus === "selesai"
                          ? `Pesan Penyelesaian RW ${ticket.regionRw}`
                          : entry.toStatus === "ditolak"
                            ? "Alasan Penolakan Pengurus"
                            : "Keterangan Pengiriman Laporan";

                  return (
                    <li
                      key={entry.id}
                      className="relative flex gap-3.5 pb-6 last:pb-0"
                    >
                      {/* Garis vertikal penghubung */}
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute top-6 bottom-0 left-[11px] w-px bg-border"
                        />
                      )}

                      {/* Lingkaran ikon status */}
                      {isRejected ? (
                        <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                          <X size={13} strokeWidth={2.5} />
                        </span>
                      ) : isFinalSuccess ? (
                        <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <Check size={13} strokeWidth={2.6} />
                        </span>
                      ) : (
                        <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50 text-emerald-600">
                          <Check size={13} strokeWidth={2.4} />
                        </span>
                      )}

                      {/* Isi entri kronologi */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Badge status={entry.toStatus} dot />
                          <span className="text-[11px] text-muted">
                            {formatTimelineDateWib(entry.createdAt)}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs font-bold text-ink">
                          {entry.actorName} • {entry.actorRoleDisplay}
                        </p>

                        <div
                          className={`mt-2 rounded-xl border px-3.5 py-2.5 ${
                            isRejected
                              ? "border-red-200 bg-red-50/60"
                              : isStaffStatus
                                ? "border-blue-100 bg-[#F4F8FF]"
                                : "border-border/80 bg-surface/60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                            <MessageSquare size={12} className="shrink-0" />
                            <span>{commentBadgeLabel}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink/90">
                            {resolvedNote}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* Kolom Kanan (4/12) */}
        <aside className="space-y-5 lg:col-span-4">
          {/* 1. Informasi Tiket */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">Informasi tiket</h2>

            <dl className="mt-4 space-y-3.5">
              <div>
                <dt className="text-[11px] text-muted">Nomor tiket</dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {ticket.ticketNumber}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] text-muted">Kategori</dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {ticket.categoryName}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] text-muted">Wilayah</dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {ticket.regionName} / RW {ticket.regionRw}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] text-muted">Pelapor</dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {ticket.reporterName}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] text-muted">Penanggung jawab</dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {ticket.handlerDisplay}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] text-muted">
                  {ticket.status === "selesai"
                    ? "Tanggal selesai"
                    : ticket.status === "ditolak"
                      ? "Tanggal ditolak"
                      : "Tanggal dilaporkan"}
                </dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {ticket.status === "selesai"
                    ? formatFullDateId(ticket.completedAt ?? ticket.updatedAt)
                    : ticket.status === "ditolak"
                      ? formatFullDateId(ticket.rejectedAt ?? ticket.updatedAt)
                      : formatFullDateId(ticket.submittedAt ?? ticket.createdAt)}
                </dd>
              </div>

              <div className="border-t border-border pt-3.5">
                <dt className="text-[11px] text-muted">
                  Hasil penilaian warga
                </dt>
                {ticket.rating ? (
                  <dd className="mt-1.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={
                              star <= (ticket.rating ?? 0)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-amber-300"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-ink">
                        {ticket.rating}/5 Bintang
                      </span>
                    </div>
                    {ticket.ratingComment && (
                      <p className="mt-1.5 text-xs italic leading-relaxed text-ink/85">
                        “{ticket.ratingComment}”
                      </p>
                    )}
                  </dd>
                ) : (
                  <dd className="mt-0.5 text-xs font-medium text-muted">
                    {ticket.status === "selesai"
                      ? "Belum ada penilaian dari warga"
                      : "Tersedia setelah tiket selesai"}
                  </dd>
                )}
              </div>
            </dl>
          </section>

          {/* 2. Kartu Aksi Dinamis (Termasuk "Bagaimana hasilnya?" untuk Warga saat Selesai) */}
          {renderRoleActionCard()}

          {/* 3. Tentang Status Ditolak */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">
              Tentang status Ditolak
            </h2>

            <div className="mt-3">
              <Badge status="ditolak" dot />
            </div>

            {ticket.status === "ditolak" && ticket.rejectionReason ? (
              <>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-red-700">
                  {ticket.rejectionReason}
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-muted">
                  Ikuti arahan pengurus wilayah di atas sebelum membuat laporan
                  baru.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Ini adalah jalur alternatif, bukan bagian dari urutan sukses
                  tiket ini.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Pada laporan Ditolak, alasan akan terlihat di detail tiket.
                  Contoh: lokasi berada di luar wilayah RW 06. Ikuti arahan
                  pengurus sebelum membuat laporan baru.
                </p>
              </>
            )}
          </section>

          {/* 4. Masih Memerlukan Bantuan? */}
          <section className="rounded-2xl border border-blue-100 bg-[#F4F8FF] p-4 sm:p-5">
            <div className="flex items-start gap-2.5">
              <Info size={16} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-bold text-primary">
                  Masih memerlukan bantuan?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Hubungi pengurus {ticket.regionName} dengan menyebut nomor
                  tiket agar lebih mudah ditelusuri.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Modal Lightbox Foto Ukuran Penuh */}
      {lightboxIndex !== null && allLightboxPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-xs"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-xs font-bold text-ink">
                  {allLightboxPhotos[lightboxIndex].type === "penyelesaian"
                    ? "Bukti penyelesaian dari RW"
                    : "Foto laporan warga"}
                </p>
                <p className="text-[11px] text-muted">
                  {formatFullDateId(allLightboxPhotos[lightboxIndex].createdAt)}{" "}
                  • {allLightboxPhotos[lightboxIndex].uploaderName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Tutup pratinjau foto"
                className="cursor-pointer rounded-xl border border-border p-1.5 text-muted hover:bg-surface hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <SafeTicketImage
              key={allLightboxPhotos[lightboxIndex].id}
              attachment={allLightboxPhotos[lightboxIndex]}
              alt={allLightboxPhotos[lightboxIndex].fileName}
            />

            {allLightboxPhotos.length > 1 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {allLightboxPhotos.map((att, idx) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      idx === lightboxIndex
                        ? "bg-primary text-white"
                        : "bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {att.type === "penyelesaian"
                      ? `Sesudah (${idx + 1})`
                      : `Sebelum (${idx + 1})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
  );
}
