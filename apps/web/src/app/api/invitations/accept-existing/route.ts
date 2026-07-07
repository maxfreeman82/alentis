import { type NextRequest, NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/invitations/accept-existing
// Corps : { token: string }
// Auth  : utilisateur connecté (déjà inscrit) qui rejoint une org via invitation
export async function POST(req: NextRequest) {
  let body: { token?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  if (!body.token) return NextResponse.json({ error: 'token requis' }, { status: 400 });

  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from('employee_invitations')
    .select('id, organization_id, role, email, status, expires_at')
    .eq('token', body.token)
    .maybeSingle();

  if (!inv)                                    return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
  if (inv.status === 'accepted')               return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 410 });
  if (new Date(inv.expires_at) < new Date())   return NextResponse.json({ error: 'Invitation expirée' }, { status: 410 });

  // Vérifier que l'email correspond
  if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return NextResponse.json(
      { error: `Cette invitation est destinée à ${inv.email}. Connectez-vous avec ce compte.` },
      { status: 403 }
    );
  }

  // Mettre à jour le profil existant
  const { error: updateErr } = await admin
    .from('profiles')
    .update({ organization_id: inv.organization_id, role: inv.role })
    .eq('user_id', user.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await admin.from('employee_invitations').update({
    status:      'accepted',
    accepted_at: new Date().toISOString(),
  }).eq('id', inv.id);

  return NextResponse.json({ ok: true });
}
