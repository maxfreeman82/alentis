import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function HomePage() {
  const { user } = await withAuth();

  if (!user) redirect('/sign-in');

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('workos_user_id', user.id)
    .maybeSingle();

  // Nouveau talent sans profil → onboarding
  if (!profile || !profile.onboarding_completed) redirect('/talent/onboarding');

  // Talent externe → espace talent
  if (profile.role === 'talent_free' || profile.role === 'talent_premium') {
    redirect('/talent/passport');
  }

  // Tous les rôles organisation → dashboard
  redirect('/dashboard');
}
