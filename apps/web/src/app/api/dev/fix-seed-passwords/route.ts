import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/dev/fix-seed-passwords
// Recrée les auth.users seed via le SDK admin (GoTrue) et met à jour profiles.user_id
// SUPPRIMER CE FICHIER APRÈS UTILISATION

export async function GET() {
  const admin = createAdminClient();

  // 1. Trouver les admins seed par pattern email
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('user_id, email, role, organization_id')
    .eq('role', 'org_admin')
    .like('email', '%.adm%');

  if (!adminProfiles || adminProfiles.length === 0) {
    return NextResponse.json({ error: 'Aucun admin seed trouvé' }, { status: 404 });
  }

  const seedOrgIds = [...new Set(adminProfiles.map(p => p.organization_id).filter(Boolean))];

  // 2. Tous les profils de ces orgs
  const { data: allProfiles } = await admin
    .from('profiles')
    .select('id, user_id, email, role, first_name, last_name')
    .in('organization_id', seedOrgIds);

  const profiles = allProfiles ?? [];
  const results: { email: string; status: string }[] = [];
  let ok = 0;
  let errors = 0;

  for (const profile of profiles) {
    const password = profile.role === 'org_admin' ? 'Admin2026!' : 'Employe2026!';

    // 3. Créer le user via SDK admin (GoTrue)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: profile.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: profile.first_name ?? '',
        last_name:  profile.last_name  ?? '',
      },
    });

    if (createErr) {
      results.push({ email: profile.email, status: `ERREUR: ${createErr.message}` });
      errors++;
      continue;
    }

    // 4. Mettre à jour profile.user_id avec le nouvel ID GoTrue
    const newUserId = created.user.id;
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ user_id: newUserId })
      .eq('id', profile.id);

    if (updateErr) {
      results.push({ email: profile.email, status: `CRÉÉ mais profil non mis à jour: ${updateErr.message}` });
      errors++;
    } else {
      results.push({ email: profile.email, status: 'OK' });
      ok++;
    }
  }

  return NextResponse.json({
    total: profiles.length,
    ok,
    errors,
    message: `${ok} users créés/mis à jour, ${errors} erreurs`,
    details: results,
  });
}
