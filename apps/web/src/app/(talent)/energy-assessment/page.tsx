import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import EnergyAssessmentClient from './EnergyAssessmentClient';

export default async function EnergyAssessmentPage() {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);

  // Même garde que les autres pages (talent) : pas de profil talent → onboarding
  // d'abord (cf. CLAUDE.md : "Sans connexion, aucun dashboard ne doit être accessible").
  if (!ctx) redirect('/onboarding');

  return <EnergyAssessmentClient />;
}
