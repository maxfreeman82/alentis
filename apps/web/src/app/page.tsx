import { createUserClient } from '@/lib/supabase/user';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { LandingPage } from '@/components/landing/LandingPage';

export default async function HomePage() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile) {
    const r = profile.role;
    // Profil existant avec onboarding terminé → espace correspondant
    if (profile.onboarding_completed) {
      if (r === 'talent_free' || r === 'talent_premium') redirect('/passport');
      if (r === 'founder')   redirect('/demarrer');
      redirect('/dashboard');
    }
    // Onboarding en cours → reprendre selon le rôle
    if (r === 'founder')   redirect('/demarrer');
    if (r === 'org_admin' || r === 'org_hr') redirect('/dashboard');
    redirect('/onboarding');
  }

  // Nouveau utilisateur — profil créé par /auth/callback, cookie de secours
  const jar         = await cookies();
  const profileType = jar.get('ta_profile_type')?.value ?? 'talent';

  if (profileType === 'fondateur') redirect('/demarrer');
  if (profileType === 'entreprise') redirect('/dashboard');
  redirect('/onboarding');
}
