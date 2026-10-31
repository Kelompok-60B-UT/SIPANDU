import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/actions/auth";

// Tombol di kanan Navbar: berbeda tergantung sudah login atau belum.
// Komponen ini dibungkus Suspense di Navbar.tsx karena membaca cookies.
export default async function AuthButtons() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Kalau Supabase belum siap, anggap belum login
  }

  if (user) {
    return (
      <>
        <span className="hidden max-w-40 truncate text-xs text-muted sm:inline">
          {user.email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-surface"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-surface"
      >
        Masuk
      </Link>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
      >
        <ArrowUpRight size={16} />
        Daftar warga
      </Link>
    </>
  );
}
