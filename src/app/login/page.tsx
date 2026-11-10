import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Masuk — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Masuk ke layanan pengaduan warga ${siteConfig.appName} ${siteConfig.rwLabel}.`,
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
