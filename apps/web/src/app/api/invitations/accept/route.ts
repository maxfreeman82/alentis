import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/invitations/accept
// Corps : { token, password, first_name, last_name }
// Public — crée le compte Supabase Auth + profil + marque l'invitation acceptée
export async function POST(req: NextRequest) {
  let body: { token?: string; password?: string; first_name?: string; last_name?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const { token, password, first_name, last_name } = body;
  if (!token)     return NextResponse.json({ error: 'token requis' },    { status: 400 });
  if (!password)  return NextResponse.json({ error: 'password requis' }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: 'Mot de passe : 8 caractères minimum' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Charger et valider l'invitation
  const { data: inv } = await admin
    .from('employee_invitations')
    .select('id, email, role, organization_id, status, expires_at, first_name, last_name')
    .eq('token', token)
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
  if (inv.status === 'accepted') {
    return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 410 });
  }
  if (new Date(inv.expires_at) < new Date()) {
    await admin.from('employee_invitations').update({ status: 'expired' }).eq('id', inv.id);
    return NextResponse.json({ error: 'Invitation expirée' }, { status: 410 });
  }

  // Créer le compte Supabase Auth (admin SDK, email déjà vérifié via lien)
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email:              inv.email,
    password,
    email_confirm:      true,
    user_metadata: {
      first_name: first_name ?? inv.first_name ?? '',
      last_name:  last_name  ?? inv.last_name  ?? '',
    },
  });

  if (authErr) {
    // Email déjà utilisé → proposer de se connecter
    if (authErr.message.includes('already') || authErr.code === 'email_exists') {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email. Connectez-vous puis rejoignez votre organisation.', code: 'email_exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: authErr.message }, { status: 500 });
  }

  const userId   = authData.user.id;
  const fname    = first_name  ?? inv.first_name ?? '';
  const lname    = last_name   ?? inv.last_name  ?? '';

  // Créer le profil dans profiles (lié à l'org)
  const { error: profileErr } = await admin.from('profiles').insert({
    user_id:         userId,
    email:           inv.email,
    role:            inv.role,
    organization_id: inv.organization_id,
    first_name:      fname,
    last_name:       lname,
  });

  if (profileErr) {
    // Rollback : supprimer l'utilisateur Auth créé
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // Marquer l'invitation comme acceptée
  await admin.from('employee_invitations').update({
    status:      'accepted',
    accepted_at: new Date().toISOString(),
  }).eq('id', inv.id);

  return NextResponse.json({ ok: true, email: inv.email });
}
