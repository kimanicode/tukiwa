import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.TUKIWA_SUPABASE_URL!,
    process.env.TUKIWA_SUPABASE_ANON_kEY!
  )
}