import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ROLE_MAP: Record<string, string> = {
  talent:       'talent_free',
  entreprise:   'org_admin',
  fondateur:    'founder',
  org_employee: 'org_employee',
};

// POST /api/auth/signup
// Crée le compte ET le profil en une seule requête côté serveur (admin SDK).
// Le client n'a plus qu'à faire signInWithPassword pour établir la session.
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; profileType?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const { email, password, profileType = 'talent' } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Créer l'utilisateur avec email confirmé
  const { data, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    const alreadyExists = createErr.message.includes('already registered') ||
                          createErr.message.includes('already been registered') ||
                          createErr.message.includes('User already registered');
    return NextResponse.json(
      { error: alreadyExists ? 'Ce compte existe déjà. Connectez-vous.' : createErr.message },
      { status: 400 }
    );
  }

  const userId = data.user.id;
  const role   = ROLE_MAP[profileType] ?? 'talent_free';

  // 2. Créer le profil
  const { error: profileErr } = await admin.from('profiles').insert({
    user_id: userId,
    email,
    role,
  });

  if (profileErr) {
    // Rollback : supprimer l'utilisateur créé
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // 3. Fondateur : créer la ligne founders
  if (role === 'founder') {
    const { data: profileRow } = await admin
      .from('profiles').select('id').eq('user_id', userId).maybeSingle();
    if (profileRow) {
      await admin.from('founders').upsert(
        { profile_id: profileRow.id },
        { onConflict: 'profile_id', ignoreDuplicates: true }
      );
    }
  }

  const redirectTo = role === 'founder' ? '/demarrer' :
                     role === 'org_admin' ? '/dashboard' : '/onboarding';

  return NextResponse.json({ ok: true, redirect: redirectTo });
}
