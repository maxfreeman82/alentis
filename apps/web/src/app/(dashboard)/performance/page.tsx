import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { SectionHeader, AIInsightCard, AlertCard } from '@/components/shared';
import { DIMENSIONS, type EvalDimension } from '@/lib/performance/evaluation';
import { getUserOrg } from '@/lib/supabase/auth';

const dimKeys: EvalDimension[] = ['results', 'collaboration', 'growth', 'alignment', 'energy'];

export default async function PerformancePage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    redirect('/onboarding');
  }

  const { supabase, organizationId } = ctx;

  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year    = now.getFullYear();

  // Évaluations du trimestre courant avec profil
  const { data: rows } = await supabase
    .from('quarterly_evaluations')
    .select(`
      id,
      profile_id,
      correlation_score,
      departure_risk,
      alerts,
      ai_analysis,
      profiles!quarterly_evaluations_profile_id_fkey (
        first_name,
        last_name,
        role
      )
    `)
    .eq('organization_id', organizationId)
    .eq('quarter', quarter)
    .eq('year', year)
    .order('correlation_score', { ascending: false });

  const evals = (rows ?? []).map(r => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const alerts  = (r.alerts as Record<string, unknown>[] | null) ?? [];
    return {
      id:          r.id,
      profileId:   r.profile_id,
      name:        profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Inconnu',
      role:        profile?.role ?? '',
      correlation: r.correlation_score ?? 0,
      risk:        r.departure_risk ?? 0,
      alertCount:  alerts.length,
    };
  });

  const avgCorr  = evals.length > 0 ? Math.round(evals.reduce((s, e) => s + e.correlation, 0) / evals.length) : 0;
  const highRisk = evals.filter(e => e.risk > 40);
  const totalAlerts = evals.reduce((s, e) => s + e.alertCount, 0);

  const STATS = [
    { label: 'Score corrélation moyen', value: avgCorr,              sub: `Q${quarter} ${year}`,               color: '#10B981' },
    { label: 'Évaluations ce trimestre', value: evals.length,        sub: 'collaborateurs évalués',            color: '#0EA5E9' },
    { label: 'Risque départ élevé',      value: highRisk.length,     sub: 'collaborateurs à surveiller',       color: '#F43F5E' },
    { label: 'Alertes actives',          value: totalAlerts,         sub: 'actions recommandées',              color: '#F59E0B' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          tag={`PERFORMANCE · Q${quarter} ${year}`}
          title="Évaluations 360°"
          subtitle="Suivi des scores de corrélation, évolution et risques départ"
        />
        <Link href="/performance/evaluation/new" className="btn-primary text-sm flex-shrink-0">
          + Nouvelle évaluation
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Alertes risques départ */}
      {highRisk.length > 0 && (
        <div className="space-y-2">
          {highRisk.map(e => (
            <AlertCard
              key={e.id}
              severity={e.risk > 65 ? 'critical' : 'warning'}
              title={`Risque départ élevé — ${e.name}`}
              description={`Score départ ${e.risk}% — Score corrélation ${e.correlation}/100. Entretien individuel recommandé.`}
            />
          ))}
        </div>
      )}

      {/* Table évaluations */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-slate-900 font-semibold text-sm">Scores de corrélation — Q{quarter} {year}</p>
          <p className="text-slate-500 text-xs">{evals.length} évaluation{evals.length > 1 ? 's' : ''}</p>
        </div>

        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-2 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>Collaborateur</span>
          {dimKeys.map(d => (
            <span key={d} className="text-center" style={{ color: DIMENSIONS[d].color }}>
              {DIMENSIONS[d].label.split('/')[0]}
            </span>
          ))}
          <span className="text-center">Score</span>
          <span className="text-center">Risque</span>
        </div>

        {evals.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500">Aucune évaluation pour Q{quarter} {year} — lancez la première évaluation.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {evals.map(e => {
              const corrColor = e.correlation >= 80 ? '#10B981' : e.correlation >= 65 ? '#F59E0B' : '#F43F5E';
              const riskColor = e.risk > 40 ? '#F43F5E' : e.risk > 25 ? '#F59E0B' : '#10B981';

              return (
                <Link
                  key={e.id}
                  href={`/performance/evaluation/${e.profileId}`}
                  className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-full md:w-auto">
                    <p className="text-slate-900 text-sm font-medium">{e.name}</p>
                    <p className="text-slate-500 text-xs">{e.role}</p>
                  </div>

                  {/* Colonnes dimension placeholder (valeurs calculées côté API) */}
                  {dimKeys.map(d => (
                    <div key={d} className="hidden md:flex flex-col items-center">
                      <span className="font-mono text-xs text-slate-600">—</span>
                    </div>
                  ))}

                  <span className="font-mono font-bold text-sm" style={{ color: corrColor }}>
                    {e.correlation}
                  </span>
                  <span className="font-mono text-xs font-bold" style={{ color: riskColor }}>
                    ↗{e.risk}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <AIInsightCard
        content={`Q${quarter} ${year} : ${evals.length} évaluation(s) enregistrée(s). Score de corrélation moyen : ${avgCorr}/100. ${highRisk.length > 0 ? `⚠ ${highRisk.length} profil(s) à risque de départ élevé — action urgente.` : 'Aucun risque critique détecté ce trimestre.'}`}
      />
    </div>
  );
}
