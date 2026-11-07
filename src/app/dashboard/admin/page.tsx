import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import { AdminDashboardSkeleton } from "@/components/ui/Skeleton";
import { getAdminDashboardData } from "@/data/admin-preview";
import { isSupabaseConfigured } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Ruang Layanan Admin — SIPANDU RW 06 Parakan Saat",
  description:
    "Administrasi pengaduan lintas RT, manajemen akun, wilayah, dan kategori layanan SIPANDU RW 06.",
};

async function LiveAdminDashboard() {
  if (isSupabaseConfigured()) {
    await connection();
  }
  const data = await getAdminDashboardData();
  return <AdminDashboardClient initialData={data} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <LiveAdminDashboard />
    </Suspense>
  );
}
