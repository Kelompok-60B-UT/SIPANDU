import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import WargaShell from "@/components/warga/WargaShell";
import ProfileForm from "@/components/warga/ProfileForm";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { listNotifications } from "@/app/actions/profile";
import { getFormOptions } from "@/app/actions/tickets";
import {
  getWargaUserContext,
  PREVIEW_NOTIFICATIONS,
  PREVIEW_REGIONS,
  PREVIEW_USER,
  type WargaUserContext,
} from "@/data/warga-preview";
import { roleLabelId } from "@/utils/roles";
import { isSupabaseConfigured } from "@/utils/supabase/server";
import type { RegionOption } from "@/types";

export const metadata: Metadata = {
  title: "Profil Saya — SIPANDU RW 06 Parakansaat",
  description: "Kelola informasi pribadi dan alamat domisili warga SIPANDU.",
};

function ProfileView({
  userCtx,
  regions,
  unreadCount,
}: {
  userCtx: WargaUserContext;
  regions: RegionOption[];
  unreadCount: number;
}) {
  const roleLabel = roleLabelId(userCtx.role);
  const regionLabel = `${userCtx.region.name} / RW ${userCtx.region.rw}`;

  return (
    <WargaShell
      activeMenu="profil"
      fullName={userCtx.profile.full_name}
      roleLabel={roleLabel}
      regionLabel={regionLabel}
      unreadCount={unreadCount}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          AKUN WARGA
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Profil saya
        </h1>
        <p className="mt-1 text-sm text-muted">
          Kelola informasi pribadi dan alamat Anda agar layanan warga tetap
          terhubung.
        </p>

        <ProfileForm
          profile={userCtx.profile}
          email={userCtx.email}
          regions={regions}
        />
      </div>
    </WargaShell>
  );
}

async function LiveProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <ProfileView
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
    <ProfileView
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
