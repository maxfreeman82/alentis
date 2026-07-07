import { createBrowserClient } from '@supabase/ssr';

// Safe wrapper — uses placeholders at build time (when env vars are absent during SSG).
// At runtime on the client, the real env vars are always present.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL    ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key-build-time',
  );
}
