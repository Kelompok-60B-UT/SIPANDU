import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import RtDashboardClient from "@/components/staff/RtDashboardClient";
import { StaffDashboardSkeleton } from "@/components/ui/Skeleton";
import { getStaffDashboardData } from "@/data/staff-preview";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Ruang Layanan Ketua RT — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Verifikasi dan pemeriksaan pengaduan warga wilayah RT di ${siteConfig.rwLabel}.`,
};

async function LiveRtDashboard() {
  if (isSupabaseConfigured()) {
    await connection();
  }
  const data = await getStaffDashboardData("ketua_rt");
  return <RtDashboardClient initialData={data} />;
}

export default function RtDashboardPage() {
  return (
    <Suspense
      fallback={
        <StaffDashboardSkeleton
          headerTitle="Ruang layanan Ketua RT"
          variant="rt"
        />
      }
    >
      <LiveRtDashboard />
    </Suspense>
  );
}
