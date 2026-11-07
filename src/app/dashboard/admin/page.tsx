import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import { AdminDashboardSkeleton } from "@/components/ui/Skeleton";
import { getAdminDashboardData } from "@/data/admin-preview";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Ruang Layanan Admin — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Administrasi pengaduan lintas RT, manajemen akun, wilayah, dan kategori layanan ${siteConfig.appName} ${siteConfig.rwShortLabel}.`,
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
