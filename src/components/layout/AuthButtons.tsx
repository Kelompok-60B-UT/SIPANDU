import Link from "next/link";
import { ArrowUpRight, LayoutDashboard, LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/server";
import { signOut } from "@/app/actions/auth";
import { getRoleFromJwt, homePathForRole, roleLabelId } from "@/utils/roles";

export default async function AuthButtons() {
  let user = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Abaikan jika sesi belum tersedia
    }
  }

  if (user) {
    const role = getRoleFromJwt(user.app_metadata);

    return (
      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted md:inline-block">
          {roleLabelId(role)}
        </span>
        <Link
          href={homePathForRole(role)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:px-4 sm:text-sm"
        >
          <LayoutDashboard size={15} />
          Dashboard
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface sm:px-4 sm:text-sm"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface sm:px-4 sm:text-sm"
      >
        Masuk
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover sm:px-4 sm:text-sm"
      >
        <ArrowUpRight size={15} className="hidden sm:inline" />
        Daftar warga
      </Link>
    </div>
  );
}
