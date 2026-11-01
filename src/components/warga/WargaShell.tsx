"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Headset,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquareText,
  PlusCircle,
  User,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

export type WargaMenuKey =
  | "ringkasan"
  | "pengaduan"
  | "buat"
  | "notifikasi"
  | "profil";

type WargaShellProps = {
  activeMenu?: WargaMenuKey;
  fullName: string;
  roleLabel: string;
  regionLabel: string;
  unreadCount?: number;
  children: ReactNode;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const MENU_ITEMS: Array<{
  key: WargaMenuKey;
  label: string;
  href: string;
  icon: typeof LayoutGrid;
}> = [
  { key: "ringkasan", label: "Ringkasan", href: "/dashboard/warga", icon: LayoutGrid },
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
  { key: "profil", label: "Profil saya", href: "/profile", icon: User },
];

export default function WargaShell({
  activeMenu,
  fullName,
  roleLabel,
  regionLabel,
  unreadCount = 0,
  children,
}: WargaShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const resolvedActive: WargaMenuKey =
    activeMenu ?? (pathname.startsWith("/profile") ? "profil" : "ringkasan");

  const initials = getInitials(fullName);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-5">
      <div>
        {/* Brand */}
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
            aria-label="Tutup menu"
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu Warga */}
        <p className="px-5 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
          MENU WARGA
        </p>

        <nav className="space-y-1 px-3">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActive === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
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

        {/* Keluar akun */}
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
              aria-label="Buka navigasi"
              className="rounded-lg border border-border p-2 text-ink hover:bg-surface lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-sm font-bold leading-tight text-ink">
                Ruang layanan Warga
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {roleLabel} • {regionLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/warga#notifikasi"
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
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-primary">
                  {initials}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-semibold text-ink">
                    {fullName}
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
                      href="/dashboard/warga"
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
                      Profil saya
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

        {/* Konten Halaman */}
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
