"use client";

import { useEffect, useState } from "react";
import WargaShell from "@/components/warga/WargaShell";
import StaffShell from "@/components/staff/StaffShell";
import ProfileForm from "@/components/warga/ProfileForm";
import { roleLabelId } from "@/utils/roles";
import type { WargaUserContext } from "@/data/warga-preview";
import type { Profile, RegionOption, UserRole } from "@/types";

const PREVIEW_ROLE_PROFILES: Record<
  UserRole,
  { email: string; profile: Profile }
> = {
  warga: {
    email: "dewi.lestari@gmail.com",
    profile: {
      id: "preview-warga-id",
      full_name: "Dewi Lestari",
      phone: "0812 3456 7890",
      address: "Jl. Parakan Saat, Gang Melati No. 12",
      region_id: 3,
      is_active: true,
      is_rt_verified: true,
      created_at: "2026-10-01T08:00:00Z",
      updated_at: "2026-10-31T08:00:00Z",
    },
  },
  ketua_rt: {
    email: "rt03@sipandu.test",
    profile: {
      id: "preview-rt-id",
      full_name: "Agus Setiawan",
      phone: "0812 2233 4455",
      address: "Jl. Parakan Saat, Pos RT 03",
      region_id: 3,
      is_active: true,
      is_rt_verified: true,
      created_at: "2026-10-01T08:00:00Z",
      updated_at: "2026-10-31T08:00:00Z",
    },
  },
  ketua_rw: {
    email: "rw06@sipandu.test",
    profile: {
      id: "preview-rw-id",
      full_name: "Bambang Heryana",
      phone: "0811 2233 8899",
      address: "Sekretariat RW 06 Parakan Saat",
      region_id: 3,
      is_active: true,
      is_rt_verified: true,
      created_at: "2026-10-01T08:00:00Z",
      updated_at: "2026-10-31T08:00:00Z",
    },
  },
  admin: {
    email: "admin@sipandu.test",
    profile: {
      id: "preview-admin-id",
      full_name: "Rina Marlina",
      phone: "0813 9988 7766",
      address: "Balai Warga RW 06 Parakan Saat",
      region_id: 3,
      is_active: true,
      is_rt_verified: true,
      created_at: "2026-10-01T08:00:00Z",
      updated_at: "2026-10-31T08:00:00Z",
    },
  },
};

export default function ProfilePageClient({
  userCtx,
  regions,
  unreadCount,
}: {
  userCtx: WargaUserContext;
  regions: RegionOption[];
  unreadCount: number;
}) {
  const [previewRole, setPreviewRole] = useState<UserRole>(userCtx.role);

  useEffect(() => {
    const syncRole = () => {
      if (!userCtx.isPreview) return;
      try {
        const savedRole = localStorage.getItem("sipandu_last_role");
        if (
          savedRole === "admin" ||
          savedRole === "ketua_rw" ||
          savedRole === "ketua_rt" ||
          savedRole === "warga"
        ) {
          setPreviewRole(savedRole);
        }
      } catch {
        // ignore
      }
    };
    syncRole();
    window.addEventListener("sipandu-profile-change", syncRole);
    return () => window.removeEventListener("sipandu-profile-change", syncRole);
  }, [userCtx.isPreview]);

  const activeRole: UserRole = userCtx.isPreview ? previewRole : userCtx.role;
  const activeProfile: Profile =
    userCtx.isPreview && PREVIEW_ROLE_PROFILES[activeRole]
      ? PREVIEW_ROLE_PROFILES[activeRole].profile
      : userCtx.profile;
  const activeEmail: string =
    userCtx.isPreview && PREVIEW_ROLE_PROFILES[activeRole]
      ? PREVIEW_ROLE_PROFILES[activeRole].email
      : userCtx.email;

  const roleLabel = roleLabelId(activeRole);
  const regionLabel = `${userCtx.region.name} / RW ${userCtx.region.rw}`;

  const accountBadge =
    activeRole === "admin"
      ? "AKUN ADMIN"
      : activeRole === "ketua_rw"
        ? "AKUN KETUA RW"
        : activeRole === "ketua_rt"
          ? "AKUN KETUA RT"
          : "AKUN WARGA";

  const content = (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {accountBadge}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
        Profil saya
      </h1>
      <p className="mt-1 text-sm text-muted">
        Kelola informasi pribadi dan alamat Anda agar layanan warga tetap
        terhubung.
      </p>

      <ProfileForm
        key={activeRole}
        profile={activeProfile}
        email={activeEmail}
        role={activeRole}
        isPreview={userCtx.isPreview}
        regions={regions}
        initialAvatarUrl={userCtx.avatarUrl}
        initialKelurahan={userCtx.kelurahan}
        initialCity={userCtx.city}
      />
    </div>
  );

  if (
    activeRole === "admin" ||
    activeRole === "ketua_rw" ||
    activeRole === "ketua_rt"
  ) {
    const subHeaderLabel =
      activeRole === "ketua_rt" ? regionLabel : "RW 06 Parakan Saat";
    return (
      <StaffShell
        role={activeRole}
        activeMenu="profil"
        fullName={activeProfile.full_name}
        subHeaderLabel={subHeaderLabel}
        unreadCount={unreadCount}
        avatarUrl={userCtx.avatarUrl}
      >
        {content}
      </StaffShell>
    );
  }

  return (
    <WargaShell
      activeMenu="profil"
      fullName={activeProfile.full_name}
      roleLabel={roleLabel}
      regionLabel={regionLabel}
      unreadCount={unreadCount}
      avatarUrl={userCtx.avatarUrl}
    >
      {content}
    </WargaShell>
  );
}
