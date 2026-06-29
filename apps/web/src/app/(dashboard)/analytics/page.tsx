import { withAuth } from '@workos-inc/authkit-nextjs';
import { BarChart3, TrendingUp, Users, Target, Heart, BookOpen, DollarSign } from 'lucide-react';
import { SectionHeader, ScoreCircle } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import { iasLabel } from '@teranga/scoring';
import { computePayroll, type FamilySituation } from '@/lib/remuneration/payroll';

export default async function AnalyticsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, orgIasScore, orgName } = ctx;
  const now  = new Date();
  const year = now.getFullYear();

  const [passportsRes, evalsRes, pulsesRes, okrsRes, wellbeingRes, enrollRes, payslipsRes] = await Promise.all([
    supabase.from('talent_passports').select('score_global, score_risk, dominant_family').eq('organization_id', organizationId),
    supabase.from('quarterly_evaluations').select('correlation_score, departure_risk, quarter, year').eq('organization_id', organizationId).eq('year', year),
    supabase.from('vision_pulses').select('adhesion_score, quarter, year').eq('organization_id', organizationId).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(6),
    supabase.from('okr_company').select('progress, on_track').eq('organization_id', organizationId).eq('year', year),
    supabase.from('wellbeing_surveys').select('score_global, burnout_risk, month').eq('organization_id', organizationId).eq('year', year),
    supabase.from('training_enrollments').select('status').eq('organization_id', organizationId),
    supabase.from('payroll_settings').select('salaire_brut, situation, enfants, sector_risk, primes_mensuelles, avantages_nature, retenue_prevoyance').eq('organization_id', organizationId),
  ]);

  const passports      = passportsRes.data  ?? [];
  const evals          = evalsRes.data      ?? [];
  const pulses         = pulsesRes.data     ?? [];
  const okrs           = okrsRes.data       ?? [];
  const wellbeing      = wellbeingRes.data  ?? [];
  const enrolls        = enrollRes.data     ?? [];
  const payrollSettings = payslipsRes.data  ?? [];

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
          <p className="font-display text-3xl text-white">{ias.label}</p>
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
              <p className="font-display text-2xl text-white font-bold">{m.value}</p>
              <p className="text-slate-500 text-xs mt-1">{m.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution énergie */}
        <div className="card space-y-4">
          <h3 className="font-display text-white text-sm flex items-center gap-2">
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
                      <span className="text-white capitalize">{family}</span>
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
          <h3 className="font-display text-white text-sm flex items-center gap-2">
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
                  <span className="font-mono text-xs text-white w-8 text-right">{p.adhesion_score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risque départ par trimestre */}
        <div className="card space-y-4">
          <h3 className="font-display text-white text-sm flex items-center gap-2">
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
          <h3 className="font-display text-white text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Masse salariale {year}
          </h3>
          {payrollSettings.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune configuration salariale.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Net total mensuel</span>
                <span className="font-mono font-bold text-white">
                  {masseSalariale.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Profils configurés</span>
                <span className="font-mono text-white">{payrollSettings.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Salaire net moyen</span>
                <span className="font-mono text-white">
                  {Math.round(masseSalariale / payrollSettings.length).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
