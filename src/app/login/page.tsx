import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — SIPANDU RW 06 Parakan Saat",
  description: "Masuk ke layanan pengaduan warga SIPANDU RW 06 Parakan Saat.",
};

export default function LoginPage() {
  return (
    <AuthShell
      headline={
        <>
          Selamat datang di ruang
          <span className="lg:block"> warga.</span>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
