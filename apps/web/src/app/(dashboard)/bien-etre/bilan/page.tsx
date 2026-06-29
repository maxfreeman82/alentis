import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader } from '@/components/shared';
import WellbeingSurvey from '@/components/bien-etre/WellbeingSurvey';

export default async function BilanPage() {
  await withAuth({ ensureSignedIn: true });
  const now = new Date();
  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        tag={`BIEN-ÊTRE · ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}`}
        title="Mon bilan mensuel"
        subtitle="5 dimensions · 20 questions · Confidentiel · 5 minutes"
      />
      <WellbeingSurvey />
    </div>
  );
}
