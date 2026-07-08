import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import { BarChart3, TrendingUp, Users, Target, Heart, BookOpen, DollarSign, Briefcase } from 'lucide-react';
import { SectionHeader, ScoreCircle } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { iasLabel } from '@teranga/scoring';
import { computePayroll, type FamilySituation } from '@/lib/remuneration/payroll';
import { IASynthesisPanel } from '@/components/analytics/IASynthesisPanel';

export default async function AnalyticsPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) redirect('/setup-org');

  const { supabase, organizationId, orgIasScore, orgName } = ctx;
  const now  = new Date();
  const year = now.getFullYear();

  const [passportsRes, evalsRes, pulsesRes, okrsRes, wellbeingRes, enrollRes, payslipsRes, appsRes] = await Promise.all([
    supabase.from('talent_passports').select('score_global, score_hard, score_soft, score_exp, score_life, score_energy, score_risk, dominant_family').eq('organization_id', organizationId),
    supabase.from('quarterly_evaluations').select('correlation_score, departure_risk, quarter, year').eq('organization_id', organizationId).eq('year', year),
    supabase.from('vision_pulses').select('adhesion_score, quarter, year').eq('organization_id', organizationId).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(6),
    supabase.from('okr_company').select('progress, on_track').eq('organization_id', organizationId).eq('year', year),
    supabase.from('wellbeing_surveys').select('score_global, burnout_risk, month').eq('organization_id', organizationId).eq('year', year),
    supabase.from('training_enrollments').select('status').eq('organization_id', organizationId),
    supabase.from('payroll_settings').select('salaire_brut, situation, enfants, sector_risk, primes_mensuelles, avantages_nature, retenue_prevoyance').eq('organization_id', organizationId),
    supabase.from('applications').select('stage, score_6d, created_at').eq('organization_id', organizationId),
  ]);

  const passports       = passportsRes.data  ?? [];
  const evals           = evalsRes.data      ?? [];
  const pulses          = pulsesRes.data     ?? [];
  const okrs            = okrsRes.data       ?? [];
  const wellbeing       = wellbeingRes.data  ?? [];
  const enrolls         = enrollRes.data     ?? [];
  const payrollSettings = payslipsRes.data   ?? [];
  const apps            = appsRes.data       ?? [];

  // ─── Métriques dérivées ─────────────────────────────────────────────────────
  const avgTalent  = passports.length > 0 ? Math.round(passports.reduce((s, p) => s + (p.score_global ?? 0), 0) / passports.length) : 0;
  const highRisk   = passports.filter(p => (p.score_risk ?? 0) > 40).length;
  const avgCorr    = evals.length > 0 ? Math.round(evals.reduce((s, e) => s + (e.correlation_score ?? 0), 0) / evals.length) : 0;
  const latestPulse = pulses[0]?.adhesion_score ?? 0;
  const okrVelocity = okrs.length > 0 ? Math.round(okrs.filter(o => o.on_track).length / okrs.length * 100) : 0;
  const avgWellbeing = wellbeing.length > 0 ? Math.round(wellbeing.reduce((s, w) => s + (w.score_global ?? 0), 0) / wellbeing.length) : 0;
  const formCompletion = enrolls.length > 0 ? Math.round(enrolls.filter(e => e.status === 'completed').length / enrolls.length * 100) : 0;
  const masseSalariale = payrollSettings.reduce((sum, s) => {
    const r = computePayroll({
      salaireBrut:     s.salaire_brut,
      situation:       s.situation as FamilySituation,
      enfants:         s.enfants,
      sectorRisk:      s.sector_risk as 'low' | 'medium' | 'high',
      primes:          s.primes_mensuelles,
      avantagesNature: s.avantages_nature,
      retenuePrevoy:   s.retenue_prevoyance,
    });
    return sum + r.salaireNet;
  }, 0);
  const ias = iasLabel(orgIasScore);

  // Distribution énergie
  const energyDist = passports.reduce<Record<string, number>>((acc, p) => {
    const f = p.dominant_family ?? 'non défini';
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});

  // Risque départ par quartier
  const riskByQ = evals.reduce<Record<number, number[]>>((acc, e) => {
    const q = e.quarter;
    if (!acc[q]) acc[q] = [];
    if (e.departure_risk != null) acc[q].push(e.departure_risk);
    return acc;
  }, {});

  // ─── Funnel recrutement ────────────────────────────────────────────────────
  const FUNNEL_STAGES = ['new', 'screening', 'interview', 'assessment', 'offer', 'hired'] as const;
  const STAGE_LABELS_FR: Record<string, string> = {
    new: 'Nouvelles', screening: 'Screening', interview: 'Entretiens',
    assessment: 'Assessment', offer: 'Offres', hired: 'Recrutés',
  };
  const STAGE_COLORS: Record<string, string> = {
    new: '#64748B', screening: '#0EA5E9', interview: '#8B5CF6',
    assessment: '#F59E0B', offer: '#F97316', hired: '#10B981',
  };
  const funnelCounts = FUNNEL_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = apps.filter(a => a.stage === s).length;
    return acc;
  }, {});
  const funnelMax = Math.max(1, ...Object.values(funnelCounts));
  const conversionRate = apps.length > 0 ? Math.round((funnelCounts.hired ?? 0) / apps.length * 100) : 0;
  const avgAppScore = apps.filter(a => a.score_6d != null).length > 0
    ? Math.round(apps.reduce((s, a) => s + (a.score_6d ?? 0), 0) / apps.filter(a => a.score_6d != null).length)
    : 0;

  // ─── Distribution 6D équipe ────────────────────────────────────────────────
  const DIMS_6D = [
    { key: 'score_hard',   label: 'Hard Skills', dim: 'H', color: '#8B5CF6' },
    { key: 'score_soft',   label: 'Soft Skills', dim: 'S', color: '#0EA5E9' },
    { key: 'score_exp',    label: 'Expérience',  dim: 'X', color: '#10B981' },
    { key: 'score_life',   label: 'Life Score',  dim: 'L', color: '#F59E0B' },
    { key: 'score_energy', label: 'Énergie',     dim: 'E', color: '#F97316' },
    { key: 'score_risk',   label: 'Stress',      dim: 'R', color: '#F43F5E' },
  ] as const;
  const team6D = DIMS_6D.map(d => ({
    ...d,
    avg: passports.length > 0
      ? Math.round(passports.reduce((s, p) => s + ((p[d.key as keyof typeof p] as number | null) ?? 0), 0) / passports.length)
      : 0,
  }));

  const METRICS = [
    { label: 'IAS Global',          value: orgIasScore,       sub: ias.label,                      icon: BarChart3,   color: '#10B981' },
    { label: 'Score Talent moyen',  value: avgTalent,         sub: `${passports.length} passports`, icon: Users,       color: '#8B5CF6' },
    { label: 'Score Corrélation',   value: avgCorr,           sub: `Q${year} moyen`,                icon: TrendingUp,  color: '#0EA5E9' },
    { label: 'OKR Velocity',        value: `${okrVelocity}%`, sub: `${okrs.filter(o=>o.on_track).length}/${okrs.length} on track`, icon: Target, color: '#F97316' },
    { label: 'Adhésion Vision',     value: latestPulse,       sub: `Dernier pulse`,                 icon: BarChart3,   color: '#F59E0B' },
    { label: 'Bien-être moyen',     value: avgWellbeing,      sub: `${wellbeing.length} répondants`, icon: Heart,      color: '#F43F5E' },
    { label: 'Complétion formation',value: `${formCompletion}%`, sub: `${enrolls.length} inscriptions`, icon: BookOpen, color: '#22D3EE' },
    { label: 'Risques départ',      value: highRisk,          sub: 'profils score_risk > 40',       icon: Users,       color: '#F43F5E' },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <SectionHeader
        tag="ANALYTICS"
        title="Tableau de bord analytique"
        subtitle={`${orgName} · Données ${year} en temps réel`}
      />

      {/* IAS hero */}
      <div className="card flex items-center gap-6 py-6" style={{ borderLeft: '4px solid #10B981' }}>
        <ScoreCircle value={orgIasScore} size="lg" />
        <div>
          <p className="section-tag text-emerald-400 mb-1">INDEX D'ALIGNEMENT STRATÉGIQUE</p>
          <p className="font-display text-3xl text-slate-900">{ias.label}</p>
          <p className="text-slate-400 text-sm mt-1">Score composite de tous les modules Teranga Align</p>
        </div>
      </div>

      {/* Grille métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: m.color }} />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{m.label}</span>
              </div>
              <p className="font-display text-2xl text-slate-900 font-bold">{m.value}</p>
              <p className="text-slate-500 text-xs mt-1">{m.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution énergie */}
        <div className="card space-y-4">
          <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" /> Distribution énergétique
          </h3>
          {Object.keys(energyDist).length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun Talent Passport renseigné.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(energyDist).sort(([, a], [, b]) => b - a).map(([family, count]) => {
                const pct = passports.length > 0 ? Math.round((count / passports.length) * 100) : 0;
                const color = { accomplisseurs: '#10B981', pilotes: '#F97316', initialiseurs: '#8B5CF6', dynamiseurs: '#0EA5E9', regulateurs: '#F59E0B' }[family] ?? '#64748B';
                return (
                  <div key={family} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-900 capitalize">{family}</span>
                      <span className="font-mono text-slate-400">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pulse history sparkline */}
        <div className="card space-y-4">
          <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" /> Évolution adhésion Vision Pulse
          </h3>
          {pulses.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun sondage Vision Pulse effectué.</p>
          ) : (
            <div className="space-y-3">
              {[...pulses].reverse().map(p => (
                <div key={`${p.quarter}-${p.year}`} className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-14">Q{p.quarter} {p.year}</span>
                  <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${p.adhesion_score ?? 0}%`, backgroundColor: (p.adhesion_score ?? 0) >= 70 ? '#10B981' : (p.adhesion_score ?? 0) >= 55 ? '#F59E0B' : '#F43F5E' }} />
                  </div>
                  <span className="font-mono text-xs text-slate-900 w-8 text-right">{p.adhesion_score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risque départ par trimestre */}
        <div className="card space-y-4">
          <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-400" /> Risque départ moyen par trimestre
          </h3>
          {Object.keys(riskByQ).length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune évaluation enregistrée.</p>
          ) : (
            <div className="space-y-3">
              {[1, 2, 3, 4].filter(q => riskByQ[q]).map(q => {
                const vals = riskByQ[q] ?? [];
                const avg  = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                const color = avg > 50 ? '#F43F5E' : avg > 30 ? '#F59E0B' : '#10B981';
                return (
                  <div key={q} className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs w-8">Q{q}</span>
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${avg}%`, backgroundColor: color }} />
                    </div>
                    <span className="font-mono text-xs font-bold w-10 text-right" style={{ color }}>{avg}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Masse salariale */}
        <div className="card space-y-4">
          <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Masse salariale {year}
          </h3>
          {payrollSettings.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune configuration salariale.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Net total mensuel</span>
                <span className="font-mono font-bold text-slate-900">
                  {masseSalariale.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Profils configurés</span>
                <span className="font-mono text-slate-900">{payrollSettings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Salaire net moyen</span>
                <span className="font-mono text-slate-900">
                  {Math.round(masseSalariale / payrollSettings.length).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Funnel recrutement */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-sky-400" /> Funnel recrutement {year}
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{apps.length} candidature{apps.length !== 1 ? 's' : ''}</span>
            {apps.length > 0 && (
              <>
                <span className="text-emerald-400 font-mono font-bold">{conversionRate}% conversion</span>
                {avgAppScore > 0 && <span className="text-violet-400 font-mono">Score 6D moy. {avgAppScore}</span>}
              </>
            )}
          </div>
        </div>
        {apps.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune candidature enregistrée.</p>
        ) : (
          <div className="space-y-2.5">
            {FUNNEL_STAGES.map(stage => {
              const count = funnelCounts[stage] ?? 0;
              const pct   = Math.round((count / funnelMax) * 100);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-24 flex-shrink-0">{STAGE_LABELS_FR[stage]}</span>
                  <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] }} />
                  </div>
                  <span className="font-mono text-xs w-8 text-right" style={{ color: STAGE_COLORS[stage] }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Distribution 6D équipe */}
      <div className="card space-y-4">
        <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" /> Distribution 6D équipe
        </h3>
        {passports.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun Talent Passport calculé.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {team6D.map(d => (
              <div key={d.dim} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold" style={{ color: d.color }}>{d.dim} · {d.label}</span>
                  <span className="font-mono text-slate-900">{d.avg}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.avg}%`, backgroundColor: d.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Synthèse IA */}
      <IASynthesisPanel />
    </div>
  );
}
