import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import { SectionHeader, EmptyState } from '@/components/shared';
import { OKRBoard } from '@/components/boussole/OKRBoard';
import { Target } from 'lucide-react';
import { getUserOrg } from '@/lib/supabase/auth';

export default async function ObjectifsPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    redirect('/setup-org');
  }

  const { supabase, organizationId } = ctx;

  const { data } = await supabase
    .from('okr_company')
    .select('id, title, progress, on_track, year, key_results')
    .eq('organization_id', organizationId)
    .eq('year', new Date().getFullYear())
    .order('progress', { ascending: false });

  const okrs = (data ?? []).map(o => ({
    id:          o.id,
    title:       o.title,
    progress:    o.progress,
    on_track:    o.on_track,
    year:        o.year,
    key_results: (o.key_results as { title: string; progress: number; target: number }[] | null) ?? [],
  }));

  return (
    <div className="animate-fade-in">
      <SectionHeader
        tag="BOUSSOLE STRATÉGIQUE"
        tagColor="text-violet"
        title={`Objectifs & OKR ${new Date().getFullYear()}`}
        subtitle="Cascade des objectifs alignés sur votre archétype stratégique"
        action={
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Target size={14} />
            Ajouter un OKR
          </button>
        }
      />

      {okrs.length === 0 ? (
        <EmptyState
          icon={<Target size={20} />}
          title="Aucun OKR défini"
          description="Commencez par définir vos objectifs stratégiques en cohérence avec votre archétype."
          action={<button className="btn-primary text-sm">Créer mon premier OKR</button>}
        />
      ) : (
        <OKRBoard okrs={okrs} />
      )}
    </div>
  );
}
