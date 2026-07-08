import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/dev/fix-seed-passwords
// Réinitialise les mots de passe des utilisateurs seed via le SDK admin
// SUPPRIMER CE FICHIER APRÈS UTILISATION

const SEED_ORG_NAMES = [
  'Dakar Tech Hub','BanqueAfrique Digital','CliniqueSenegal Plus',
  'AfriLearn Academy','MarchePro Distribution','AgroSenegal SA',
  'SolarAfrique Energie','ConnectAfrik Telecom','AfricaMedia Group',
  'ProprieteAfrique Immo','TransLog Afrique','FoodAfrika Agroalim',
  'MineralAfrica Resources','Tourisme Teranga','AssuAfrique SA',
  'AfriConsult Partners','Developpement Afrique ONG','AfriStyle Couture',
  'BuildAfrique BTP','FinTech Microfinance',
];

export async function GET() {
  const admin = createAdminClient();

  // Récupérer toutes les orgs seed
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name')
    .in('name', SEED_ORG_NAMES);

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ error: 'Aucune organisation seed trouvée' }, { status: 404 });
  }

  const orgIds = orgs.map(o => o.id);

  // Récupérer tous les profils liés à ces orgs
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, email, role')
    .in('organization_id', orgIds)
    .not('user_id', 'is', null);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ error: 'Aucun profil seed trouvé' }, { status: 404 });
  }

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
    total: profiles.length,
    ok,
    errors,
    message: `${ok} mots de passe réinitialisés, ${errors} erreurs`,
    details: results,
  });
}
