import { Suspense } from "react";
import type { Metadata } from "next";
import RtDashboardClient from "@/components/staff/RtDashboardClient";
import { getStaffDashboardData, PREVIEW_RT_DATA } from "@/data/staff-preview";

export const metadata: Metadata = {
  title: "Ruang Layanan Ketua RT — SIPANDU RW 06 Parakansaat",
  description:
    "Verifikasi dan pemeriksaan pengaduan warga wilayah RT di RW 06 Parakansaat.",
};

async function LiveRtDashboard() {
  const data = await getStaffDashboardData("ketua_rt");
  return <RtDashboardClient initialData={data} />;
}

export default function RtDashboardPage() {
  return (
    <Suspense fallback={<RtDashboardClient initialData={PREVIEW_RT_DATA} />}>
      <LiveRtDashboard />
    </Suspense>
  );
}
