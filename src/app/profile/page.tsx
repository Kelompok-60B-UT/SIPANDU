import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import ProfilePageClient from "@/components/warga/ProfilePageClient";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { listNotifications } from "@/app/actions/profile";
import { getFormOptions } from "@/app/actions/tickets";
import {
  getWargaUserContext,
  PREVIEW_NOTIFICATIONS,
  PREVIEW_REGIONS,
  PREVIEW_USER,
} from "@/data/warga-preview";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Profil Saya — ${siteConfig.appName} ${siteConfig.rwLabel}`,
  description: `Kelola informasi pribadi dan alamat domisili warga ${siteConfig.appName}.`,
};

async function LiveProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <ProfilePageClient
        userCtx={PREVIEW_USER}
        regions={PREVIEW_REGIONS}
        unreadCount={PREVIEW_NOTIFICATIONS.filter((n) => !n.is_read).length}
      />
    );
  }

  await connection();

  const [userCtx, optionsRes, unreadRes] = await Promise.all([
    getWargaUserContext(),
    getFormOptions(),
    listNotifications(true),
  ]);

  const regions = optionsRes.success ? optionsRes.data.regions : PREVIEW_REGIONS;
  const unreadCount = userCtx.isPreview
    ? PREVIEW_NOTIFICATIONS.filter((n) => !n.is_read).length
    : unreadRes.success
      ? unreadRes.data.length
      : 0;

  return (
    <ProfilePageClient
      userCtx={userCtx}
      regions={regions}
      unreadCount={unreadCount}
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <LiveProfilePage />
    </Suspense>
  );
}
