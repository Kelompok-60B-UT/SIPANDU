import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";
import { RegisterFormSkeleton } from "@/components/ui/Skeleton";
import { getFormOptions } from "@/app/actions/tickets";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import { siteConfig } from "@/config/site";
import type { RegionOption } from "@/types";

export const metadata: Metadata = {
  title: `Daftar Warga — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Pendaftaran akun warga untuk menyampaikan pengaduan di ${siteConfig.rwLabel}.`,
};

const DEFAULT_REGIONS: RegionOption[] = [
  { id: 1, name: "RT 01", rw: siteConfig.rwNumber },
  { id: 2, name: "RT 02", rw: siteConfig.rwNumber },
  { id: 3, name: "RT 03", rw: siteConfig.rwNumber },
  { id: 4, name: "RT 04", rw: siteConfig.rwNumber },
  { id: 5, name: "RT 05", rw: siteConfig.rwNumber },
  { id: 6, name: "RT 06", rw: siteConfig.rwNumber },
  { id: 7, name: "RT 07", rw: siteConfig.rwNumber },
  { id: 8, name: "RT 08", rw: siteConfig.rwNumber },
];

async function RegisterContent() {
  if (isSupabaseConfigured()) {
    await connection();
  }
  const res = await getFormOptions();
  const regions = res.success ? res.data.regions : DEFAULT_REGIONS;
  return <RegisterForm regions={regions} />;
}

export default function RegisterPage() {
  return (
    <AuthShell
      headline={
        <>
          Jadi bagian dari
          <span className="lg:block"> perubahan lingkungan</span>
          <span className="lg:block"> kita.</span>
        </>
      }
    >
      <Suspense fallback={<RegisterFormSkeleton />}>
        <RegisterContent />
      </Suspense>
    </AuthShell>
  );
}
