import { createClient } from '@supabase/supabase-js'

// Env vars are only available at runtime on Vercel, not at build time.
// createClient with empty strings is safe — requests will fail with a clear
// Supabase error if vars are genuinely missing in production.
const url = process.env.SUPABASE_URL ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Server-side client with full access — never expose to browser
export const supabase = createClient(url, serviceKey)
