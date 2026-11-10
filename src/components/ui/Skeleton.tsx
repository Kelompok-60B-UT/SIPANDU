import {
  Headset,
  LogOut,
  Menu,
  MessageSquareText,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import {
  ADMIN_NAV_ITEMS,
  NAV_HEADINGS,
  RT_NAV_ITEMS,
  RW_NAV_ITEMS,
  WARGA_NAV_ITEMS,
  type NavItem,
} from "@/config/navigation";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`}
    />
  );
}

export function AuthButtonsSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-busy="true">
      <Skeleton className="h-9 w-20 rounded-lg" />
      <Skeleton className="h-9 w-28 rounded-lg sm:w-32" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-2 md:grid-cols-4"
      aria-busy="true"
    >
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="mt-2 h-3.5 w-32 rounded-md" />
        </div>
      ))}
      <div className="space-y-1.5 md:ml-auto md:w-48">
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-4/5 rounded-md" />
      </div>
    </div>
  );
}

export function RegisterFormSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <div className="space-y-3.5 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="mt-2 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

type SkeletonMenuVariant =
  | "warga"
  | "rt"
  | "rw"
  | "admin"
  | "staff"
  | "neutral";

function getSkeletonNav(variant: SkeletonMenuVariant, headerTitle: string) {
  if (variant === "admin") {
    return {
      title: NAV_HEADINGS.admin,
      items: ADMIN_NAV_ITEMS,
      isNeutral: false,
    };
  }
  if (variant === "rt") {
    return {
      title: NAV_HEADINGS.ketua_rt,
      items: RT_NAV_ITEMS,
      isNeutral: false,
    };
  }
  if (variant === "rw") {
    return {
      title: NAV_HEADINGS.ketua_rw,
      items: RW_NAV_ITEMS,
      isNeutral: false,
    };
  }
  if (variant === "staff") {
    const isRt = headerTitle.toLowerCase().includes("rt");
    return isRt
      ? {
          title: NAV_HEADINGS.ketua_rt,
          items: RT_NAV_ITEMS,
          isNeutral: false,
        }
      : {
          title: NAV_HEADINGS.ketua_rw,
          items: RW_NAV_ITEMS,
          isNeutral: false,
        };
  }
  if (variant === "neutral") {
    return {
      title: "NAVIGASI",
      items: [] as readonly NavItem[],
      isNeutral: true,
    };
  }
  return {
    title: NAV_HEADINGS.warga,
    items: WARGA_NAV_ITEMS,
    isNeutral: false,
  };
}

function AppShellSkeleton({
  headerTitle,
  variant = "warga",
  children,
}: {
  headerTitle: string;
  variant?: SkeletonMenuVariant;
  children: React.ReactNode;
}) {
  const nav = getSkeletonNav(variant, headerTitle);

  return (
    <div className="flex min-h-screen bg-surface text-ink" aria-busy="true">
      {/* Navigasi desktop tetap utuh agar tata letak stabil */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        <div className="flex h-full flex-col justify-between py-5">
          <div>
            <div className="flex items-center gap-2.5 px-5 pb-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <MessageSquareText size={18} />
              </span>
              <span className="leading-tight">
                <span className="block text-base font-bold tracking-tight text-ink">
                  SIPANDU
                </span>
                <span className="block text-[10px] text-muted">
                  {siteConfig.rwLabel}
                </span>
              </span>
            </div>

            {nav.isNeutral ? (
              <div className="px-5 pt-3 pb-2">
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            ) : (
              <p className="px-5 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                {nav.title}
              </p>
            )}

            <nav className="space-y-1 px-3">
              {nav.isNeutral
                ? [0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                    >
                      <Skeleton className="h-4 w-4 rounded-md shrink-0" />
                      <Skeleton
                        className={`h-3.5 rounded-md ${
                          i % 2 === 0 ? "w-28" : "w-36"
                        }`}
                      />
                    </div>
                  ))
                : nav.items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                          i === 0
                            ? "bg-blue-50/90 font-semibold text-primary"
                            : "text-muted"
                        }`}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
            </nav>

            <div className="mx-3 mt-6 rounded-2xl bg-surface p-4">
              <Headset size={18} className="text-primary" />
              <p className="mt-2.5 text-xs font-bold text-ink">Butuh bantuan?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Pengurus RW siap membantu Anda.
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                Hubungi pengurus →
              </span>
            </div>

            {/* Placeholder menu keluar */}
            <div className="mx-3 mt-2">
              <div className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-muted">
                <LogOut size={16} />
                <span>Keluar akun</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Konten utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Placeholder tombol menu seluler */}
            <div
              aria-hidden="true"
              className="rounded-lg border border-border p-2 text-muted lg:hidden"
            >
              <Menu size={18} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-ink">
                {headerTitle}
              </p>
              <Skeleton className="mt-1.5 h-3 w-32 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="hidden space-y-1.5 sm:block">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-2.5 w-16 rounded-md" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-7">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function WargaDashboardSkeleton() {
  return (
    <AppShellSkeleton headerTitle="Ruang layanan Warga" variant="warga">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-40 rounded-md" />
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* Kartu statistik */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-4 w-4 rounded-md" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </div>

        {/* Kartu tabel */}
        <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-3.5 w-56 rounded-md" />
            </div>
            <Skeleton className="h-9 w-48 rounded-xl" />
          </div>
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* Grid bawah */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <Skeleton className="h-5 w-56 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}

export function StaffDashboardSkeleton({
  headerTitle = "Ruang layanan Pengurus",
  variant = "staff",
}: {
  headerTitle?: string;
  variant?: "rt" | "rw" | "staff";
}) {
  return (
    <AppShellSkeleton headerTitle={headerTitle} variant={variant}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36 rounded-md" />
          <Skeleton className="h-8 w-72 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>

        <Skeleton className="h-16 w-full rounded-2xl" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-4 w-4 rounded-md" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <div className="grid gap-6 rounded-2xl border border-border bg-white p-5 sm:p-6 lg:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-5 w-52 rounded-md" />
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <AppShellSkeleton headerTitle="Ruang layanan Admin" variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-44 rounded-md" />
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-border bg-white p-5"
            >
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <Skeleton className="h-5 w-56 rounded-md" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <Skeleton className="h-5 w-44 rounded-md" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}

export function CreateTicketSkeleton() {
  return (
    <AppShellSkeleton headerTitle="Ruang layanan Warga" variant="warga">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 rounded-2xl border border-border bg-white p-5 sm:p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
            <div className="space-y-2">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-border bg-white p-5">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-4/6 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}

export function ProfileSkeleton({
  variant = "neutral",
}: {
  variant?: SkeletonMenuVariant;
} = {}) {
  return (
    <AppShellSkeleton headerTitle="Profil Saya" variant={variant}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>

        <div className="divide-y divide-border rounded-2xl border border-border bg-white">
          <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-44 rounded-md" />
            </div>
            <div className="flex items-center gap-5">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[230px_1fr] lg:gap-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}

export function TicketDetailSkeleton({
  variant = "neutral",
}: {
  variant?: SkeletonMenuVariant;
} = {}) {
  return (
    <AppShellSkeleton headerTitle="Pelacakan & Detail Tiket" variant={variant}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-8 w-80 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>

        {/* Indikator tahapan */}
        <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
          <Skeleton className="h-4 w-44 rounded-md" />
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* Rincian dan riwayat tiket */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <Skeleton className="h-5 w-44 rounded-md" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 border-l-2 border-border pl-4">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}
