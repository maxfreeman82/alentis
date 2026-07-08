import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/dev/fix-seed-passwords
// Réinitialise les mots de passe des utilisateurs seed via le SDK admin
// SUPPRIMER CE FICHIER APRÈS UTILISATION

export async function GET() {
  const admin = createAdminClient();

  // D'abord : lister les orgs existantes pour debug
  const { data: allOrgs } = await admin
    .from('organizations')
    .select('id, name')
    .order('name');

  // Les admins seed ont tous ".adm" dans leur email
  // Les employés seed ont un chiffre double collé au nom dans l'email
  // On cible via le pattern email des admins + on récupère leurs orgs

  // Étape 1 : admins seed (email contient '.adm')
  const { data: adminProfiles } = await admin
    .from('profiles')
    .select('user_id, email, role, organization_id')
    .eq('role', 'org_admin')
    .like('email', '%.adm%');

  if (!adminProfiles || adminProfiles.length === 0) {
    return NextResponse.json({
      error: 'Aucun admin seed trouvé (pattern .adm dans email)',
      orgs_in_db: allOrgs?.map(o => o.name) ?? [],
    }, { status: 404 });
  }

  // Étape 2 : récupérer les org_ids des admins seed
  const seedOrgIds = [...new Set(adminProfiles.map(p => p.organization_id).filter(Boolean))];

  // Étape 3 : tous les profils de ces orgs (admins + employés)
  const { data: allProfiles } = await admin
    .from('profiles')
    .select('user_id, email, role')
    .in('organization_id', seedOrgIds)
    .not('user_id', 'is', null);

  const profiles = allProfiles ?? [];

  const results: { email: string; role: string; status: string }[] = [];
  let ok = 0;
  let errors = 0;

  for (const profile of profiles) {
    const newPassword = profile.role === 'org_admin' ? 'Admin2026!' : 'Employe2026!';
    const { error } = await admin.auth.admin.updateUserById(profile.user_id, {
      password: newPassword,
      email_confirm: true,
    });

    if (error) {
      results.push({ email: profile.email, role: profile.role, status: `ERREUR: ${error.message}` });
      errors++;
    } else {
      results.push({ email: profile.email, role: profile.role, status: 'OK' });
      ok++;
    }
  }

  return NextResponse.json({
    orgs_found: seedOrgIds.length,
    total: profiles.length,
    ok,
    errors,
    message: `${ok} mots de passe réinitialisés, ${errors} erreurs`,
    details: results,
  });
}
