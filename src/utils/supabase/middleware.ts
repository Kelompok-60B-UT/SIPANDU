import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleFromJwt, homePathForRole } from '@/utils/roles'
import { isSupabaseConfigured } from '@/utils/supabase/client'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!isSupabaseConfigured()) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const role = getRoleFromJwt(user?.app_metadata)

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/daftar' ||
    pathname === '/auth/login'

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = homePathForRole(role)
    url.search = ''
    return NextResponse.redirect(url)
  }

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/tickets')

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user) {
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = homePathForRole(role)
      return NextResponse.redirect(url)
    }
    if (
      pathname.startsWith('/dashboard/rw') &&
      role !== 'ketua_rw' &&
      role !== 'admin'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = homePathForRole(role)
      return NextResponse.redirect(url)
    }
    if (
      pathname.startsWith('/dashboard/rt') &&
      role !== 'ketua_rt' &&
      role !== 'admin'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = homePathForRole(role)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
