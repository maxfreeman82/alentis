import { type NextRequest, NextResponse } from 'next/server';
import { createUserClient } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/workspace/setup-org
// Crée l'organisation et la lie au profil org_admin
export async function POST(req: NextRequest) {
  let body: { name?: string; sector?: string; size?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const { name, sector = 'autre', size = '1-10' } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom de l\'organisation est requis' }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = createAdminClient();

  // Vérifier que l'utilisateur est org_admin sans organisation
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, organization_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  if (profile.organization_id) return NextResponse.json({ error: 'Organisation déjà configurée' }, { status: 409 });

  // Créer l'organisation
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name: name.trim(), sector, size, plan: 'free', cert_level: 0, ias_score: 0 })
    .select('id')
    .single();

  if (orgErr || !org) {
    return NextResponse.json({ error: orgErr?.message ?? 'Erreur création organisation' }, { status: 500 });
  }

  // Lier le profil à l'organisation
  const { error: updateErr } = await admin
    .from('profiles')
    .update({ organization_id: org.id, onboarding_completed: true })
    .eq('id', profile.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, organizationId: org.id });
}
