"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  changePassword,
  updateProfile,
  updateProfileAvatar,
} from "@/app/actions/profile";
import type { Profile, RegionOption, UserRole } from "@/types";
import { siteConfig } from "@/config/site";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // Maksimal 2 MB

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatRtDigits(name: string): string {
  const digits = name.replace(/\D/g, "");
  return digits ? digits.padStart(2, "0") : name;
}

function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Gagal memuat pratinjau foto"));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfileForm({
  profile,
  email,
  role = "warga",
  isPreview = false,
  regions,
  initialAvatarUrl,
  initialKelurahan,
  initialCity,
}: {
  profile: Profile;
  email: string;
  role?: UserRole;
  isPreview?: boolean;
  regions: RegionOption[];
  initialAvatarUrl?: string | null;
  initialKelurahan?: string;
  initialCity?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [regionId, setRegionId] = useState<number>(
    profile.region_id ?? regions[2]?.id ?? regions[0]?.id ?? 3,
  );
  const [rw, setRw] = useState(siteConfig.rwNumber);
  const [kelurahan, setKelurahan] = useState(
    initialKelurahan || "Cisaranten Endah",
  );
  const [city, setCity] = useState(initialCity || siteConfig.city);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAvatarUrl ?? null,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [passwordFeedback, setPasswordFeedback] = useState<{
    error?: string;
    success?: string;
  } | null>(null);
  const [prevProfileUpdatedAt, setPrevProfileUpdatedAt] = useState(
    profile.updated_at,
  );
  const [prevInitialAvatarUrl, setPrevInitialAvatarUrl] = useState<
    string | null | undefined
  >(initialAvatarUrl);

  if (prevProfileUpdatedAt !== profile.updated_at) {
    setPrevProfileUpdatedAt(profile.updated_at);
    setFullName(profile.full_name);
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    if (profile.region_id) {
      setRegionId(profile.region_id);
    }
    if (initialKelurahan) {
      setKelurahan(initialKelurahan);
    }
    if (initialCity) {
      setCity(initialCity);
    }
  }

  if (prevInitialAvatarUrl !== initialAvatarUrl) {
    setPrevInitialAvatarUrl(initialAvatarUrl);
    if (initialAvatarUrl !== undefined) {
      setAvatarUrl(initialAvatarUrl);
    }
  }

  useEffect(() => {
    const syncSavedProfile = () => {
      try {
        if (!initialAvatarUrl) {
          const savedAvatar = localStorage.getItem("sipandu_avatar_url");
          if (savedAvatar) setAvatarUrl(savedAvatar);
        }
        const savedJson =
          localStorage.getItem(`sipandu_profile_${role}`) ||
          (isPreview ? localStorage.getItem("sipandu_profile_override") : null);
        if (savedJson) {
          const parsed = JSON.parse(savedJson) as {
            userId?: string;
            fullName?: string;
            phone?: string;
            address?: string;
            regionId?: number;
            rw?: string;
            kelurahan?: string;
            city?: string;
          };
          if (isPreview || !parsed.userId || parsed.userId === profile.id) {
            if (parsed.fullName) setFullName(parsed.fullName);
            if (parsed.phone !== undefined) setPhone(parsed.phone);
            if (parsed.address !== undefined) setAddress(parsed.address);
            if (parsed.regionId) setRegionId(parsed.regionId);
            if (parsed.rw) setRw(parsed.rw);
            if (parsed.kelurahan) setKelurahan(parsed.kelurahan);
            if (parsed.city) setCity(parsed.city);
          }
        }
      } catch {
        // Abaikan jika sinkronisasi penyimpanan lokal gagal
      }
    };
    syncSavedProfile();
    window.addEventListener("sipandu-avatar-change", syncSavedProfile);
    window.addEventListener("sipandu-profile-change", syncSavedProfile);
    return () => {
      window.removeEventListener("sipandu-avatar-change", syncSavedProfile);
      window.removeEventListener("sipandu-profile-change", syncSavedProfile);
    };
  }, [initialAvatarUrl, isPreview, profile.id, role]);

  const [feedback, setFeedback] = useState<{
    error?: string;
    success?: string;
  } | null>(null);

  const initials = getInitials(fullName || profile.full_name);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFeedback(null);

    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ error: "Ukuran foto profil maksimal 2 MB." });
      return;
    }
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setFeedback({ error: "Format foto profil harus JPG atau PNG." });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    // Perbarui pratinjau foto profil secara langsung
    setAvatarUrl(objectUrl);
    setUploadingAvatar(true);

    try {
      const compactDataUrl = await fileToCompressedDataUrl(file);
      try {
        localStorage.setItem("sipandu_avatar_url", compactDataUrl);
        window.dispatchEvent(new Event("sipandu-avatar-change"));
      } catch {
        // Abaikan jika kuota penyimpanan lokal penuh
      }

      const fd = new FormData();
      fd.set("avatar", file);
      fd.set("avatar_data_url", compactDataUrl);

      const res = await updateProfileAvatar(fd);
      if (!res.success) {
        setFeedback({ error: res.error });
      } else {
        if (res.data.avatarUrl) {
          setAvatarUrl(res.data.avatarUrl);
        }
        setFeedback({
          success: "Foto profil berhasil diganti dan disimpan.",
        });
        router.refresh();
      }
    } catch (errObj) {
      setFeedback({
        error:
          errObj instanceof Error
            ? errObj.message
            : "Gagal mengganti foto profil.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setFeedback(null);
    setAvatarUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      localStorage.removeItem("sipandu_avatar_url");
      window.dispatchEvent(new Event("sipandu-avatar-change"));
    } catch {
      // Abaikan jika penyimpanan lokal tidak dapat diakses
    }

    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.set("remove", "true");
      const res = await updateProfileAvatar(fd);
      if (!res.success) {
        setFeedback({ error: res.error });
      } else {
        setFeedback({ success: "Foto profil berhasil dihapus." });
        router.refresh();
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleReset = () => {
    setFullName(profile.full_name);
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    setRegionId(profile.region_id ?? regions[2]?.id ?? regions[0]?.id ?? 3);
    setRw(siteConfig.rwNumber);
    setKelurahan(initialKelurahan || "Cisaranten Endah");
    setCity(initialCity || siteConfig.city);
    setFeedback(null);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChangePassword = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 8) {
      setPasswordFeedback({ error: "Kata sandi minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ error: "Konfirmasi kata sandi tidak cocok." });
      return;
    }

    startPasswordTransition(async () => {
      const fd = new FormData();
      fd.set("new_password", newPassword);
      fd.set("confirm_password", confirmPassword);

      const res = await changePassword(fd);
      if (!res.success) {
        setPasswordFeedback({ error: res.error });
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setPasswordFeedback({
          success: "Kata sandi berhasil diperbarui.",
        });
      }
    });
  };

  const handleSubmit = () => {
    setFeedback(null);
    const profileFormData = new FormData();
    profileFormData.set("full_name", fullName.trim());
    profileFormData.set("phone", phone.trim());
    profileFormData.set("address", address.trim());
    profileFormData.set("region_id", String(regionId));
    profileFormData.set("kelurahan", kelurahan.trim());
    profileFormData.set("city", city.trim());
    startTransition(async () => {
      const res = await updateProfile(profileFormData);
      if (!res.success) {
        setFeedback({ error: res.error });
      } else {
        const selectedRegion = regions.find((r) => r.id === regionId);
        const cachePayload = JSON.stringify({
          userId: profile.id,
          role,
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          regionId,
          regionName: selectedRegion?.name ?? "RT 03",
          rw,
          kelurahan: kelurahan.trim(),
          city: city.trim(),
        });
        try {
          localStorage.setItem(`sipandu_profile_${role}`, cachePayload);
          localStorage.setItem("sipandu_profile_override", cachePayload);
          window.dispatchEvent(new Event("sipandu-profile-change"));
        } catch {
          // Abaikan jika penyimpanan lokal tidak dapat diakses
        }
        setFeedback({ success: "Perubahan profil berhasil disimpan." });
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-white">
      <form
        ref={formRef}
        action={handleSubmit}
        className="divide-y divide-border"
      >
        {/* Bagian 1: Foto profil */}
      <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8">
        <div>
          <h2 className="text-sm font-bold text-ink">Foto profil</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Bantu pengurus mengenali Anda melalui foto profil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-16 w-16 shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName}
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-primary">
                {initials}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/40 text-white">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-4">
              <label
                className={`inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-ink transition-colors ${
                  uploadingAvatar || isPending
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-surface"
                }`}
              >
                {uploadingAvatar ? (
                  <Loader2 size={15} className="animate-spin text-primary" />
                ) : (
                  <Camera size={15} className="text-primary" />
                )}
                <span>
                  {uploadingAvatar
                    ? "Mengganti foto..."
                    : avatarUrl
                      ? "Ganti foto"
                      : "Unggah foto"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={uploadingAvatar || isPending}
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  disabled={uploadingAvatar || isPending}
                  onClick={handleRemoveAvatar}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Hapus foto
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              JPG atau PNG, maksimal 2 MB. Mengganti foto akan otomatis menimpa
              foto profil sebelumnya.
            </p>
          </div>
        </div>
      </div>

      {/* Bagian 2: Informasi pribadi */}
      <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8">
        <div>
          <h2 className="text-sm font-bold text-ink">Informasi pribadi</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Gunakan data yang benar agar kami mudah menghubungi Anda.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="full_name" className="text-xs font-semibold text-ink">
              Nama lengkap
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={email}
                readOnly
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <p className="text-[11px] text-muted">
                Untuk pemberitahuan terkait layanan warga.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-xs font-semibold text-ink">
                Nomor telepon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812 3456 7890"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
              <p className="text-[11px] text-muted">
                Gunakan nomor aktif yang dapat dihubungi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 3: Alamat dan wilayah */}
      <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8">
        <div>
          <h2 className="text-sm font-bold text-ink">Alamat dan wilayah</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Informasi domisili membantu pengurus mengarahkan layanan ke wilayah
            yang tepat.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="address" className="text-xs font-semibold text-ink">
              Alamat lengkap
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Parakan Saat, Gang Melati No. 12"
              className="w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rt_select" className="text-xs font-semibold text-ink">
                RT
              </label>
              <div className="relative">
                <select
                  id="rt_select"
                  value={regionId}
                  onChange={(e) => setRegionId(Number(e.target.value))}
                  className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRtDigits(r.name)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="rw_select" className="text-xs font-semibold text-ink">
                RW
              </label>
              <div className="relative">
                <select
                  id="rw_select"
                  value={rw}
                  onChange={(e) => setRw(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  <option value={siteConfig.rwNumber}>{siteConfig.rwNumber}</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="kelurahan" className="text-xs font-semibold text-ink">
                Kelurahan
              </label>
              <input
                id="kelurahan"
                type="text"
                value={kelurahan}
                onChange={(e) => setKelurahan(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className="text-xs font-semibold text-ink">
                Kota / Kabupaten
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5 text-[11px] text-muted">
            <Info size={15} className="shrink-0 text-primary" />
            <span>
              Pindah RT atau RW? Pastikan wilayah sesuai domisili Anda.{" "}
              <Link
                href="/bantuan#hubungi-pengurus"
                className="font-medium text-primary hover:underline"
              >
                Hubungi pengurus
              </Link>{" "}
              jika membutuhkan bantuan pembaruan data.
            </span>
          </div>
        </div>
      </div>

      {/* Footer Aksi Simpan Profil */}
      <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          {feedback?.error ? (
            <p className="inline-flex items-center gap-2 text-xs font-medium text-red-600">
              <AlertCircle size={15} className="shrink-0" />
              <span>{feedback.error}</span>
            </p>
          ) : feedback?.success ? (
            <p className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{feedback.success}</span>
            </p>
          ) : (
            <p className="inline-flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={15} className="shrink-0 text-muted" />
              <span>Periksa kembali data Anda sebelum menyimpan.</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="cursor-pointer rounded-xl border border-border bg-white px-5 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
      </form>

      {/* Bagian 4: Keamanan dan kata sandi (Form Terpisah) */}
      <form
        onSubmit={handleChangePassword}
        className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8"
      >
        <div>
          <h2 className="text-sm font-bold text-ink">Keamanan & kata sandi</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Perbarui kata sandi secara berkala untuk menjaga keamanan akun Anda.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="new_password"
                className="text-xs font-semibold text-ink"
              >
                Kata sandi baru
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  name="new_password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordFeedback(null);
                  }}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-ink"
                >
                  {showNewPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm_password"
                className="text-xs font-semibold text-ink"
              >
                Konfirmasi kata sandi baru
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordFeedback(null);
                  }}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-ink"
                >
                  {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback dan tombol perbarui kata sandi */}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {passwordFeedback?.error ? (
                <p className="inline-flex items-center gap-2 text-xs font-medium text-red-600">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{passwordFeedback.error}</span>
                </p>
              ) : passwordFeedback?.success ? (
                <p className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{passwordFeedback.success}</span>
                </p>
              ) : newPassword && confirmPassword && newPassword !== confirmPassword ? (
                <p className="inline-flex items-center gap-2 text-xs text-amber-600">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>Konfirmasi kata sandi belum cocok.</span>
                </p>
              ) : newPassword && newPassword.length < 8 ? (
                <p className="inline-flex items-center gap-2 text-xs text-muted">
                  <KeyRound size={14} className="shrink-0 text-muted" />
                  <span>Gunakan minimal 8 karakter.</span>
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isPasswordPending || !newPassword || !confirmPassword}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-border/40 disabled:opacity-50"
            >
              {isPasswordPending && (
                <Loader2 size={13} className="animate-spin text-primary" />
              )}
              <KeyRound size={14} className="text-primary" />
              <span>
                {isPasswordPending ? "Menyimpan sandi..." : "Perbarui kata sandi"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
