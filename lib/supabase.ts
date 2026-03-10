import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with full access — never expose to browser
export const supabase = createClient(url, serviceKey)
