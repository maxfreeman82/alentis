import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { SectionHeader, AIInsightCard, AlertCard } from '@/components/shared';
import { DIMENSIONS, type EvalDimension } from '@/lib/performance/evaluation';

// Données mock — évaluations T2 2026
const CURRENT_QUARTER = { q: 2, year: 2026 };

const MOCK_EVALUATIONS = [
  {
    id: 'eval-001', profileId: 'p1', name: 'Fatou Ndiaye',    role: 'Lead Product Manager',
    correlation: 89, risk: 8,  energyScore: 91,
    dimensions: { results: 92, collaboration: 88, growth: 85, alignment: 90, energy: 91 },
    status: 'completed', evaluatorCount: 3,
  },
  {
    id: 'eval-002', profileId: 'p2', name: 'Ibrahima Fall',   role: 'Directeur Commercial',
    correlation: 82, risk: 14, energyScore: 85,
    dimensions: { results: 85, collaboration: 80, growth: 78, alignment: 82, energy: 85 },
    status: 'completed', evaluatorCount: 3,
  },
  {
    id: 'eval-003', profileId: 'p3', name: 'Aminata Diallo',  role: 'Ingénieure Data',
    correlation: 71, risk: 28, energyScore: 68,
    dimensions: { results: 74, collaboration: 70, growth: 72, alignment: 68, energy: 68 },
    status: 'completed', evaluatorCount: 2,
  },
  {
    id: 'eval-004', profileId: 'p4', name: 'Cheikh Mbaye',    role: 'Chef de Projet',
    correlation: 58, risk: 52, energyScore: 45,
    dimensions: { results: 55, collaboration: 60, growth: 58, alignment: 62, energy: 45 },
    status: 'completed', evaluatorCount: 3,
  },
  {
    id: 'eval-005', profileId: 'p5', name: 'Oumar Ba',        role: 'Business Analyst',
    correlation: 62, risk: 44, energyScore: 55,
    dimensions: { results: 60, collaboration: 65, growth: 60, alignment: 68, energy: 55 },
    status: 'pending',   evaluatorCount: 1,
  },
  {
    id: 'eval-006', profileId: 'p6', name: 'Rokhaya Sow',     role: 'RH Business Partner',
    correlation: 78, risk: 22, energyScore: 80,
    dimensions: { results: 80, collaboration: 82, growth: 75, alignment: 75, energy: 80 },
    status: 'pending',   evaluatorCount: 0,
  },
];

const dimKeys: EvalDimension[] = ['results', 'collaboration', 'growth', 'alignment', 'energy'];

const ALERTS = [
  { title: 'Risque départ élevé — Cheikh Mbaye', description: 'Score corrélation 58/100, énergie à 45. Entretien individuel recommandé avant fin juillet.', severity: 'warning' as const },
  { title: '2 évaluations en attente', description: 'Rokhaya Sow et Oumar Ba n\'ont pas encore reçu d\'évaluation manager ce trimestre.', severity: 'warning' as const },
];

export default async function PerformancePage() {
  await withAuth({ ensureSignedIn: true });

  const completed = MOCK_EVALUATIONS.filter((e) => e.status === 'completed');
  const avgCorr   = Math.round(completed.reduce((s, e) => s + e.correlation, 0) / Math.max(1, completed.length));
  const highRisk  = MOCK_EVALUATIONS.filter((e) => e.risk > 40).length;

  const STATS = [
    { label: 'Score corrélation moyen', value: avgCorr,                         sub: `Q${CURRENT_QUARTER.q} ${CURRENT_QUARTER.year}`, color: '#10B981' },
    { label: 'Évaluations complètes',   value: `${completed.length}/${MOCK_EVALUATIONS.length}`, sub: 'ce trimestre', color: '#0EA5E9' },
    { label: 'Risque départ élevé',     value: highRisk,                        sub: 'collaborateurs à surveiller', color: '#F43F5E' },
    { label: 'Alertes actives',         value: ALERTS.length,                   sub: 'actions recommandées', color: '#F59E0B' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          tag={`PERFORMANCE · Q${CURRENT_QUARTER.q} ${CURRENT_QUARTER.year}`}
          title="Évaluations 360°"
          subtitle="Suivi des scores de corrélation, évolution et risques départ"
        />
        <Link href="/performance/evaluation/new" className="btn-primary text-sm flex-shrink-0">
          + Nouvelle évaluation
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {ALERTS.length > 0 && (
        <div className="space-y-2">
          {ALERTS.map((a, i) => (
            <AlertCard key={i} severity={a.severity} title={a.title} description={a.description} />
          ))}
        </div>
      )}

      {/* Table évaluations */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Scores de corrélation — Q{CURRENT_QUARTER.q} {CURRENT_QUARTER.year}</p>
          <p className="text-slate-500 text-xs">{MOCK_EVALUATIONS.length} collaborateurs</p>
        </div>

        {/* En-tête colonnes */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-2 border-b border-white/[0.04] text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>Collaborateur</span>
          {dimKeys.map((d) => (
            <span key={d} className="text-center" style={{ color: DIMENSIONS[d].color }}>
              {DIMENSIONS[d].label.split('/')[0]}
            </span>
          ))}
          <span className="text-center">Score</span>
          <span className="text-center">Risque</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {MOCK_EVALUATIONS.sort((a, b) => b.correlation - a.correlation).map((e) => {
            const corrColor = e.correlation >= 80 ? '#10B981' : e.correlation >= 65 ? '#F59E0B' : '#F43F5E';
            const riskColor = e.risk > 40 ? '#F43F5E' : e.risk > 25 ? '#F59E0B' : '#10B981';

            return (
              <Link
                key={e.id}
                href={`/performance/evaluation/${e.profileId}`}
                className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Nom */}
                <div className="w-full md:w-auto">
                  <p className="text-white text-sm font-medium">{e.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-500 text-xs">{e.role}</p>
                    {e.status === 'pending' && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber/10 text-amber">
                        EN ATTENTE
                      </span>
                    )}
                  </div>
                </div>

                {/* Scores par dimension */}
                {dimKeys.map((d) => {
                  const val = e.dimensions[d] ?? 0;
                  return (
                    <div key={d} className="hidden md:flex flex-col items-center gap-0.5">
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: val >= 80 ? '#10B981' : val >= 65 ? '#F59E0B' : '#F43F5E' }}
                      >
                        {val}
                      </span>
                      <div className="w-8 h-1 bg-bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${val}%`, backgroundColor: DIMENSIONS[d].color }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Score global */}
                <span className="font-mono font-bold text-sm" style={{ color: corrColor }}>
                  {e.correlation}
                </span>

                {/* Risque */}
                <span className="font-mono text-xs font-bold" style={{ color: riskColor }}>
                  ↗{e.risk}%
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Insight IA */}
      <AIInsightCard content="Q2 2026 : score de corrélation moyen en hausse de +4 pts vs Q1. Point de vigilance : 2 profils sous 65 (Cheikh Mbaye et Oumar Ba). L'énergie est le signal avancé le plus corrélé aux départs — surveiller tout profil sous 55 en énergie posture." />
    </div>
  );
}
