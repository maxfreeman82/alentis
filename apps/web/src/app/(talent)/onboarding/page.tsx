import { withAuth } from '@workos-inc/authkit-nextjs';
import { getTalentProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import { TalentOnboardingWizard } from './TalentOnboardingWizard';

export default async function TalentOnboardingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getTalentProfile(user.id);

  // Onboarding déjà complété → espace talent
  if (ctx?.onboardingDone) redirect('/talent/passport');

  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-emerald rounded-lg flex items-center justify-center">
            <span className="font-display text-white font-bold text-sm">TA</span>
          </div>
          <span className="font-display text-white font-semibold">Teranga Align</span>
        </div>

        <TalentOnboardingWizard
          workosEmail={user.email}
          workosFirstName={user.firstName ?? ''}
          workosLastName={user.lastName ?? ''}
        />
      </div>
    </div>
  );
}
