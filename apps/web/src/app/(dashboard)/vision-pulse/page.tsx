import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Users, TrendingUp, AlertTriangle, QrCode } from 'lucide-react';
import { SectionHeader, ScoreCircle, AlertCard } from '@/components/shared';
import { DIMENSIONS } from '@/lib/vision-pulse/survey';
import type { PulseDimension } from '@/lib/vision-pulse/survey';
import { getUserOrg } from '@/lib/supabase/auth';

const DIM_ORDER: PulseDimension[] = ['knowledge', 'credibility', 'connection', 'capability', 'projection'];

const adhesionLabel = (s: number) =>
  s >= 85 ? 'Ambassadeur' : s >= 70 ? 'Engagé' : s >= 55 ? 'Neutre' : s >= 40 ? 'Désengagé' : 'En rupture';

export default async function VisionPulsePage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    redirect('/setup-org');
  }

  const { supabase, organizationId } = ctx;

  const now     = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;
  const year    = now.getFullYear();

  // Historique des pulses (tous, triés du plus récent)
  const { data: history } = await supabase
    .from('vision_pulses')
    .select('quarter, year, adhesion_score, participation, total_employees, avg_knowledge, avg_credibility, avg_connection, avg_capability, avg_projection')
    .eq('organization_id', organizationId)
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })
    .limit(8);

  const pulses  = history ?? [];
  const current = pulses[0] ?? null;
  const prev    = pulses[1] ?? null;

  const adhesion = current?.adhesion_score ?? 0;
  const taux     = current && current.total_employees
    ? Math.round(((current.participation ?? 0) / current.total_employees) * 100)
    : 0;

  const evolution = current && prev
    ? ((current.adhesion_score ?? 0) - (prev.adhesion_score ?? 0)).toFixed(1)
    : null;

  const dimScores: Record<PulseDimension, number> = {
    knowledge:   current?.avg_knowledge   ?? 0,
    credibility: current?.avg_credibility ?? 0,
    connection:  current?.avg_connection  ?? 0,
    capability:  current?.avg_capability  ?? 0,
    projection:  current?.avg_projection  ?? 0,
  };

  const riskAlerts = DIM_ORDER
    .filter(d => (dimScores[d] ?? 0) < 60 && (dimScores[d] ?? 0) > 0)
    .map(d => ({
      id: d,
      title: `Dimension faible : ${DIMENSIONS[d]?.label}`,
      description: `Score ${dimScores[d]}/100 — En dessous du seuil d'alerte (60)`,
      severity: (dimScores[d] ?? 0) < 50 ? 'critical' as const : 'warning' as const,
    }));

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        tag={current ? `VISION PULSE · Q${current.quarter} ${current.year}` : 'VISION PULSE'}
        title="Adhésion à la Vision"
        subtitle={current
          ? `${current.participation ?? 0} / ${current.total_employees ?? '—'} collaborateurs ont répondu (${taux}%)`
          : 'Aucun sondage lancé pour le moment'
        }
        action={
          <Link href="/vision-pulse/survey" className="btn-primary flex items-center gap-2 text-sm">
            <QrCode className="w-4 h-4" />
            Lancer le sondage
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <ScoreCircle value={adhesion} size="lg" />
          <div>
            <p className="section-tag text-slate-500 mb-1">Score Adhésion</p>
            <p className="font-display text-slate-900 text-lg">{adhesion > 0 ? adhesionLabel(adhesion) : '—'}</p>
            <p className="text-slate-400 text-xs mt-1">
              {current ? `Q${current.quarter} ${current.year}` : 'Aucune donnée'}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="section-tag text-slate-500 mb-1">Participation</p>
            <p className="font-display text-slate-900 text-2xl">{taux > 0 ? `${taux}%` : '—'}</p>
            <p className="text-slate-400 text-xs mt-1">{current?.participation ?? 0} répondants</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <p className="section-tag text-slate-500 mb-1">Évolution</p>
            <p className="font-display text-slate-900 text-2xl">
              {evolution !== null ? (parseFloat(evolution) >= 0 ? `+${evolution}` : evolution) : '—'}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {prev ? `vs Q${prev.quarter} ${prev.year}` : 'Première mesure'}
            </p>
          </div>
        </div>
      </div>

      {/* Radar dimensions */}
      {current && (
        <div className="card space-y-5">
          <h3 className="font-display text-slate-900">Détail par dimension</h3>
          <div className="space-y-4">
            {DIM_ORDER.map(d => {
              const score = dimScores[d] ?? 0;
              const cfg   = DIMENSIONS[d];
              return (
                <div key={d} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-900">
                      <span>{cfg?.icon}</span>
                      {cfg?.label}
                    </span>
                    <span className={score >= 70 ? 'text-emerald-400' : score >= 55 ? 'text-amber-400' : 'text-rose-400'}>
                      {score > 0 ? `${score}/100` : '—'}
                    </span>
                  </div>
                  <div className="h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score}%`, backgroundColor: cfg?.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alertes */}
      {riskAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-slate-900 text-sm">Signaux à surveiller</h3>
          </div>
          {riskAlerts.map(a => (
            <AlertCard key={a.id} title={a.title} description={a.description} severity={a.severity} />
          ))}
        </div>
      )}

      {/* Historique */}
      <div className="card space-y-4">
        <h3 className="font-display text-slate-900">Historique des Pulses</h3>
        {pulses.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun sondage enregistré. Lancez le premier pulse pour commencer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2 font-medium">Période</th>
                  <th className="text-right py-2 font-medium">Participation</th>
                  <th className="text-right py-2 font-medium">Score Adhésion</th>
                  <th className="text-right py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pulses.map(h => (
                  <tr key={`${h.quarter}-${h.year}`} className="text-slate-600">
                    <td className="py-3">Q{h.quarter} {h.year}</td>
                    <td className="py-3 text-right">{h.participation ?? '—'}</td>
                    <td className="py-3 text-right font-mono">{h.adhesion_score ?? '—'}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        (h.adhesion_score ?? 0) >= 70 ? 'bg-emerald-500/10 text-emerald-400'
                        : (h.adhesion_score ?? 0) >= 55 ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {adhesionLabel(h.adhesion_score ?? 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
