import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-6 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertCircle size={22} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Tautan Verifikasi Tidak Valid
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Kode autentikasi sudah kedaluwarsa atau telah digunakan. Silakan masuk
          kembali menggunakan akun SIPANDU Anda.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <ArrowLeft size={16} />
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
