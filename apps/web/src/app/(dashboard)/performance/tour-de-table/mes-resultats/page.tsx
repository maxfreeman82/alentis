import { requireAuth } from '@/lib/supabase/user';
import { getUserOrg } from '@/lib/supabase/auth';
import { TDT_DIMENSIONS } from '@/lib/tour-de-table/dimensions';
import { computePerceptionDeltas } from '@/lib/tour-de-table/consolidation';
import type { PassportSoftScores } from '@/lib/tour-de-table/consolidation';
import { ArrowUp, ArrowDown, Minus, AlertTriangle, Eye } from 'lucide-react';

export default async function MesResultatsPage() {
  const user = await requireAuth();

  const ctx = await getUserOrg(user.id);
  if (!ctx) return <p className="text-slate-500 p-8">Organisation introuvable.</p>;
  const { supabase, organizationId } = ctx;

  const { data: myProfile } = await supabase
    .from('profiles').select('id, first_name').eq('user_id', user.id).maybeSingle();
  if (!myProfile) return null;

  // Récupérer les agrégats (toutes sessions confondues, triées par date)
  const { data: aggregates } = await supabase
    .from('tdt_aggregates')
    .select('*')
    .eq('observed_id', myProfile.id)
    .eq('organization_id', organizationId)
    .order('computed_at', { ascending: false });

  // Passport actuel
  const { data: passport } = await supabase
    .from('talent_passports')
    .select('soft_communication, soft_leadership, soft_adaptability, soft_problem_solving, soft_critical_thinking, soft_collaboration, soft_stress_mgmt, soft_organization, soft_learning_speed, soft_emotional_intel, score_hard, score_energy')
    .eq('profile_id', myProfile.id)
    .maybeSingle();

  const latest = aggregates?.[0];

  if (!latest) {
    return (
      <div className="text-center py-16 space-y-3">
        <Eye className="w-8 h-8 text-slate-700 mx-auto" />
        <p className="text-slate-900 font-display text-xl">Pas encore de résultats</p>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Vos résultats de Tour de Table apparaîtront ici une fois qu'une session sera clôturée
          et que vous aurez été observé par au moins {3} collègues.
        </p>
      </div>
    );
  }

  const deltas = passport
    ? computePerceptionDeltas(passport as PassportSoftScores, {
        observed_id:         myProfile.id,
        score_fiabilite:     latest.score_fiabilite ?? 50,
        score_collaboration: latest.score_collaboration ?? 50,
        score_communication: latest.score_communication ?? 50,
        score_initiative:    latest.score_initiative ?? 50,
        score_adaptabilite:  latest.score_adaptabilite ?? 50,
        score_impact:        latest.score_impact ?? 50,
        score_bien_etre:     latest.score_bien_etre ?? 50,
        score_global_observed: latest.score_global_observed ?? 50,
        observer_count:      latest.observer_count ?? 0,
      })
    : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-1">MES OBSERVATIONS PAIRS</p>
        <h1 className="font-display text-slate-900 text-2xl">Comment mes collègues me perçoivent</h1>
        <p className="text-slate-400 text-sm mt-1">
          Ces résultats sont anonymes — agrégés à partir de {latest.observer_count} observateurs minimum.
          Vous ne pouvez pas identifier qui a dit quoi.
        </p>
      </div>

      {/* Score global */}
      <div className="card text-center space-y-2 py-6">
        <p className="text-slate-500 text-xs uppercase tracking-widest">Score comportemental observé</p>
        <p className={`font-display text-6xl font-bold ${
          (latest.score_global_observed ?? 0) >= 80 ? 'text-emerald-400'
          : (latest.score_global_observed ?? 0) >= 60 ? 'text-amber-400'
          : 'text-rose-400'
        }`}>
          {Math.round(latest.score_global_observed ?? 0)}
        </p>
        <p className="text-slate-500 text-xs">
          {latest.observer_count} observateurs · {latest.has_participation_flag && '⚠ participation insuffisante · '}
          {latest.delta_vs_previous != null && (
            <span className={latest.delta_vs_previous >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {latest.delta_vs_previous >= 0 ? '+' : ''}{Math.round(latest.delta_vs_previous)} vs T précédent
            </span>
          )}
        </p>
      </div>

      {/* Flags sécurité */}
      {(latest.has_outlier_flag || latest.has_big_drop_flag) && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            {latest.has_outlier_flag && (
              <p className="text-amber-300 text-xs">Des observations extrêmes ont été détectées et exclues du calcul (garde outlier).</p>
            )}
            {latest.has_big_drop_flag && (
              <p className="text-amber-300 text-xs">Votre score a chuté de plus de 25 pts par rapport au trimestre précédent — votre RH est notifiée.</p>
            )}
          </div>
        </div>
      )}

      {/* Scores par dimension */}
      <div className="space-y-3">
        <h2 className="font-display text-slate-900 text-sm">Par dimension comportementale</h2>
        <div className="space-y-2">
          {TDT_DIMENSIONS.map(dim => {
            const score = latest[`score_${dim.id}` as keyof typeof latest] as number ?? 0;
            return (
              <div key={dim.id} className="card p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: dim.color }}>{dim.label}</span>
                  <span className={`font-mono text-sm font-bold ${
                    score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{Math.round(score)}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: dim.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Perception gaps */}
      {deltas.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-slate-900 text-sm">Écarts de perception (vous vs pairs)</h2>
          <p className="text-slate-500 text-xs">+ = vos pairs vous voient MIEUX que vous vous voyez. − = vos pairs vous voient différemment.</p>
          <div className="space-y-2">
            {deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map(d => (
              <div key={d.dimension} className="card flex items-start gap-3 p-3">
                <div className="flex-shrink-0 mt-0.5">
                  {d.delta > 5
                    ? <ArrowUp className="w-4 h-4 text-emerald-400" />
                    : d.delta < -5
                    ? <ArrowDown className="w-4 h-4 text-rose-400" />
                    : <Minus className="w-4 h-4 text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-900 text-xs font-semibold">{d.dimension}</span>
                    <span className={`font-mono text-xs font-bold flex-shrink-0 ${
                      d.delta > 5 ? 'text-emerald-400' : d.delta < -5 ? 'text-rose-400' : 'text-slate-500'
                    }`}>
                      {d.delta >= 0 ? '+' : ''}{Math.round(d.delta)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{d.interpretation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique */}
      {aggregates && aggregates.length > 1 && (
        <div className="space-y-3">
          <h2 className="font-display text-slate-900 text-sm">Évolution trimestrielle</h2>
          <div className="card overflow-hidden p-0">
            <div className="grid grid-cols-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5 bg-bg border-b border-slate-200">
              <span>Session</span>
              <span className="text-center">Observateurs</span>
              <span className="text-center">Score</span>
              <span className="text-center">Delta</span>
            </div>
            {aggregates.map(a => (
              <div key={a.id} className="grid grid-cols-4 px-4 py-2.5 border-b border-slate-200 last:border-0 hover:bg-slate-50">
                <span className="text-slate-400 text-xs">Q{a.session_id?.slice(-2)} {new Date(a.computed_at ?? '').getFullYear()}</span>
                <span className="font-mono text-xs text-center text-slate-400">{a.observer_count}</span>
                <span className={`font-mono text-xs text-center font-bold ${
                  (a.score_global_observed ?? 0) >= 80 ? 'text-emerald-400'
                  : (a.score_global_observed ?? 0) >= 60 ? 'text-amber-400'
                  : 'text-rose-400'
                }`}>
                  {Math.round(a.score_global_observed ?? 0)}
                </span>
                <span className={`font-mono text-xs text-center ${
                  (a.delta_vs_previous ?? 0) > 0 ? 'text-emerald-400'
                  : (a.delta_vs_previous ?? 0) < 0 ? 'text-rose-400'
                  : 'text-slate-500'
                }`}>
                  {a.delta_vs_previous != null
                    ? `${(a.delta_vs_previous ?? 0) >= 0 ? '+' : ''}${Math.round(a.delta_vs_previous ?? 0)}`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
