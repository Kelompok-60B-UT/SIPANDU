import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url &&
      key &&
      !url.includes('your-project') &&
      !url.includes('your-supabase') &&
      !key.includes('your-anon-key') &&
      !key.includes('your-supabase'),
  )
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
