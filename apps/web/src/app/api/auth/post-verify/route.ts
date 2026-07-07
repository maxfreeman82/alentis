import { type NextRequest, NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/auth/post-verify
// Appelé côté client après supabase.auth.verifyOtp() — la session est déjà dans les cookies.
// Corps : { password, profileType, firstName?, lastName?, inviteToken? }
export async function POST(req: NextRequest) {
  let body: {
    password?:    string;
    profileType?: string;
    firstName?:   string;
    lastName?:    string;
    inviteToken?: string;
  };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  // Lire la session depuis les cookies (définie par verifyOtp côté client)
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Session expirée — recommencez' }, { status: 401 });

  const admin        = createAdminClient();
  const { password, profileType, firstName, lastName, inviteToken } = body;

  // Vérifier si le profil existe déjà (utilisateur déjà inscrit qui refait le flux OTP)
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile && !inviteToken) {
    // Utilisateur existant — juste connecté via OTP (cas "mot de passe oublié" géré côté client)
    return NextResponse.json({ ok: true, redirect: '/', existing: true });
  }

  // Définir le mot de passe via admin SDK (si fourni et nouvel utilisateur)
  if (password && !existingProfile) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, { password });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 });
  }

  const ROLE_MAP: Record<string, string> = {
    talent:     'talent_free',
    entreprise: 'org_admin',
    fondateur:  'founder',
    org_employee: 'org_employee',
  };

  // Gestion invitation employé (lien token → organisation)
  if (inviteToken) {
    const { data: inv } = await admin
      .from('employee_invitations')
      .select('id, organization_id, role, email, status, expires_at')
      .eq('token', inviteToken)
      .maybeSingle();

    if (!inv || inv.status !== 'pending' || new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation invalide ou expirée' }, { status: 410 });
    }

    if (existingProfile) {
      // Utilisateur existant : mettre à jour l'organisation
      await admin.from('profiles').update({
        organization_id: inv.organization_id,
        role:            inv.role,
      }).eq('id', existingProfile.id);
    } else {
      // Nouveau : créer le profil lié à l'org
      await admin.from('profiles').insert({
        user_id:         user.id,
        email:           user.email ?? inv.email,
        role:            inv.role,
        organization_id: inv.organization_id,
        first_name:      firstName ?? null,
        last_name:       lastName  ?? null,
      });
    }

    // Marquer invitation acceptée
    await admin.from('employee_invitations').update({
      status:      'accepted',
      accepted_at: new Date().toISOString(),
    }).eq('id', inv.id);

    return NextResponse.json({ ok: true, redirect: '/' });
  }

  // Création profil standard (talent / org_admin / fondateur)
  if (!existingProfile) {
    const role = ROLE_MAP[profileType ?? 'talent'] ?? 'talent_free';

    const { error: profileErr } = await admin.from('profiles').insert({
      user_id:    user.id,
      email:      user.email ?? '',
      role,
      first_name: firstName ?? null,
      last_name:  lastName  ?? null,
    });

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    // Fondateur : créer ligne founders
    if (role === 'founder') {
      const { data: profileRow } = await admin
        .from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (profileRow) {
        await admin.from('founders').upsert(
          { profile_id: profileRow.id },
          { onConflict: 'profile_id', ignoreDuplicates: true }
        );
      }
    }
  }

  return NextResponse.json({ ok: true, redirect: '/onboarding' });
}
