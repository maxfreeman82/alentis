import { createUserClient } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const ROLE_MAP: Record<string, string> = {
  talent:     'talent_free',
  entreprise: 'org_admin',
  fondateur:  'founder',
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=no_code`);
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }

  // Récupérer l'utilisateur après échange
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin       = createAdminClient();
    const profileType = (user.user_metadata?.profile_type as string | undefined) ?? 'talent';
    const role        = ROLE_MAP[profileType] ?? 'talent_free';

    // Créer le profil si absent (ignoreDuplicates = ne pas écraser un profil existant)
    const { error: profileErr } = await admin.from('profiles').upsert(
      {
        user_id:              user.id,
        email:                user.email ?? '',
        role,
        onboarding_completed: false,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

    if (profileErr) {
      console.error('[callback] profile upsert error:', profileErr.message);
    }

    // Pour les fondateurs : créer une ligne dans founders si absente
    if (role === 'founder') {
      const { data: profileRow } = await admin
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileRow) {
        await admin.from('founders').upsert(
          { profile_id: profileRow.id },
          { onConflict: 'profile_id', ignoreDuplicates: true }
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
