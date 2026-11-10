import {
  Bell,
  ClipboardCheck,
  ClipboardList,
  History,
  LayoutGrid,
  PlusCircle,
  Tag,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavRole = "admin" | "ketua_rw" | "ketua_rt" | "warga";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    href: "/dashboard/admin#ringkasan",
    icon: LayoutGrid,
  },
  {
    key: "seluruh",
    label: "Seluruh pengaduan",
    href: "/dashboard/admin#pengaduan-lintas-wilayah",
    icon: ClipboardList,
  },
  {
    key: "akun",
    label: "Akun & hak akses",
    href: "/dashboard/admin#akun-hak-akses",
    icon: Users,
  },
  {
    key: "kategori",
    label: "Kategori layanan",
    href: "/dashboard/admin#kategori-layanan",
    icon: Tag,
  },
  {
    key: "aktivitas",
    label: "Catatan aktivitas",
    href: "/dashboard/admin#catatan-aktivitas",
    icon: History,
  },
  {
    key: "profil",
    label: "Profil saya",
    href: "/profile",
    icon: User,
  },
] as const;

export const RW_NAV_ITEMS: readonly NavItem[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    href: "/dashboard/rw#ringkasan",
    icon: LayoutGrid,
  },
  {
    key: "tindak-lanjut",
    label: "Tindak lanjut",
    href: "/dashboard/rw#perbarui-penanganan",
    icon: Wrench,
  },
  {
    key: "seluruh",
    label: "Seluruh pengaduan",
    href: "/dashboard/rw#antrean-tindak-lanjut",
    icon: ClipboardList,
  },
  {
    key: "persetujuan-warga",
    label: "Persetujuan warga",
    href: "/dashboard/rw#persetujuan-warga",
    icon: Users,
  },
  {
    key: "notifikasi",
    label: "Notifikasi",
    href: "/dashboard/rw#kabar-terbaru",
    icon: Bell,
  },
  {
    key: "profil",
    label: "Profil saya",
    href: "/profile",
    icon: User,
  },
] as const;

export const RT_NAV_ITEMS: readonly NavItem[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    href: "/dashboard/rt#ringkasan",
    icon: LayoutGrid,
  },
  {
    key: "verifikasi",
    label: "Verifikasi laporan",
    href: "/dashboard/rt#pemeriksaan-laporan",
    icon: ClipboardCheck,
  },
  {
    key: "persetujuan-warga",
    label: "Persetujuan warga",
    href: "/dashboard/rt#persetujuan-warga",
    icon: Users,
  },
  {
    key: "riwayat",
    label: "Riwayat pengaduan",
    href: "/dashboard/rt#antrean-verifikasi",
    icon: History,
  },
  {
    key: "notifikasi",
    label: "Notifikasi",
    href: "/dashboard/rt#batas-kewenangan",
    icon: Bell,
  },
  {
    key: "profil",
    label: "Profil saya",
    href: "/profile",
    icon: User,
  },
] as const;

export const WARGA_NAV_ITEMS: readonly NavItem[] = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    href: "/dashboard/warga",
    icon: LayoutGrid,
  },
  {
    key: "pengaduan",
    label: "Pengaduan saya",
    href: "/dashboard/warga#pengaduan-saya",
    icon: ClipboardList,
  },
  {
    key: "buat",
    label: "Buat pengaduan",
    href: "/tickets/new",
    icon: PlusCircle,
  },
  {
    key: "notifikasi",
    label: "Notifikasi",
    href: "/dashboard/warga#notifikasi",
    icon: Bell,
  },
  {
    key: "profil",
    label: "Profil saya",
    href: "/profile",
    icon: User,
  },
] as const;

export const NAV_HEADINGS: Record<NavRole, string> = {
  admin: "MENU ADMIN",
  ketua_rw: "MENU KETUA RW",
  ketua_rt: "MENU KETUA RT",
  warga: "MENU WARGA",
};

export function getNavItemsForRole(role: NavRole): readonly NavItem[] {
  switch (role) {
    case "admin":
      return ADMIN_NAV_ITEMS;
    case "ketua_rw":
      return RW_NAV_ITEMS;
    case "ketua_rt":
      return RT_NAV_ITEMS;
    case "warga":
      return WARGA_NAV_ITEMS;
  }
}
