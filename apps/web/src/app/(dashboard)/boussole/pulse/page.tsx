import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { PulseSurvey } from '@/components/pulse/PulseSurvey';
import { DIMENSIONS } from '@/lib/vision-pulse/survey';
import { Users, TrendingUp } from 'lucide-react';

const ADHESION_COLORS: Record<string, string> = {
  Ambassadeur: '#10B981', Engagé: '#0EA5E9', Neutre: '#F59E0B', Désengagé: '#F97316', 'En rupture': '#F43F5E',
};

export default async function PulsePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, organizationId, profileId } = ctx;

  const now     = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year    = now.getFullYear();

  // Vérifier si l'utilisateur a déjà répondu ce trimestre
  const { data: myResponse } = await supabase
    .from('vision_pulse_responses')
    .select('adhesion_score, dim_knowledge, dim_credibility, dim_connection, dim_capability, dim_projection')
    .eq('profile_id', profileId)
    .eq('quarter', quarter)
    .eq('year', year)
    .maybeSingle();

  // Agrégat organisation du trimestre courant
  const { data: orgPulse } = await supabase
    .from('vision_pulses')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('quarter', quarter)
    .eq('year', year)
    .maybeSingle();

  // Historique trimestriel (4 derniers trimestres)
  const { data: history } = await supabase
    .from('vision_pulses')
    .select('quarter, year, adhesion_score, participation, total_employees')
    .eq('organization_id', organizationId)
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })
    .limit(4);

  const { data: latestAssessment } = await supabase
    .from('vision_assessments')
    .select('vision_statement')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const adhesionScore  = orgPulse?.adhesion_score ?? 0;
  const participation  = orgPulse?.participation ?? 0;
  const totalEmployees = orgPulse?.total_employees ?? 0;
  const adhesionLabel  =
    adhesionScore >= 85 ? 'Ambassadeur' :
    adhesionScore >= 70 ? 'Engagé'      :
    adhesionScore >= 55 ? 'Neutre'      :
    adhesionScore >= 40 ? 'Désengagé'  : 'En rupture';
  const adhesionColor = ADHESION_COLORS[adhesionLabel] ?? '#64748B';

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl">
      {/* En-tête */}
      <div>
        <p className="text-violet section-tag mb-1">VISION PULSE · T{quarter} {year}</p>
        <h1 className="font-display text-white text-2xl">Mesure d'adhésion à la vision</h1>
        <p className="text-slate-400 text-sm mt-1">
          20 questions · 5 dimensions · Résultat anonymisé · Score mis à jour en temps réel
        </p>
      </div>

      {/* Agrégat Organisation */}
      {orgPulse && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Score global */}
          <div className="card col-span-1 text-center py-6 flex flex-col items-center gap-2">
            <p className="section-tag text-slate-500">Score adhésion org.</p>
            <p className="font-display text-5xl font-bold" style={{ color: adhesionColor }}>
              {Math.round(adhesionScore)}
            </p>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${adhesionColor}15`, color: adhesionColor }}
            >
              {adhesionLabel}
            </span>
          </div>

          {/* Participation */}
          <div className="card flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-sky" />
              <p className="text-sky font-semibold text-sm">Participation</p>
            </div>
            <p className="font-display text-3xl text-white">
              {participation}<span className="text-slate-500 text-lg">/{totalEmployees}</span>
            </p>
            <div className="h-1.5 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${totalEmployees > 0 ? Math.round((participation / totalEmployees) * 100) : 0}%`, backgroundColor: '#0EA5E9' }}
              />
            </div>
            <p className="text-slate-500 text-xs">
              {totalEmployees > 0 ? Math.round((participation / totalEmployees) * 100) : 0}% de réponse
            </p>
          </div>

          {/* Tendance */}
          {history && history.length > 1 && (
            <div className="card flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-violet" />
                <p className="text-violet font-semibold text-sm">Tendance</p>
              </div>
              {history.slice(0, 3).map((h, i) => {
                const prev  = history[i + 1];
                const delta = prev ? Math.round((h.adhesion_score ?? 0) - (prev.adhesion_score ?? 0)) : null;
                return (
                  <div key={`${h.year}-${h.quarter}`} className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">T{h.quarter} {h.year}</span>
                    <span className="font-mono text-xs font-bold text-white">{Math.round(h.adhesion_score ?? 0)}</span>
                    {delta !== null && (
                      <span className={`font-mono text-[10px] ${delta >= 0 ? 'text-emerald' : 'text-rose-400'}`}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5 dimensions org */}
      {orgPulse && (
        <div className="space-y-3">
          <h2 className="font-display text-white text-sm">Scores par dimension — Organisation</h2>
          <div className="grid gap-2">
            {(Object.entries(DIMENSIONS) as [string, { label: string; color: string; icon: string; weight: number }][]).map(([key, dim]) => {
              const score = (orgPulse as Record<string, unknown>)[`avg_${key}`] as number ?? 0;
              const label = score >= 80 ? 'Fort' : score >= 60 ? 'Moyen' : 'Faible';
              return (
                <div key={key} className="card p-3 flex items-center gap-4">
                  <span className="text-lg w-6 flex-shrink-0">{dim.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-slate-300 text-sm">{dim.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: dim.color }}>{label}</span>
                        <span className="font-mono text-sm font-bold text-white">{Math.round(score)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: dim.color }} />
                    </div>
                  </div>
                  <span className="text-slate-600 text-[10px] w-8 text-right">{Math.round(dim.weight * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section réponse personnelle */}
      <div className="border-t border-white/5 pt-8">
        {myResponse ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald" />
              <p className="text-emerald text-sm font-semibold">Vous avez répondu ce trimestre</p>
            </div>
            <div className="card">
              <p className="section-tag text-slate-500 mb-3">MON SCORE PERSONNEL · T{quarter} {year}</p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="font-display text-4xl font-bold" style={{ color: adhesionColor }}>
                    {Math.round(myResponse.adhesion_score ?? 0)}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">Adhésion</p>
                </div>
                <div className="flex-1 grid gap-2">
                  {(Object.entries(DIMENSIONS) as [string, { label: string; color: string }][]).map(([key, dim]) => {
                    const s = (myResponse as Record<string, unknown>)[`dim_${key}`] as number ?? 0;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px] w-20 shrink-0">{dim.label}</span>
                        <div className="flex-1 h-1 bg-bg rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s}%`, backgroundColor: dim.color }} />
                        </div>
                        <span className="font-mono text-[11px] text-white w-6 text-right">{Math.round(s)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-slate-600 text-xs text-center">
              Le prochain Pulse ouvrira au T{quarter === 4 ? 1 : quarter + 1} {quarter === 4 ? year + 1 : year}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-white text-lg">Répondre au Pulse T{quarter} {year}</h2>
              <p className="text-slate-400 text-sm mt-1">
                Vos réponses sont anonymes et agrégées avec celles de vos collègues.
                Comptez ~5 minutes.
              </p>
            </div>
            <PulseSurvey
              visionStatement={latestAssessment?.vision_statement ?? null}
              quarter={quarter}
              year={year}
              organizationId={organizationId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
