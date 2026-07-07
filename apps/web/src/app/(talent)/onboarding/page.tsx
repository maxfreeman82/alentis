import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import { TalentOnboardingWizard } from './TalentOnboardingWizard';

export default async function TalentOnboardingPage() {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);

  // Onboarding déjà complété → espace talent
  if (ctx?.onboardingDone) redirect('/passport');

  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-emerald rounded-lg flex items-center justify-center">
            <span className="font-display text-slate-900 font-bold text-sm">TA</span>
          </div>
          <span className="font-display text-slate-900 font-semibold">Teranga Align</span>
        </div>

        <TalentOnboardingWizard
          email={user.email ?? ''}
          firstName={user.user_metadata?.first_name ?? ''}
          lastName={user.user_metadata?.last_name ?? ''}
        />
      </div>
    </div>
  );
}
