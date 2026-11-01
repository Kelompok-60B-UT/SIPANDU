"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Headset,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquareText,
  Tag,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

export type StaffRoleType = "ketua_rt" | "ketua_rw" | "admin";

type StaffShellProps = {
  role: StaffRoleType;
  fullName: string;
  subHeaderLabel: string;
  unreadCount?: number;
  avatarUrl?: string | null;
  activeMenu?: string;
  children: ReactNode;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const RT_MENUS = [
  {
    key: "ringkasan",
    label: "Ringkasan",
    href: "/dashboard/rt#ringkasan",
    icon: LayoutGrid,
  },
  {
    key: "verifikasi",
    label: "Verifikasi laporan",
    href: "/dashboard/rt#antrean-verifikasi",
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
];

const RW_MENUS = [
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
];

const ADMIN_MENUS = [
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
];

export default function StaffShell({
  role,
  fullName,
  subHeaderLabel,
  unreadCount = 0,
  avatarUrl,
  activeMenu,
  children,
}: StaffShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(
    activeMenu ?? (pathname.startsWith("/profile") ? "profil" : "ringkasan"),
  );
  const [clientAvatar, setClientAvatar] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("sipandu_last_role", role);
    } catch {
      // ignore
    }
  }, [role]);

  useEffect(() => {
    const syncProfileAndAvatar = () => {
      try {
        setClientAvatar(localStorage.getItem("sipandu_avatar_url"));
        const rawOverride = localStorage.getItem(
          `sipandu_profile_${role}`,
        ) || localStorage.getItem("sipandu_profile_override");
        if (rawOverride) {
          const parsed = JSON.parse(rawOverride) as {
            fullName?: string;
            role?: string;
          };
          if (
            parsed.fullName &&
            (!parsed.role || parsed.role === role)
          ) {
            setClientName(parsed.fullName);
          }
        }
      } catch {
        // ignore
      }
    };
    syncProfileAndAvatar();
    window.addEventListener("sipandu-avatar-change", syncProfileAndAvatar);
    window.addEventListener("sipandu-profile-change", syncProfileAndAvatar);
    return () => {
      window.removeEventListener("sipandu-avatar-change", syncProfileAndAvatar);
      window.removeEventListener("sipandu-profile-change", syncProfileAndAvatar);
    };
  }, [role]);

  const resolvedActiveKey = pathname.startsWith("/profile")
    ? "profil"
    : activeMenu ?? activeKey;

  const displayName = clientName || fullName;
  const displayAvatar = avatarUrl || clientAvatar;

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "ketua_rw"
        ? "Ketua RW"
        : "Ketua RT";

  const menuHeading =
    role === "admin"
      ? "MENU ADMIN"
      : role === "ketua_rw"
        ? "MENU KETUA RW"
        : "MENU KETUA RT";

  const headerTitle =
    role === "admin"
      ? "Ruang layanan Admin"
      : role === "ketua_rw"
        ? "Ruang layanan Ketua RW"
        : "Ruang layanan Ketua RT";

  const menus =
    role === "admin"
      ? ADMIN_MENUS
      : role === "ketua_rw"
        ? RW_MENUS
        : RT_MENUS;

  const bellHref =
    role === "admin"
      ? "/dashboard/admin#catatan-aktivitas"
      : role === "ketua_rw"
        ? "/dashboard/rw#kabar-terbaru"
        : "/dashboard/rt#antrean-verifikasi";

  const initials = getInitials(displayName);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-5">
      <div>
        {/* Logo SIPANDU */}
        <div className="flex items-center justify-between px-5 pb-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <MessageSquareText size={18} />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-ink">
                SIPANDU
              </span>
              <span className="block text-[10px] text-muted">
                RW 06 Parakansaat, Bandung
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup navigasi"
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Label Menu */}
        <p className="px-5 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
          {menuHeading}
        </p>

        <nav className="space-y-1 px-3">
          {menus.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActiveKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => {
                  setActiveKey(item.key);
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs transition-colors ${
                  isActive
                    ? "bg-blue-50/90 font-semibold text-primary"
                    : "font-medium text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Kartu Bantuan */}
        <div className="mx-3 mt-6 rounded-2xl bg-surface p-4">
          <Headset size={18} className="text-primary" />
          <p className="mt-2.5 text-xs font-bold text-ink">Butuh bantuan?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Pengurus RW siap membantu Anda.
          </p>
          <Link
            href="/#bantuan"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Hubungi pengurus →
          </Link>
        </div>

        {/* Keluar Akun */}
        <form action={signOut} className="mx-3 mt-2">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <LogOut size={16} />
            <span>Keluar akun</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface text-ink">
      {/* Sidebar Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-ink/30 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] border-r border-border bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Area Utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              className="rounded-lg border border-border p-2 text-ink hover:bg-surface lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-sm font-bold leading-tight text-ink">
                {headerTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">{subHeaderLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={bellHref}
              aria-label="Notifikasi"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink transition-colors hover:bg-slate-200/70"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-surface"
              >
                {displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-primary">
                    {initials}
                  </span>
                )}
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-semibold text-ink">
                    {displayName}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {roleLabel}
                  </span>
                </span>
                <ChevronDown size={14} className="text-muted" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-white p-1.5 shadow-lg">
                    <Link
                      href={
                        role === "admin"
                          ? "/dashboard/admin"
                          : role === "ketua_rw"
                            ? "/dashboard/rw"
                            : "/dashboard/rt"
                      }
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-surface"
                    >
                      <LayoutGrid size={14} className="text-muted" />
                      Ringkasan
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink hover:bg-surface"
                    >
                      <User size={14} className="text-muted" />
                      Profil pengurus
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={14} />
                        Keluar akun
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Konten */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-7">
          <div className="mx-auto max-w-6xl">
            {children}
            <footer className="mt-8 text-[11px] text-muted">
              SIPANDU • Layanan warga RW 06 Parakansaat, Bandung
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
