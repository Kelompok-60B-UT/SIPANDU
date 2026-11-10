"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { createDraft, submitTicket } from "@/app/actions/tickets";
import { uploadAttachment } from "@/app/actions/attachments";
import { isSupabaseConfigured } from "@/utils/supabase/client";
import { validateAttachment, compressImageFile } from "@/utils/upload";
import { siteConfig } from "@/config/site";
import type { CategoryOption, Profile, RegionOption } from "@/types";

interface PhotoDraftItem {
  id: string;
  fileName: string;
  sizeBytes: number;
  previewUrl: string;
  file?: File;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatBytesMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

export default function CreateTicketForm({
  isPreview,
  profile,
  email,
  userRegion,
  regions,
  categories,
}: {
  isPreview: boolean;
  profile: Profile;
  email: string;
  userRegion: RegionOption;
  regions: RegionOption[];
  categories: CategoryOption[];
}) {
  const defaultDrainase =
    categories.find((c) => c.name.toLowerCase().includes("drainase")) ??
    categories[0];

  const [title, setTitle] = useState(
    isPreview ? "Saluran air tersumbat di Gang Melati" : "",
  );
  const [categoryId, setCategoryId] = useState<number>(
    defaultDrainase?.id ?? 1,
  );
  const [description, setDescription] = useState(
    isPreview
      ? "Saluran air di depan Gang Melati tersumbat daun dan sampah sejak 27 Oktober. Saat hujan, air meluap ke jalan dan mengganggu akses warga. Mohon bantuan pembersihan saluran."
      : "",
  );
  const [regionId, setRegionId] = useState<number>(
    profile.region_id ?? userRegion.id ?? regions[2]?.id ?? 3,
  );
  const [landmark, setLandmark] = useState(
    isPreview ? "Gang Melati, depan rumah No. 12, dekat pos RT 03" : "",
  );
  const [agreed, setAgreed] = useState(isPreview);

  const [photos, setPhotos] = useState<PhotoDraftItem[]>(() =>
    isPreview
      ? [
          {
            id: "preview-saluran",
            fileName: "saluran-gang-melati.jpg",
            sizeBytes: Math.round(1.8 * 1024 * 1024),
            previewUrl: "/dummysaluran.jpg",
          },
        ]
      : [],
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeAction, setActiveAction] = useState<"submit" | "draft" | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!profile.is_rt_verified) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/warga"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            Kembali ke ringkasan pengaduan
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Buat pengaduan warga
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sampaikan permasalahan lingkungan Anda secara langsung ke pengurus.
          </p>
        </div>

        {/* Card Status Menunggu Persetujuan */}
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="mx-auto flex max-w-xl flex-col items-center py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
              <Clock size={32} className="animate-pulse" />
            </div>

            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Menunggu Persetujuan Akun
            </span>

            <h2 className="mt-3 text-xl font-bold text-ink sm:text-2xl">
              Akun Anda Belum Disetujui Pengurus
            </h2>

            <p className="mt-2.5 text-xs leading-relaxed text-muted sm:text-sm">
              Untuk menjaga ketertiban dan keabsahan laporan warga di {siteConfig.rwLabel}, setiap pendaftar baru wajib disetujui terlebih dahulu oleh <strong>Ketua RT {userRegion.name}</strong>, <strong>Ketua {siteConfig.rwShortLabel}</strong>, atau <strong>Admin {siteConfig.appName}</strong>.
            </p>

            {/* Info Rincian Data Pendaftaran */}
            <div className="mt-6 w-full rounded-xl border border-border bg-surface p-4 text-left">
              <p className="mb-2 text-xs font-bold text-ink">Rincian Data Pendaftaran:</p>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-muted">Nama Lengkap:</span>
                  <p className="font-semibold text-ink">{profile.full_name}</p>
                </div>
                <div>
                  <span className="text-muted">Wilayah:</span>
                  <p className="font-semibold text-ink">{userRegion.name} / RW {userRegion.rw}</p>
                </div>
                <div>
                  <span className="text-muted">Nomor Telepon:</span>
                  <p className="font-semibold text-ink">{profile.phone || '-'}</p>
                </div>
                <div>
                  <span className="text-muted">Alamat Tinggal:</span>
                  <p className="font-semibold text-ink">{profile.address || '-'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard/warga"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto sm:text-sm"
              >
                Kembali ke Beranda
              </Link>
              <Link
                href="/profile"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface sm:w-auto sm:text-sm"
              >
                Lihat Profil Saya
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setFeedback(null);

    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) {
      setFeedback({
        type: "error",
        text: "Maksimal 3 foto pendukung untuk setiap pengaduan.",
      });
      return;
    }

    const toAdd: PhotoDraftItem[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const check = validateAttachment(file);
      if (!check.valid) {
        setFeedback({
          type: "error",
          text: check.error ?? "Format atau ukuran foto tidak sesuai.",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      toAdd.push({
        id: `${Date.now()}-${Math.random()}`,
        fileName: file.name,
        sizeBytes: file.size,
        previewUrl: URL.createObjectURL(file),
        file,
      });
    }

    setPhotos((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const runSave = (mode: "submit" | "draft") => {
    setFeedback(null);

    if (title.trim().length < 5) {
      setFeedback({
        type: "error",
        text: "Judul pengaduan minimal 5 karakter.",
      });
      return;
    }
    if (description.trim().length < 10) {
      setFeedback({
        type: "error",
        text: "Ceritakan kejadiannya minimal 10 karakter.",
      });
      return;
    }
    if (!landmark.trim()) {
      setFeedback({
        type: "error",
        text: "Alamat atau patokan lokasi wajib diisi.",
      });
      return;
    }
    if (mode === "submit" && !agreed) {
      setFeedback({
        type: "error",
        text: "Harap centang pernyataan kebenaran informasi sebelum mengirim pengaduan.",
      });
      return;
    }

    setActiveAction(mode);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("category_id", String(categoryId));
    formData.set("description", description.trim());
    formData.set("region_id", String(regionId));
    formData.set("location_landmark", landmark.trim());

    startTransition(async () => {
      try {
        const draftRes = await createDraft(formData);
        if (!draftRes.success) {
          setFeedback({ type: "error", text: draftRes.error });
          setActiveAction(null);
          return;
        }

        const ticketId = draftRes.data.id;

        // Unggah foto ke Supabase Storage melalui server action agar aman dari RLS
        if (isSupabaseConfigured()) {
          for (const item of photos) {
            if (!item.file) continue;
            const fileToUpload = await compressImageFile(item.file);
            const fd = new FormData();
            fd.set("ticket_id", String(ticketId));
            fd.set("type", "laporan");
            fd.set("file", fileToUpload);

            const upRes = await uploadAttachment(fd);
            if (!upRes.success) {
              setFeedback({
                type: "error",
                text: `Gagal mengunggah foto: ${upRes.error}`,
              });
              setActiveAction(null);
              return;
            }
          }
        }

        if (mode === "submit") {
          const subRes = await submitTicket(ticketId);
          if (!subRes.success) {
            setFeedback({ type: "error", text: subRes.error });
            setActiveAction(null);
            return;
          }
          setFeedback({
            type: "success",
            text: "Pengaduan berhasil dikirim ke Ketua RT! Nomor tiket telah diterbitkan dan dapat dipantau melalui Pengaduan saya.",
          });
        } else {
          setFeedback({
            type: "success",
            text: "Draf pengaduan berhasil disimpan. Anda dapat melanjutkan atau mengirimkannya kapan saja.",
          });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  const selectedRegionName =
    regions.find((r) => r.id === regionId)?.name ?? userRegion.name;
  const initials = getInitials(profile.full_name);

  return (
    <div className="space-y-6">
      {/* Tautan Kembali & Judul Halaman */}
      <div>
        <Link
          href="/dashboard/warga"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={14} />
          Kembali ke pengaduan saya
        </Link>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">
          LAYANAN PENGADUAN WARGA
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Ada yang perlu diperbaiki?
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ceritakan kepada kami. Laporan yang jelas membantu pengurus bertindak
          lebih tepat.
        </p>
      </div>

      {/* Peringatan Darurat */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/75 px-4 py-3.5">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-amber-600"
        />
        <div>
          <p className="text-xs font-bold text-amber-800">
            Bukan untuk keadaan darurat
          </p>
          <p className="mt-0.5 text-xs text-amber-800/85">
            Untuk kondisi yang membahayakan keselamatan, segera hubungi layanan
            darurat atau pengurus setempat secara langsung.
          </p>
        </div>
      </div>

      {/* Umpan Balik Simpan / Kirim */}
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-xs ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2
              size={17}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
          ) : (
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-600" />
          )}
          <div className="flex-1">
            <span>{feedback.text}</span>
            {feedback.type === "success" && (
              <Link
                href="/dashboard/warga"
                className="ml-2 font-semibold underline"
              >
                Lihat Pengaduan saya →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Grid Utama 2 Kolom */}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_310px]">
        {/* Kolom Kiri: Form 3 Langkah */}
        <div className="space-y-5">
          {/* Kartu 1: Informasi laporan */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">
              1. Informasi laporan
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Kolom bertanda * wajib diisi.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ticket_title"
                  className="text-xs font-semibold text-ink"
                >
                  Judul pengaduan <span className="text-ink">*</span>
                </label>
                <input
                  id="ticket_title"
                  name="title"
                  type="text"
                  required
                  minLength={5}
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Saluran air tersumbat di Gang Melati"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/75 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <p className="text-[11px] text-muted">
                  Gunakan judul singkat yang menjelaskan masalah.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ticket_category"
                  className="text-xs font-semibold text-ink"
                >
                  Kategori layanan <span className="text-ink">*</span>
                </label>
                <div className="relative">
                  <select
                    id="ticket_category"
                    name="category_id"
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ticket_description"
                  className="text-xs font-semibold text-ink"
                >
                  Ceritakan kejadiannya <span className="text-ink">*</span>
                </label>
                <textarea
                  id="ticket_description"
                  name="description"
                  rows={4}
                  required
                  minLength={10}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan lokasi spesifik, sejak kapan terjadi, dan dampaknya bagi warga sekitar..."
                  className="w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted/75 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <p className="text-[11px] text-muted">
                  Jelaskan apa yang terjadi, sejak kapan, dan dampaknya.
                  Maksimal 1.000 karakter.
                </p>
              </div>
            </div>
          </section>

          {/* Kartu 2: Lokasi kejadian */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">2. Lokasi kejadian</h2>
            <p className="mt-0.5 text-xs text-muted">
              Pastikan berada di wilayah {siteConfig.rwLabel}.
            </p>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="ticket_region"
                    className="text-xs font-semibold text-ink"
                  >
                    RT lokasi <span className="text-ink">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="ticket_region"
                      name="region_id"
                      value={regionId}
                      onChange={(e) => setRegionId(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    >
                      {regions.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="ticket_rw"
                    className="text-xs font-semibold text-ink"
                  >
                    RW <span className="text-ink">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ticket_rw"
                      type="text"
                      value={siteConfig.rwShortLabel}
                      readOnly
                      tabIndex={-1}
                      className="w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 pr-10 text-sm text-ink focus:outline-none"
                    />
                    <Lock
                      size={15}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="ticket_landmark"
                  className="text-xs font-semibold text-ink"
                >
                  Alamat / patokan lokasi <span className="text-ink">*</span>
                </label>
                <input
                  id="ticket_landmark"
                  name="location_landmark"
                  type="text"
                  required
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Gang Melati, depan rumah No. 12, dekat pos RT 03"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/75 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <p className="text-[11px] text-muted">
                  Tambahkan nomor rumah atau patokan agar mudah ditemukan.
                </p>
              </div>
            </div>
          </section>

          {/* Kartu 3: Foto pendukung */}
          <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-ink">3. Foto pendukung</h2>
            <p className="mt-0.5 text-xs text-muted">
              Maksimal 3 foto • JPG atau PNG • 5 MB per foto
            </p>

            {/* Daftar Foto Terlampir */}
            {photos.length > 0 && (
              <div
                className={`mt-4 grid gap-4 ${
                  photos.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-border bg-surface/40 p-2.5"
                  >
                    <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
                      {photo.previewUrl.startsWith("/") ? (
                        <Image
                          src={photo.previewUrl}
                          alt={photo.fileName}
                          width={760}
                          height={300}
                          className={`${
                            photos.length === 1 ? "h-48 sm:h-56" : "h-36 sm:h-40"
                          } w-full scale-[1.02] object-cover`}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.previewUrl}
                          alt={photo.fileName}
                          className={`${
                            photos.length === 1 ? "h-48 sm:h-56" : "h-36 sm:h-40"
                          } w-full object-cover`}
                        />
                      )}
                      <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Foto {idx + 1}/3
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <ImageIcon
                          size={15}
                          className="shrink-0 text-primary"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">
                            {photo.fileName}
                          </p>
                          <p className="text-[11px] text-muted">
                            {formatBytesMb(photo.sizeBytes)} • Terunggah
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        aria-label={`Hapus ${photo.fileName}`}
                        className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Area Tambah Foto */}
            <label
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs font-semibold transition-colors ${
                photos.length >= 3
                  ? "cursor-not-allowed border-border bg-surface text-muted"
                  : "cursor-pointer border-primary/50 bg-blue-50/40 text-primary hover:bg-blue-50/80"
              }`}
            >
              <Upload size={15} />
              <span>
                {photos.length >= 3
                  ? "Batas maksimal 3 foto tercapai (3 dari 3)"
                  : `Unggah foto pendukung • ${photos.length} dari 3 terunggah`}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                disabled={photos.length >= 3 || isPending}
                onChange={handleAddPhoto}
                className="hidden"
              />
            </label>

            <p className="mt-3 text-[11px] text-muted">
              Ambil foto yang jelas. Jangan unggah dokumen pribadi atau foto
              orang lain tanpa izin.
            </p>
          </section>

          {/* Persetujuan & Tombol Kirim / Simpan Draf */}
          <div className="space-y-4 pt-1">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
              />
              <span>
                Saya menyatakan informasi ini benar dan bersedia dihubungi
                pengurus untuk keperluan penanganan.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => runSave("submit")}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                {isPending && activeAction === "submit" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                Kirim pengaduan
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => runSave("draft")}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                {isPending && activeAction === "draft" && (
                  <Loader2 size={15} className="animate-spin" />
                )}
                Simpan draf
              </button>
            </div>

            <p className="text-[11px] text-muted">
              Periksa kembali isi laporan sebelum dikirim. Data pelapor diambil
              dari akun Anda.
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Info Pelapor & Alur Tindak Lanjut */}
        <aside className="space-y-4 xl:sticky xl:top-22">
          {/* Kartu Pelapor */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <h3 className="text-sm font-bold text-ink">Pelapor</h3>

            <div className="mt-3.5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-primary">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink">
                  {profile.full_name}
                </p>
                <p className="text-[11px] text-muted">
                  Warga {userRegion.name} / RW {userRegion.rw}
                </p>
              </div>
            </div>

            <div className="mt-3.5 space-y-0.5 text-xs text-muted">
              <p>{profile.phone || "0812 3456 7890"}</p>
              <p className="truncate">
                {isPreview ? "dewi.lestari@example.test" : email}
              </p>
            </div>
          </div>

          {/* Kartu Apa yang terjadi selanjutnya? */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <h3 className="text-sm font-bold text-ink">
              Apa yang terjadi selanjutnya?
            </h3>

            <div className="mt-3">
              <Badge status="terkirim" dot />
            </div>

            <div className="mt-3.5 space-y-3 text-xs leading-relaxed text-muted">
              <p>
                Setelah dikirim, Anda mendapat nomor tiket sebagai tanda laporan
                diterima.
              </p>
              <p>
                Ketua RT memverifikasi lokasi dan isi laporan, lalu
                meneruskannya kepada RW.
              </p>
              <p>
                Pantau perkembangan dan notifikasi melalui Pengaduan saya hingga
                selesai.
              </p>
            </div>
          </div>

          {/* Kartu Bantuan Mengisi */}
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/75 p-4">
            <Info size={16} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-primary">
                Butuh bantuan mengisi?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Pengurus {selectedRegionName} siap membantu Anda menyampaikan
                laporan pada jam layanan.{" "}
                <Link
                  href="/bantuan#panduan-warga"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  Lihat panduan
                </Link>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
