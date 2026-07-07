'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Client Supabase avec session utilisateur (anon key + cookies)
export async function createUserClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()          { return jar.getAll(); },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            // Server Component — le middleware gère le refresh des cookies
          }
        },
      },
    }
  );
}

// Remplace requireAuth() — redirige si non connecté
export async function requireAuth() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  return user;
}
