import { createClient } from '@supabase/supabase-js';

// Types minimaux en attendant la génération complète via `pnpm supabase:types`
interface Database {
  public: {
    Functions: {
      set_app_org: { Args: { org_id: string }; Returns: undefined };
    };
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Client serveur — à utiliser dans les Server Components et Route Handlers
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Setter le contexte org avant toute requête — appelé dans chaque route API
export async function setOrgContext(
  client: ReturnType<typeof createServerClient>,
  organizationId: string
) {
  await client.rpc('set_app_org', { org_id: organizationId });
}
