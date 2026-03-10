import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — createClient must not run at module evaluation time because
// Next.js evaluates route modules during build when env vars are not yet available.
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY måste vara satta')
    }
    // Server-side client with full access — never expose to browser
    _client = createClient(url, serviceKey)
  }
  return _client
}
