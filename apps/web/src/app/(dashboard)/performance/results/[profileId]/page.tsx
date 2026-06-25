import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ScoreCircle, AIInsightCard, AlertCard } from '@/components/shared';
import { DIMENSIONS, type EvalDimension } from '@/lib/performance/evaluation';

const DIM_ORDER: EvalDimension[] = ['results', 'collaboration', 'growth', 'alignment', 'energy'];

// Données mock — résultats agrégés (manager + pair + self)
const MOCK_RESULTS: Record<string, {
  name: string; role: string;
  byRole: Record<string, Record<EvalDimension, number>>;
  aiSummary: string;
  alerts: string[];
}> = {
  p4: {
    name: 'Cheikh Mbaye', role: 'Chef de Projet',
    byRole: {
      manager: { results: 52, collaboration: 58, growth: 55, alignment: 60, energy: 38 },
      peer:    { results: 58, collaboration: 65, growth: 60, alignment: 64, energy: 52 },
      self:    { results: 62, collaboration: 68, growth: 63, alignment: 70, energy: 55 },
    },
    aiSummary: 'Score de corrélation critique à 58/100. L\'écart entre auto-évaluation (+6 pts) et évaluation manager révèle un manque d\'alignement de perception. La dimension Énergie/Posture à 45 est le signal le plus préoccupant — corrélé historiquement à un départ dans les 6 mois si non traité.',
    alerts: [
      'Entretien individuel urgent recommandé avant le 15/07/2026',
      'Vérifier la charge de travail et les conditions d\'exercice du rôle',
      'Proposer un plan de développement personnalisé avec le coach assigné',
    ],
  },
};

interface PageProps {
  params:       Promise<{ profileId: string }>;
  searchParams: Promise<{ q?: string; y?: string }>;
}

export default async function ResultsPage({ params, searchParams }: PageProps) {
  await withAuth({ ensureSignedIn: true });
  const { profileId } = await params;
  const { q, y } = await searchParams;

  const quarter = Number(q) || 2;
  const year    = Number(y) || 2026;

  // Fallback sur Cheikh Mbaye (profil à risque) pour la démo
  const data = MOCK_RESULTS[profileId] ?? MOCK_RESULTS['p4'];
  if (!data) return null;

  const roles = Object.keys(data.byRole) as string[];

  // Calcul score agrégé par dimension
  const aggregate = {} as Record<EvalDimension, number>;
  for (const dim of DIM_ORDER) {
    const vals = roles.map((r) => data.byRole[r]?.[dim] ?? 0);
    aggregate[dim] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  // Score global pondéré
  const global = Math.round(
    DIM_ORDER.reduce((sum, dim) => sum + (aggregate[dim] ?? 0) * (DIMENSIONS[dim]?.weight ?? 0.2), 0)
  );
  const departureRisk = Math.min(100, Math.round(Math.max(0, 100 - global) * 0.7));

  const corrColor = global >= 80 ? '#10B981' : global >= 65 ? '#F59E0B' : '#F43F5E';
  const riskColor = departureRisk > 40 ? '#F43F5E' : departureRisk > 25 ? '#F59E0B' : '#10B981';

  return (
    <div className="animate-fade-in space-y-6">
      {/* En-tête */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: `${corrColor}18`, color: corrColor, border: `1.5px solid ${corrColor}40` }}
          >
            {data.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl">{data.name}</h1>
            <p className="text-slate-400 text-sm">{data.role} · Q{quarter} {year}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-xs text-slate-500">
                Risque départ :
                <span className="font-bold ml-1" style={{ color: riskColor }}>
                  {departureRisk}%
                </span>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">{roles.length} évaluateurs</span>
            </div>
          </div>
          <ScoreCircle value={global} size="lg" label="Corrélation" />
        </div>
      </div>

      {/* Alertes */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <AlertCard key={i} severity="warning" title="Action recommandée" description={a} />
          ))}
        </div>
      )}

      {/* Scores par dimension + comparaison des évaluateurs */}
      <div>
        <p className="section-tag text-emerald mb-3">SCORES PAR DIMENSION</p>
        <div className="card space-y-4">
          {DIM_ORDER.map((dim) => {
            const meta = DIMENSIONS[dim];
            const aggScore = aggregate[dim] ?? 0;

            return (
              <div key={dim}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm font-medium">{meta?.label}</span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: aggScore >= 80 ? '#10B981' : aggScore >= 65 ? '#F59E0B' : '#F43F5E' }}
                  >
                    {aggScore}/100
                  </span>
                </div>

                {/* Barre globale */}
                <div className="h-2 bg-bg-surface rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${aggScore}%`, backgroundColor: meta?.color ?? '#64748B' }}
                  />
                </div>

                {/* Mini-barres par évaluateur */}
                <div className="flex gap-3">
                  {roles.map((role) => {
                    const val = data.byRole[role]?.[dim] ?? 0;
                    const roleLabel = role === 'manager' ? 'Mgr' : role === 'peer' ? 'Pair' : 'Self';
                    return (
                      <div key={role} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 w-7">{roleLabel}</span>
                        <div className="w-16 h-1 bg-bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${val}%`, backgroundColor: meta?.color ?? '#64748B', opacity: 0.6 }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthèse IA */}
      <div>
        <p className="section-tag text-violet mb-3">ANALYSE TERANGA ALIGN IA</p>
        <AIInsightCard content={data.aiSummary} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/performance" className="btn-secondary text-sm">
          ← Retour Performance
        </Link>
        <Link href={`/performance/evaluation/${profileId}?role=manager`} className="btn-primary text-sm">
          Réévaluer →
        </Link>
      </div>
    </div>
  );
}
