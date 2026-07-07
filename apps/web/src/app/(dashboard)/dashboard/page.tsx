import { requireAuth } from '@/lib/supabase/user';
import { TrendingUp, Users, Target, Zap, ArrowUpRight, AlertTriangle, Brain, Battery } from 'lucide-react';
import { ScoreCircle, AIInsightCard, AlertCard, SectionHeader, CertBadge } from '@/components/shared';
import { computeIAS, iasLabel } from '@teranga/scoring';
import { getUserOrg } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CertLevel } from '@teranga/types';

export default async function DashboardPage() {
  const user = await requireAuth();

  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Profil en cours de configuration…</p>
      </div>
    );
  }

  const { supabase, organizationId, orgName, orgCertLevel, orgArchetype } = ctx;

  // Requêtes parallèles
  const [okrsRes, pulseRes, passportsRes, evalsRes, wellbeingRes] = await Promise.all([
    supabase.from('okr_company')
      .select('title, progress, on_track')
      .eq('organization_id', organizationId)
      .eq('year', new Date().getFullYear())
      .order('progress', { ascending: false })
      .limit(5),

    supabase.from('vision_pulses')
      .select('adhesion_score, participation, total_employees, quarter, year')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('talent_passports')
      .select('score_global, score_energy, growth_potential, score_risk, dominant_family')
      .eq('organization_id', organizationId),

    supabase.from('quarterly_evaluations')
      .select('profile_id, departure_risk')
      .eq('organization_id', organizationId)
      .gte('departure_risk', 60)
      .order('departure_risk', { ascending: false })
      .limit(3),

    supabase.from('wellbeing_surveys')
      .select('score_global, burnout_risk')
      .eq('organization_id', organizationId)
      .eq('year', new Date().getFullYear())
      .order('month', { ascending: false })
      .limit(20),
  ]);

  const okrs           = okrsRes.data ?? [];
  const pulse          = pulseRes.data;
  const passports      = passportsRes.data ?? [];
  const highRiskEvals  = evalsRes.data ?? [];
  const wellbeing      = wellbeingRes.data ?? [];

  // Composantes IAS
  const n = passports.length;

  const avgCapability = n > 0
    ? Math.round(passports.reduce((s, p) => s + (p.score_global ?? 0), 0) / n)
    : 0;

  const avgEnergy = n > 0
    ? Math.round(passports.reduce((s, p) => s + (p.score_energy ?? 0), 0) / n)
    : 0;

  const avgGrowth = n > 0
    ? Math.round(passports.reduce((s, p) => s + (p.growth_potential ?? 0), 0) / n)
    : 0;

  const adhesion    = Math.round(pulse?.adhesion_score ?? 0);
  const okrVelocity = okrs.length > 0
    ? Math.round((okrs.filter(o => o.on_track).length / okrs.length) * 100)
    : 0;

  // Calcul IAS live
  const iasComputed = computeIAS({
    capabilityFit: avgCapability,
    energyFit:     avgEnergy,
    adhesion,
    velocity:      okrVelocity,
    trajectories:  avgGrowth,
  });

  // Persiste le score IAS recalculé si données disponibles
  if (n > 0) {
    const admin = createAdminClient();
    await admin.from('organizations').update({ ias_score: iasComputed.score }).eq('id', organizationId);
  }

  // Métriques bien-être
  const avgWellbeing = wellbeing.length > 0
    ? Math.round(wellbeing.reduce((s, w) => s + (w.score_global ?? 0), 0) / wellbeing.length)
    : 0;
  const burnoutCount = wellbeing.filter(w => (w.burnout_risk ?? 0) >= 70).length;

  // Alertes dynamiques
  const alerts: { id: string; title: string; severity: 'critical' | 'warning'; desc: string }[] = [];

  if (highRiskEvals.length > 0) {
    alerts.push({
      id:       'risk-depart',
      title:    `${highRiskEvals.length} collaborateur${highRiskEvals.length > 1 ? 's' : ''} à risque de départ élevé`,
      severity: 'critical',
      desc:     'Score départ ≥ 60 — Action recommandée : entretien de rétention',
    });
  }

  const lowParticipation = pulse?.total_employees
    ? Math.round(((pulse.participation ?? 0) / pulse.total_employees) * 100) < 60
    : false;

  if (lowParticipation && pulse) {
    alerts.push({
      id:       'pulse-participation',
      title:    `Vision Pulse Q${pulse.quarter} : participation insuffisante`,
      severity: 'warning',
      desc:     `${pulse.participation ?? 0} / ${pulse.total_employees ?? 0} répondants — Objectif : 70%`,
    });
  }

  if (okrVelocity < 50 && okrs.length > 0) {
    alerts.push({
      id:       'okr-velocity',
      title:    `Vélocité OKR critique : ${okrVelocity}% d'OKR on track`,
      severity: 'critical',
      desc:     'Plus de la moitié des objectifs annuels hors trajectoire',
    });
  }

  if (burnoutCount > 0) {
    alerts.push({
      id:       'burnout-risk',
      title:    `${burnoutCount} collaborateur${burnoutCount > 1 ? 's' : ''} en risque de burnout`,
      severity: 'critical',
      desc:     'Score burnout ≥ 70 — Entretien bien-être urgent recommandé',
    });
  }

  if (iasComputed.score < 60 && n > 0) {
    alerts.push({
      id:       'ias-critical',
      title:    `IAS critique : ${iasComputed.score}/100 — Désalignement stratégique`,
      severity: 'critical',
      desc:     'Le capital humain est insuffisamment aligné sur la vision. Plan d\'action requis.',
    });
  }

  const iasColorMap = { emerald: '#10B981', amber: '#F59E0B', rose: '#F43F5E' } as const;
  const iasColor = iasColorMap[iasComputed.color];

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="VUE D'ENSEMBLE"
        title={`Bonjour, ${(user.user_metadata?.first_name ?? '') ?? ctx.firstName ?? 'Dirigeant'}`}
        subtitle={`${orgName} · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={<CertBadge level={orgCertLevel as CertLevel} />}
      />

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IAS Global */}
        <div className="card col-span-1 flex items-center gap-4">
          <ScoreCircle value={iasComputed.score} size="lg" />
          <div>
            <p className="section-tag text-slate-500 mb-1">IAS Global</p>
            <p className="font-display text-slate-900 text-lg">{iasComputed.label}</p>
            <p className="text-slate-400 text-xs mt-1">Index d&apos;Alignement Stratégique</p>
          </div>
        </div>

        {/* OKR Velocity */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Target size={16} className="text-orange" />
            <span className="section-tag text-slate-500">OKR VELOCITY</span>
          </div>
          <p className="font-display text-3xl text-orange">{okrVelocity}%</p>
          <p className="text-slate-400 text-xs mt-1">{okrs.filter(o => o.on_track).length}/{okrs.length} OKR on track</p>
          <div className="mt-3 h-1 bg-bg rounded-full">
            <div className="h-full bg-orange rounded-full" style={{ width: `${okrVelocity}%` }} />
          </div>
        </div>

        {/* Talent Score */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Zap size={16} className="text-violet" />
            <span className="section-tag text-slate-500">TALENT SCORE</span>
          </div>
          <p className="font-display text-3xl text-violet">{avgCapability > 0 ? avgCapability : '—'}</p>
          <p className="text-slate-400 text-xs mt-1">Score 6D moyen · {n} passports</p>
          {avgCapability > 0 && (
            <div className="mt-3 h-1 bg-bg rounded-full">
              <div className="h-full bg-violet rounded-full" style={{ width: `${avgCapability}%` }} />
            </div>
          )}
        </div>

        {/* Vision Pulse */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Users size={16} className="text-sky" />
            <span className="section-tag text-slate-500">VISION PULSE</span>
          </div>
          <p className="font-display text-3xl text-sky">{adhesion > 0 ? adhesion : '—'}</p>
          <p className="text-slate-400 text-xs mt-1">
            {pulse ? `Adhésion Q${pulse.quarter} ${pulse.year}` : 'Aucun sondage effectué'}
          </p>
          {adhesion > 0 && (
            <div className="mt-3 h-1 bg-bg rounded-full">
              <div className="h-full bg-sky rounded-full" style={{ width: `${adhesion}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Décomposition IAS */}
      {n > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color: iasColor }} />
              <h2 className="text-slate-900 font-semibold text-sm">Décomposition IAS</h2>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${iasColor}15`, color: iasColor }}
            >
              {iasComputed.score}/100 · {iasComputed.label}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {([
              { key: 'C', label: 'Capacités',   value: avgCapability, weight: 30, color: '#8B5CF6' },
              { key: 'E', label: 'Énergie',      value: avgEnergy,     weight: 25, color: '#F59E0B' },
              { key: 'P', label: 'Adhésion',     value: adhesion,      weight: 20, color: '#0EA5E9' },
              { key: 'V', label: 'Vélocité OKR', value: okrVelocity,   weight: 15, color: '#F97316' },
              { key: 'T', label: 'Trajectoires', value: avgGrowth,     weight: 10, color: '#10B981' },
            ] as const).map(dim => (
              <div key={dim.key} className="text-center p-3 rounded-xl bg-bg space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: dim.color }}>{dim.key}</p>
                <p className="font-display text-2xl font-bold text-slate-900">{dim.value > 0 ? dim.value : '—'}</p>
                <p className="text-slate-500 text-[11px]">{dim.label}</p>
                <div className="h-1 bg-bg-card rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${dim.value}%`, backgroundColor: dim.color }} />
                </div>
                <p className="text-slate-600 text-[10px]">Poids {dim.weight}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alertes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-rose" />
            <h2 className="text-slate-900 font-semibold text-sm">Alertes critiques</h2>
            <span className="font-mono text-xs bg-rose/10 text-rose px-2 py-0.5 rounded-full border border-rose/20">
              {alerts.length}
            </span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune alerte — tout est sous contrôle.</p>
          ) : (
            alerts.map(a => (
              <AlertCard key={a.id} title={a.title} description={a.desc} severity={a.severity} />
            ))
          )}

          {/* Bien-être mini */}
          {avgWellbeing > 0 && (
            <div className="card flex items-center gap-4 mt-2">
              <Battery size={18} className="text-emerald flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-600 text-sm">Bien-être moyen</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{avgWellbeing}/100</span>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald" style={{ width: `${avgWellbeing}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OKR Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald" />
              <h2 className="text-slate-900 font-semibold text-sm">OKR {new Date().getFullYear()}</h2>
            </div>
            <ArrowUpRight size={14} className="text-slate-500" />
          </div>
          {okrs.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun OKR défini pour cette année.</p>
          ) : (
            <div className="space-y-4">
              {okrs.map((okr, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-slate-600 text-xs truncate pr-2">{okr.title}</p>
                    <span className={`font-mono text-xs font-bold ${okr.on_track ? 'text-emerald' : 'text-rose'}`}>
                      {okr.progress}%
                    </span>
                  </div>
                  <div className="h-1 bg-bg rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${okr.progress}%`, backgroundColor: okr.on_track ? '#10B981' : '#F43F5E' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analyse IA */}
      <AIInsightCard
        content={`${orgName} affiche un IAS de ${iasComputed.score}/100 (${iasComputed.label}). Composantes : Capacités ${avgCapability}/100, Énergie ${avgEnergy}/100, Adhésion Vision ${adhesion}/100, Vélocité OKR ${okrVelocity}%, Trajectoires ${avgGrowth}/100. ${n} Talent Passports actifs.${highRiskEvals.length > 0 ? ` ⚠ ${highRiskEvals.length} collaborateur(s) à risque de départ — action urgente recommandée.` : ''}${burnoutCount > 0 ? ` ⚠ ${burnoutCount} cas de burnout détectés.` : ''} Archétype organisationnel : ${orgArchetype ?? 'Non défini'}.`}
      />
    </div>
  );
}
