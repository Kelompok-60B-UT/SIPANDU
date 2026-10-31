"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
} from "lucide-react";
import { signup } from "@/app/actions/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { RegionOption } from "@/types";

function evaluatePassword(password: string, confirmPassword: string) {
  const len = password.length;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  let score = 0;
  if (len > 0) score = 1;
  if (len >= 8 || (len >= 6 && hasLetter && hasNumber)) score = 2;
  if (len >= 8 && hasLetter && hasNumber) score = 3;
  if (
    len >= 8 &&
    hasLetter &&
    hasNumber &&
    (hasMixedCase || hasSymbol || len >= 12)
  ) {
    score = 4;
  }

  const strengthLabel =
    score === 4
      ? "Kata sandi sangat kuat"
      : score === 3
        ? "Kata sandi kuat"
        : score === 2
          ? "Kata sandi cukup"
          : "Kata sandi lemah";

  const barColor =
    score >= 3
      ? "bg-emerald-600"
      : score === 2
        ? "bg-amber-500"
        : "bg-red-500";

  const textColor =
    confirmPassword.length > 0 && password !== confirmPassword
      ? "text-red-600"
      : score >= 3
        ? "text-emerald-600"
        : score === 2
          ? "text-amber-600"
          : "text-red-600";

  const hasConfirm = confirmPassword.length > 0;
  const isMatch = hasConfirm && password === confirmPassword;

  return { score, strengthLabel, barColor, textColor, hasConfirm, isMatch };
}

export default function RegisterForm({
  regions,
}: {
  regions: RegionOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{
    error?: string;
    success?: string;
  } | null>(null);

  const pwStatus = useMemo(
    () => evaluatePassword(password, confirmPassword),
    [password, confirmPassword],
  );

  const handleSubmit = (formData: FormData) => {
    setMessage(null);

    if (password.length < 8) {
      setMessage({ error: "Kata sandi minimal 8 karakter" });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ error: "Konfirmasi kata sandi belum sesuai" });
      return;
    }

    startTransition(async () => {
      const res = await signup(formData);
      if (res.error) {
        setMessage({ error: res.error });
      } else if (res.success) {
        setMessage({ success: res.success });
        setPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        PENDAFTARAN WARGA
      </p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Halo, tetangga baru.
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Buat akun untuk menyampaikan pengaduan di RW 06 Parakansaat, Bandung.
      </p>

      {message?.error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{message.error}</span>
        </div>
      )}

      {message?.success && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{message.success}</span>
        </div>
      )}

      <form action={handleSubmit} className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Data diri & wilayah</h2>

        <Input
          label="Nama lengkap"
          name="full_name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          placeholder="Dewi Lestari"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nomor WhatsApp"
            name="phone"
            type="tel"
            required
            minLength={9}
            autoComplete="tel"
            placeholder="0812 3456 7890"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="dewi.lestari@email.com"
          />
        </div>

        <Input
          label="Alamat tempat tinggal"
          name="address"
          type="text"
          required
          minLength={5}
          autoComplete="street-address"
          placeholder="Jl. Parakansaat, Gang Melati No. 12"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="region_id" className="text-xs font-semibold text-ink">
              RT <span className="text-ink">*</span>
            </label>
            <div className="relative">
              <select
                id="region_id"
                name="region_id"
                required
                defaultValue={regions[2]?.id ?? regions[0]?.id ?? ""}
                className="w-full appearance-none rounded-lg border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <Input
            label="RW"
            id="rw_display"
            value="RW 06 Parakansaat"
            readOnly
            required
            tabIndex={-1}
            suffix={<Lock size={15} />}
          />
        </div>

        <p className="-mt-1.5 text-[11px] text-muted">
          Pilih RT sesuai alamat tinggal Anda. Layanan ini khusus wilayah RW 06.
        </p>

        <h2 className="pt-2 text-sm font-semibold text-ink">
          Amankan akun Anda
        </h2>

        <Input
          label="Kata sandi"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Minimal 8 karakter, gunakan kombinasi huruf dan angka."
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
              className="cursor-pointer transition-colors hover:text-ink"
            >
              {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          }
        />

        <Input
          label="Konfirmasi kata sandi"
          id="password_confirm"
          type={showConfirm ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          suffix={
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={
                showConfirm
                  ? "Sembunyikan konfirmasi kata sandi"
                  : "Tampilkan konfirmasi kata sandi"
              }
              className="cursor-pointer transition-colors hover:text-ink"
            >
              {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          }
        />

        {/* Indikator kekuatan & kecocokan kata sandi */}
        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => {
              const active = pwStatus.score >= step;
              return (
                <div
                  key={step}
                  className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                >
                  <span
                    className={`block h-full rounded-full transition-all duration-300 ease-out ${
                      active ? `w-full ${pwStatus.barColor}` : "w-0"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          {password.length > 0 && (
            <p
              className={`text-[11px] font-medium transition-colors duration-200 ${pwStatus.textColor}`}
            >
              {pwStatus.strengthLabel}
              {pwStatus.hasConfirm
                ? pwStatus.isMatch
                  ? " • Konfirmasi sudah sesuai"
                  : " • Konfirmasi belum sesuai"
                : ""}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
          />
          <span>
            Saya menyatakan data di atas benar dan menyetujui ketentuan layanan
            serta kebijakan privasi SIPANDU.
          </span>
        </label>

        <Button type="submit" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          {isPending ? "Mendaftarkan akun..." : "Buat akun warga"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-ink transition-colors hover:text-primary"
        >
          Masuk ke SIPANDU
        </Link>
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50/75 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold text-primary">
            Data Anda hanya untuk layanan warga
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Tidak perlu mengunggah KTP atau Kartu Keluarga saat mendaftar. Akun
            pengurus dibuat oleh Admin.
          </p>
        </div>
      </div>
    </div>
  );
}
