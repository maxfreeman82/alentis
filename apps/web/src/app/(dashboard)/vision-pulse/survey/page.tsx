import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader } from '@/components/shared';
import PulseSurvey from '@/components/boussole/PulseSurvey';
import { getUserOrg } from '@/lib/supabase/auth';

export default async function PulseSurveyPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Profil en cours de configuration…</p>
      </div>
    );
  }

  const now     = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
  const year    = now.getFullYear();

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        tag={`VISION PULSE · Q${quarter} ${year}`}
        title="Comment vivez-vous la vision ?"
        subtitle="5 dimensions · 20 questions · Anonyme · 5 minutes"
      />
      <PulseSurvey
        organizationId={ctx.organizationId}
        quarter={quarter}
        year={year}
      />
    </div>
  );
}
