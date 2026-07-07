import { requireAuth } from '@/lib/supabase/user';
import { SectionHeader } from '@/components/shared';
import { VisionQuestionnaire } from '@/components/boussole/VisionQuestionnaire';

export default async function VisionPage() {
  await requireAuth();

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <SectionHeader
        tag="BOUSSOLE STRATÉGIQUE"
        tagColor="text-violet"
        title="Évaluation de vision"
        subtitle="25 questions pour identifier l'ADN stratégique de votre organisation. Durée estimée : 8 minutes."
      />
      <VisionQuestionnaire />
    </div>
  );
}
