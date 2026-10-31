import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/server";
import { getRoleFromJwt, homePathForRole } from "@/utils/roles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const role = getRoleFromJwt(data.session?.user?.app_metadata ?? null);
      const target = next ?? homePathForRole(role);
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
