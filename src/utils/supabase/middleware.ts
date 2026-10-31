import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRoleFromJwt, homePathForRole } from '@/utils/roles'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const role = getRoleFromJwt(user?.app_metadata)

  if (user && (pathname === '/login' || pathname === '/auth/login')) {
    const url = request.nextUrl.clone()
    url.pathname = homePathForRole(role)
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

    if (pathname.startsWith('/dashboard/rw') && role !== 'ketua_rw' && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = homePathForRole(role)
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/dashboard/rt') && role !== 'ketua_rt' && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = homePathForRole(role)
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
