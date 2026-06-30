import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { LandingPage } from '@/components/landing/LandingPage';

export default async function HomePage() {
  const { user } = await withAuth();

  // Non connecté → Landing Page publique
  if (!user) return <LandingPage />;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('workos_user_id', user.id)
    .maybeSingle();

  // Utilisateur existant avec profil complet → espace correspondant
  if (profile?.onboarding_completed) {
    if (profile.role === 'talent_free' || profile.role === 'talent_premium') {
      redirect('/passport');
    }
    if (profile.role === 'org_admin' || profile.role === 'org_hr' ||
        profile.role === 'org_manager' || profile.role === 'org_recruiter' ||
        profile.role === 'org_employee') {
      redirect('/dashboard');
    }
    if (profile.role === 'founder') {
      redirect('/boussole');
    }
    redirect('/dashboard');
  }

  // Nouvel utilisateur (pas de profil ou onboarding non complété)
  // → lire le cookie de choix de profil pour router vers le bon onboarding
  const jar         = await cookies();
  const profileType = jar.get('ta_profile_type')?.value ?? 'talent';

  if (profileType === 'fondateur') redirect('/demarrer');
  if (profileType === 'entreprise') redirect('/dashboard');

  // Talent par défaut
  redirect('/onboarding');
}
