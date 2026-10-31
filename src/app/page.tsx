export const instant = false

import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/actions/auth'
import {
  CheckCircle2,
  ExternalLink,
  Layers,
  Lock,
  LogOut,
  Radio,
  Server,
  Sparkles,
  Triangle,
  UserCheck,
} from 'lucide-react'

export default async function Home() {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-project')

  let user = null
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      // Gracefully handle unconfigured or network issues during setup
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Navigation Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-sm">
              S
            </div>
            <span className="font-bold text-lg tracking-tight">SIPANDU</span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Stack Ready
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                  {user.email}
                </span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Lock className="h-3.5 w-3.5" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Next.js + Tailwind CSS + Supabase + Vercel
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Fullstack Architecture <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Ready for Production
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your Next.js App Router application is initialized with Tailwind CSS,
            Supabase SSR authentication and server client utilities, and preconfigured for seamless deployment to Vercel.
          </p>
        </div>

        {/* Stack Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {/* Next.js Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-sm">
                N
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> App Router
              </span>
            </div>
            <h3 className="font-semibold text-sm">Next.js</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              React Server Components, Turbopack, Server Actions, & Route Handlers.
            </p>
          </div>

          {/* Tailwind CSS Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Tailwind v4
              </span>
            </div>
            <h3 className="font-semibold text-sm">Tailwind CSS</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Zero-configuration CSS engine with utility-first modern styling.
            </p>
          </div>

          {/* Supabase Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Radio className="h-5 w-5" />
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  isSupabaseConfigured
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                }`}
              >
                {isSupabaseConfigured ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </>
                ) : (
                  <>Needs .env.local</>
                )}
              </span>
            </div>
            <h3 className="font-semibold text-sm">Supabase SSR</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Client, Server & Middleware auth helpers with cookie synchronization.
            </p>
          </div>

          {/* Vercel Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center">
                <Triangle className="h-4 w-4 fill-current" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Configured
              </span>
            </div>
            <h3 className="font-semibold text-sm">Vercel Deployment</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Pre-configured with <code className="font-mono">vercel.json</code> & optimized build presets.
            </p>
          </div>
        </div>

        {/* Live Status & Quick Start */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Session State */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-sm mb-3">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span>Authentication Status</span>
            </div>
            {user ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    Logged in as:
                  </p>
                  <p className="text-sm font-semibold mt-0.5 break-all">{user.email}</p>
                  <p className="text-[11px] text-zinc-500 mt-2 font-mono">
                    ID: {user.id.slice(0, 18)}...
                  </p>
                </div>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:opacity-90 transition"
                  >
                    Log Out
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {isSupabaseConfigured
                    ? 'No user currently logged in. Test authentication by creating an account.'
                    : 'Set up your Supabase credentials in .env.local to enable real authentication.'}
                </p>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:opacity-90 transition"
                >
                  Go to Login / Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Configuration & Environment Guide */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
            <div className="flex items-center gap-2 font-semibold text-sm mb-3">
              <Server className="h-4 w-4 text-cyan-500" />
              <span>Project Structure & Next Steps</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-950/40">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  1. Setup Supabase
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                  Open <code className="rounded bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 font-mono">.env.local</code> and update your Supabase project keys:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] text-zinc-200">
                  NEXT_PUBLIC_SUPABASE_URL=...&#10;NEXT_PUBLIC_SUPABASE_ANON_KEY=...
                </pre>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-950/40">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  2. Deploy to Vercel
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                  Push your repository to GitHub/GitLab and link it in Vercel, adding the same environment variables.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="https://vercel.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                  >
                    Deploy to Vercel
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                  >
                    Supabase Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
