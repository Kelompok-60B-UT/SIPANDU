import { Suspense } from "react";
import type { Metadata } from "next";
import WargaShell from "@/components/warga/WargaShell";
import CreateTicketForm from "@/components/warga/CreateTicketForm";
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
import type { CategoryOption, RegionOption } from "@/types";

export const metadata: Metadata = {
  title: "Buat Pengaduan — SIPANDU RW 06 Parakansaat",
  description: "Sampaikan pengaduan warga wilayah RW 06 Parakansaat, Bandung.",
};

const PREVIEW_CATEGORIES: CategoryOption[] = [
  { id: 1, name: "Drainase", description: "Saluran air dan genangan" },
  { id: 2, name: "Kebersihan", description: "Sampah dan kebersihan lingkungan" },
  { id: 3, name: "Penerangan", description: "Lampu jalan dan fasilitas umum" },
  { id: 4, name: "Infrastruktur", description: "Jalan dan sarana lingkungan" },
  { id: 5, name: "Ketertiban", description: "Keamanan dan kenyamanan warga" },
  { id: 6, name: "Layanan lainnya", description: "Saran dan kebutuhan warga" },
];

function CreateTicketView({
  userCtx,
  regions,
  categories,
  unreadCount,
}: {
  userCtx: WargaUserContext;
  regions: RegionOption[];
  categories: CategoryOption[];
  unreadCount: number;
}) {
  return (
    <WargaShell
      activeMenu="buat"
      fullName={userCtx.profile.full_name}
      roleLabel={roleLabelId(userCtx.role)}
      regionLabel={`${userCtx.region.name} / RW ${userCtx.region.rw}`}
      unreadCount={unreadCount}
    >
      <CreateTicketForm
        isPreview={userCtx.isPreview}
        profile={userCtx.profile}
        email={userCtx.email}
        userRegion={userCtx.region}
        regions={regions}
        categories={categories}
      />
    </WargaShell>
  );
}

async function LiveCreateTicketPage() {
  if (!isSupabaseConfigured()) {
    return (
      <CreateTicketView
        userCtx={PREVIEW_USER}
        regions={PREVIEW_REGIONS}
        categories={PREVIEW_CATEGORIES}
        unreadCount={PREVIEW_NOTIFICATIONS.filter((n) => !n.is_read).length}
      />
    );
  }

  const [userCtx, optionsRes, unreadRes] = await Promise.all([
    getWargaUserContext(),
    getFormOptions(),
    listNotifications(true),
  ]);

  const regions = optionsRes.success ? optionsRes.data.regions : PREVIEW_REGIONS;
  const categories = userCtx.isPreview
    ? PREVIEW_CATEGORIES
    : optionsRes.success
      ? optionsRes.data.categories
      : PREVIEW_CATEGORIES;
  const unreadCount = userCtx.isPreview
    ? PREVIEW_NOTIFICATIONS.filter((n) => !n.is_read).length
    : unreadRes.success
      ? unreadRes.data.length
      : 0;

  return (
    <CreateTicketView
      userCtx={userCtx}
      regions={regions}
      categories={categories}
      unreadCount={unreadCount}
    />
  );
}

export default function NewTicketPage() {
  return (
    <Suspense
      fallback={
        <CreateTicketView
          userCtx={PREVIEW_USER}
          regions={PREVIEW_REGIONS}
          categories={PREVIEW_CATEGORIES}
          unreadCount={PREVIEW_NOTIFICATIONS.filter((n) => !n.is_read).length}
        />
      }
    >
      <LiveCreateTicketPage />
    </Suspense>
  );
}
