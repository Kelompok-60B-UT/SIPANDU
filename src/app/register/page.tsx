import { Suspense } from "react";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";
import { getFormOptions } from "@/app/actions/tickets";
import type { RegionOption } from "@/types";

export const metadata: Metadata = {
  title: "Daftar Warga — SIPANDU RW 06 Parakansaat",
  description:
    "Pendaftaran akun warga untuk menyampaikan pengaduan di RW 06 Parakansaat, Bandung.",
};

const DEFAULT_REGIONS: RegionOption[] = [
  { id: 1, name: "RT 01", rw: "06" },
  { id: 2, name: "RT 02", rw: "06" },
  { id: 3, name: "RT 03", rw: "06" },
  { id: 4, name: "RT 04", rw: "06" },
  { id: 5, name: "RT 05", rw: "06" },
  { id: 6, name: "RT 06", rw: "06" },
  { id: 7, name: "RT 07", rw: "06" },
  { id: 8, name: "RT 08", rw: "06" },
];

async function RegisterContent() {
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
      <Suspense fallback={<RegisterForm regions={DEFAULT_REGIONS} />}>
        <RegisterContent />
      </Suspense>
    </AuthShell>
  );
}
