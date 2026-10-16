import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

const ROLE_MAP: Record<string, string> = {
  talent:     'talent_free',
  entreprise: 'org_admin',
  fondateur:  'founder',
};

const RECOVERY_PATH = '/nouveau-mot-de-passe';

// Retour des liens envoyés par e-mail (inscription, connexion par lien,
// « Mot de passe oublié »). Supabase redirige ici avec soit `code` (flux PKCE,
// lien ouvert dans le même navigateur), soit `token_hash` + `type` (modèle
// d'e-mail basé sur le hash). On ouvre la session, on crée le profil s'il
// manque, puis on envoie vers `next` — chemin interne uniquement.
export async function GET(req: NextRequest) {
  const url       = req.nextUrl;
  const origin    = url.origin;
  const code      = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type      = url.searchParams.get('type') as EmailOtpType | null;
  const nextParam = url.searchParams.get('next') ?? '/';
  // Pas de redirection ouverte : uniquement un chemin du site (« //x » = autre domaine)
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  const isRecovery = next === RECOVERY_PATH;

  // Échec : retour à la demande de réinitialisation, sinon à la connexion (comportement historique)
  const fail = (reason: 'no_code' | 'auth') => NextResponse.redirect(
    isRecovery ? `${origin}/mot-de-passe-oublie?erreur=lien` : `${origin}/sign-in?error=${reason}`,
  );

  if (!code && !(tokenHash && type)) return fail('no_code');

  const response = NextResponse.redirect(`${origin}${next}`);
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

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
  // Lien expiré, déjà utilisé, ou ouvert dans un autre navigateur (PKCE)
  if (error) return fail('auth');

  const user = data.user;
  if (user) {
    const admin       = createAdminClient();
    const profileType = (user.user_metadata?.profile_type as string | undefined) ?? 'talent';
    const role        = ROLE_MAP[profileType] ?? 'talent_free';

    // Créer le profil si absent (ignoreDuplicates = ne pas écraser un profil existant)
    const { error: profileErr } = await admin.from('profiles').upsert(
      { user_id: user.id, email: user.email ?? '', role, onboarding_completed: false },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    if (profileErr) console.error('[callback] profile upsert error:', profileErr.message);

    // Pour les fondateurs : créer une ligne dans founders si absente
    if (role === 'founder') {
      const { data: profileRow } = await admin
        .from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (profileRow) {
        await admin.from('founders').upsert(
          { profile_id: profileRow.id },
          { onConflict: 'profile_id', ignoreDuplicates: true },
        );
      }
    }
  }

  return response;
}
