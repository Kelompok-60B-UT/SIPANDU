import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import RwDashboardClient from "@/components/staff/RwDashboardClient";
import { getStaffDashboardData, PREVIEW_RW_DATA } from "@/data/staff-preview";
import { isSupabaseConfigured } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Ruang Layanan Ketua RW — SIPANDU RW 06 Parakansaat",
  description:
    "Koordinasi tindak lanjut dan penyelesaian pengaduan warga RW 06 Parakansaat.",
};

async function LiveRwDashboard() {
  if (isSupabaseConfigured()) {
    await connection();
  }
  const data = await getStaffDashboardData("ketua_rw");
  return <RwDashboardClient initialData={data} />;
}

export default function RwDashboardPage() {
  return (
    <Suspense fallback={<RwDashboardClient initialData={PREVIEW_RW_DATA} />}>
      <LiveRwDashboard />
    </Suspense>
  );
}
