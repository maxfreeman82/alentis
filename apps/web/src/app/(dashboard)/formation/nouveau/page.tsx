import { requireAuth } from '@/lib/supabase/user';
import { SectionHeader } from '@/components/shared';
import TrainingForm from '@/components/formation/TrainingForm';

export default async function NouvelleFormationPage() {
  await requireAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="FORMATION & DÉVELOPPEMENT"
        title="Nouvelle formation"
        subtitle="Ajoutez une formation au catalogue de votre organisation"
      />
      <TrainingForm />
    </div>
  );
}
