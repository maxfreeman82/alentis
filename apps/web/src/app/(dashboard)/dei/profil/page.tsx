import { requireAuth } from '@/lib/supabase/user';
import { SectionHeader } from '@/components/shared';
import DeiProfileForm from '@/components/dei/DeiProfileForm';

export default async function DeiProfilPage() {
  await requireAuth();
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <SectionHeader
        tag="DEI — DONNÉES VOLONTAIRES"
        title="Mon profil diversité"
        subtitle="Ces informations sont anonymisées et utilisées uniquement pour les statistiques collectives. Vous pouvez refuser de répondre à tout moment."
      />
      <DeiProfileForm />
    </div>
  );
}
