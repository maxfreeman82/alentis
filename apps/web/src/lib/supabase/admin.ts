import { createClient } from '@supabase/supabase-js';

// Client admin — bypass RLS, à utiliser dans les webhooks uniquement
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
