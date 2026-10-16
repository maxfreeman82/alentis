import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';

// Retour des liens envoyés par e-mail (« Mot de passe oublié », connexion par lien).
// Supabase redirige ici avec soit `code` (flux PKCE, lien ouvert dans le même
// navigateur), soit `token_hash` + `type` (modèle d'e-mail basé sur le hash).
// On ouvre la session puis on envoie vers `next`, chemin interne uniquement.
export async function GET(req: NextRequest) {
  const url       = req.nextUrl;
  const code      = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type      = url.searchParams.get('type') as EmailOtpType | null;
  const nextParam = url.searchParams.get('next') ?? '/';
  // Pas de redirection ouverte : uniquement un chemin du site (« //x » = autre domaine)
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  const response = NextResponse.redirect(new URL(next, url.origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()     { return req.cookies.getAll(); },
        setAll(list) { list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
      },
    },
  );

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('Lien incomplet') };

  if (error) {
    // Lien expiré, déjà utilisé, ou ouvert dans un autre navigateur (PKCE)
    const failure = new URL('/mot-de-passe-oublie', url.origin);
    failure.searchParams.set('erreur', 'lien');
    return NextResponse.redirect(failure);
  }
  return response;
}
