"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Headset,
  Info,
  Loader2,
  Mail,
  UserPlus,
} from "lucide-react";
import { login } from "@/app/actions/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { siteConfig } from "@/config/site";

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    error?: string;
    info?: string;
  } | null>(null);

  const handleSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await login(formData);
      if (res?.error) {
        setMessage({ error: res.error });
      }
    });
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        AKUN SIPANDU
      </p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Masuk, pantau, ikut peduli.
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Gunakan akun Anda untuk melanjutkan layanan warga.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50/75 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold text-primary">
            Satu pintu untuk semua peran
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Warga, Ketua RT, Ketua RW, dan Admin diarahkan ke ruang layanan
            sesuai hak akses akun.
          </p>
        </div>
      </div>

      {message?.error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{message.error}</span>
        </div>
      )}

      {message?.info && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{message.info}</span>
        </div>
      )}

      <form action={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="dewi.lestari@email.com"
          suffix={<Mail size={16} />}
        />

        <Input
          label="Kata sandi"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          placeholder="••••••••••••"
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

        <div className="flex items-center justify-between pt-0.5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Ingat saya
          </label>
          <button
            type="button"
            onClick={() =>
              setMessage({
                info: `Untuk mengatur ulang kata sandi, silakan hubungi pengurus RT atau Admin sekretariat ${siteConfig.rwShortLabel}.`,
              })
            }
            className="cursor-pointer text-xs font-semibold text-primary hover:underline"
          >
            Lupa kata sandi?
          </button>
        </div>

        <Button type="submit" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          {isPending ? "Memproses..." : "Masuk ke SIPANDU"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          BARU DI SIPANDU?
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Link
        href="/register"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-surface"
      >
        <UserPlus size={16} />
        Daftar sebagai warga
      </Link>

      <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface p-4">
        <Headset size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold text-ink">
            Kesulitan masuk ke akun?
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Hubungi pengurus RT atau sekretariat {siteConfig.rwShortLabel}.
          </p>
        </div>
      </div>
    </div>
  );
}
