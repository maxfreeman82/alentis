import { requireAuth } from '@/lib/supabase/user';
import { SectionHeader } from '@/components/shared';
import { EvaluationForm } from '@/components/performance/EvaluationForm';
import type { EvaluatorRole } from '@/lib/performance/evaluation';

// Données mock — en prod : récupéré depuis Supabase via profileId
const MOCK_PROFILES: Record<string, { name: string; role: string }> = {
  p1: { name: 'Fatou Ndiaye',   role: 'Lead Product Manager' },
  p2: { name: 'Ibrahima Fall',  role: 'Directeur Commercial' },
  p3: { name: 'Aminata Diallo', role: 'Ingénieure Data' },
  p4: { name: 'Cheikh Mbaye',   role: 'Chef de Projet' },
  p5: { name: 'Oumar Ba',       role: 'Business Analyst' },
  p6: { name: 'Rokhaya Sow',    role: 'RH Business Partner' },
};

interface PageProps {
  params:      Promise<{ profileId: string }>;
  searchParams: Promise<{ role?: string }>;
}

export default async function EvaluationPage({ params, searchParams }: PageProps) {
  const user = await requireAuth();
  const { profileId } = await params;
  const { role } = await searchParams;

  const target = MOCK_PROFILES[profileId] ?? { name: 'Collaborateur', role: 'Rôle inconnu' };
  const evaluatorRole: EvaluatorRole =
    role === 'self' ? 'self' :
    role === 'peer' ? 'peer' :
    'manager';

  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="PERFORMANCE · ÉVALUATION 360°"
        tagColor="text-sky"
        title={evaluatorRole === 'self' ? 'Auto-évaluation' : `Évaluation — ${target.name}`}
        subtitle={`${target.role} · Q${quarter} ${now.getFullYear()} · ${
          evaluatorRole === 'manager' ? 'Vue Manager' :
          evaluatorRole === 'peer'    ? 'Vue Pair' :
          'Auto-évaluation'
        }`}
      />

      <EvaluationForm
        organizationId="mock-org-id"
        profileId={profileId}
        evaluatorId={user?.id ?? 'mock-evaluator-id'}
        evaluatorRole={evaluatorRole}
        targetName={target.name}
        quarter={quarter}
        year={now.getFullYear()}
      />
    </div>
  );
}
