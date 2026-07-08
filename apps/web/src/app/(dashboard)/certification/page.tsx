import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import { Award, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { SectionHeader, ScoreCircle, CertBadge } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import type { CertLevel } from '@teranga/types';

const LEVELS: {
  level: CertLevel;
  label:   string;
  color:   string;
  minIas:  number;
  criteria: { label: string; key: string; threshold: number; unit?: string }[];
}[] = [
  {
    level: 1, label: 'Niveau 1 — Teranga Starter', color: '#64748B', minIas: 0,
    criteria: [
      { label: 'IAS Global ≥ 30',                  key: 'ias',           threshold: 30 },
      { label: 'Évaluation vision complétée',       key: 'hasAssessment', threshold: 1 },
      { label: 'Au moins 1 Talent Passport actif',  key: 'passports',     threshold: 1 },
    ],
  },
  {
    level: 2, label: 'Niveau 2 — Teranga Bronze', color: '#F97316', minIas: 40,
    criteria: [
      { label: 'IAS Global ≥ 40',                  key: 'ias',           threshold: 40 },
      { label: '50% des collaborateurs avec Passport', key: 'passportPct', threshold: 50, unit: '%' },
      { label: 'Vision Pulse lancé (≥ 1 sondage)', key: 'hasPulse',      threshold: 1 },
      { label: 'OKR définis pour l\'année',         key: 'hasOkr',        threshold: 1 },
    ],
  },
  {
    level: 3, label: 'Niveau 3 — Teranga Argent', color: '#94A3B8', minIas: 60,
    criteria: [
      { label: 'IAS Global ≥ 60',                  key: 'ias',           threshold: 60 },
      { label: 'Adhésion Vision Pulse ≥ 65',        key: 'pulse',         threshold: 65 },
      { label: 'Score corrélation Performance ≥ 70',key: 'correlation',   threshold: 70 },
      { label: 'Taux completion formation ≥ 60%',   key: 'formation',     threshold: 60, unit: '%' },
      { label: 'Score bien-être ≥ 60',              key: 'wellbeing',     threshold: 60 },
    ],
  },
  {
    level: 4, label: 'Niveau 4 — Teranga Or', color: '#F59E0B', minIas: 80,
    criteria: [
      { label: 'IAS Global ≥ 80',                  key: 'ias',           threshold: 80 },
      { label: 'Adhésion Vision Pulse ≥ 80',        key: 'pulse',         threshold: 80 },
      { label: 'Score corrélation Performance ≥ 82',key: 'correlation',   threshold: 82 },
      { label: 'Taux completion formation ≥ 80%',   key: 'formation',     threshold: 80, unit: '%' },
      { label: 'Score bien-être ≥ 75',              key: 'wellbeing',     threshold: 75 },
      { label: 'Zéro risque burnout > 65%',         key: 'noBurnout',     threshold: 1 },
    ],
  },
];

export default async function CertificationPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) redirect('/onboarding');

  const { supabase, organizationId, orgIasScore, orgCertLevel, orgName } = ctx;
  const year = new Date().getFullYear();

  const [assessmentRes, passportsRes, profilesRes, pulsesRes, evalsRes, enrollsRes, wellbeingRes, burnoutRes] = await Promise.all([
    supabase.from('vision_assessments').select('id').eq('organization_id', organizationId).limit(1),
    supabase.from('talent_passports').select('id').eq('organization_id', organizationId),
    supabase.from('profiles').select('id').eq('organization_id', organizationId),
    supabase.from('vision_pulses').select('adhesion_score').eq('organization_id', organizationId).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('quarterly_evaluations').select('correlation_score').eq('organization_id', organizationId).eq('year', year),
    supabase.from('training_enrollments').select('status').eq('organization_id', organizationId),
    supabase.from('wellbeing_surveys').select('score_global').eq('organization_id', organizationId).eq('year', year),
    supabase.from('wellbeing_surveys').select('id').eq('organization_id', organizationId).eq('year', year).gt('burnout_risk', 65),
  ]);

  const totalProfiles   = profilesRes.data?.length ?? 0;
  const totalPassports  = passportsRes.data?.length ?? 0;
  const hasPulse        = pulsesRes.data != null;
  const latestAdhesion  = pulsesRes.data?.adhesion_score ?? 0;
  const hasAssessment   = (assessmentRes.data?.length ?? 0) > 0;
  const hasOkr          = false; // simplifié — on vérifie via org
  const evls            = evalsRes.data ?? [];
  const avgCorr         = evls.length > 0 ? Math.round(evls.reduce((s, e) => s + (e.correlation_score ?? 0), 0) / evls.length) : 0;
  const enrolls         = enrollsRes.data ?? [];
  const formCompletion  = enrolls.length > 0 ? Math.round(enrolls.filter(e => e.status === 'completed').length / enrolls.length * 100) : 0;
  const wbs             = wellbeingRes.data ?? [];
  const avgWellbeing    = wbs.length > 0 ? Math.round(wbs.reduce((s, w) => s + (w.score_global ?? 0), 0) / wbs.length) : 0;
  const noBurnout       = (burnoutRes.data?.length ?? 0) === 0 ? 1 : 0;
  const passportPct     = totalProfiles > 0 ? Math.round((totalPassports / totalProfiles) * 100) : 0;

  const metrics: Record<string, number> = {
    ias:          orgIasScore,
    hasAssessment: hasAssessment ? 1 : 0,
    passports:    totalPassports,
    passportPct,
    hasPulse:     hasPulse ? 1 : 0,
    hasOkr:       hasOkr ? 1 : 0,
    pulse:        latestAdhesion,
    correlation:  avgCorr,
    formation:    formCompletion,
    wellbeing:    avgWellbeing,
    noBurnout,
  };

  return (
    <div className="animate-fade-in space-y-8">
      <SectionHeader
        tag="CERTIFICATION TERANGA ALIGN"
        title="Votre certification"
        subtitle={`${orgName} · Progression vers l'excellence RH africaine`}
        action={<CertBadge level={orgCertLevel as CertLevel} />}
      />

      {/* Score IAS + niveau actuel */}
      <div className="card flex items-center gap-6 py-6" style={{ borderLeft: `4px solid ${LEVELS[(orgCertLevel as number) - 1]?.color ?? '#64748B'}` }}>
        <ScoreCircle value={orgIasScore} size="lg" />
        <div className="flex-1">
          <p className="section-tag text-slate-500 mb-1">NIVEAU ACTUEL</p>
          <p className="font-display text-2xl text-slate-900">{LEVELS[(orgCertLevel as number) - 1]?.label}</p>
          <p className="text-slate-400 text-sm mt-1">IAS : {orgIasScore}/100</p>
        </div>
        {orgCertLevel < 4 && (
          <div className="text-right">
            <p className="text-slate-500 text-xs mb-1">Prochain niveau</p>
            <p className="font-display text-slate-900">{LEVELS[orgCertLevel]?.label}</p>
            <p className="text-slate-500 text-xs">IAS requis : {LEVELS[orgCertLevel]?.minIas}</p>
          </div>
        )}
      </div>

      {/* Grille niveaux */}
      <div className="space-y-4">
        {LEVELS.map(lvl => {
          const isUnlocked = orgCertLevel >= lvl.level;
          const isCurrent  = orgCertLevel === lvl.level;
          const isNext     = orgCertLevel === lvl.level - 1;

          const criteriaResults = lvl.criteria.map(c => ({
            ...c,
            current: metrics[c.key] ?? 0,
            met:     (metrics[c.key] ?? 0) >= c.threshold,
          }));
          const metCount = criteriaResults.filter(c => c.met).length;
          const progress = Math.round((metCount / lvl.criteria.length) * 100);

          return (
            <div key={lvl.level}
              className={`card space-y-4 border transition-all ${isCurrent ? 'border-slate-200' : isUnlocked ? 'border-emerald-500/20 bg-emerald-500/3' : 'border-transparent opacity-70'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${lvl.color}20`, border: `2px solid ${lvl.color}40` }}>
                    <Award className="w-5 h-5" style={{ color: lvl.color }} />
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-sm">{lvl.label}</p>
                    <p className="text-slate-500 text-xs">IAS minimum requis : {lvl.minIas}</p>
                  </div>
                </div>
                <div className="text-right">
                  {isUnlocked ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                      ✓ Certifié
                    </span>
                  ) : isNext ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                      Prochain niveau
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">{metCount}/{lvl.criteria.length} critères</span>
                  )}
                </div>
              </div>

              {/* Barre progression */}
              {!isUnlocked && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progression</span>
                    <span>{metCount}/{lvl.criteria.length} critères atteints</span>
                  </div>
                  <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: lvl.color }} />
                  </div>
                </div>
              )}

              {/* Critères */}
              <div className="space-y-2">
                {criteriaResults.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {c.met ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                    <span className={c.met ? 'text-slate-600' : 'text-slate-500'}>{c.label}</span>
                    {!c.met && c.key !== 'hasAssessment' && c.key !== 'hasPulse' && c.key !== 'hasOkr' && c.key !== 'noBurnout' && (
                      <span className="ml-auto font-mono text-xs text-slate-600">
                        {c.current}{c.unit ?? ''} / {c.threshold}{c.unit ?? ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA niveau suivant */}
              {isNext && orgCertLevel < 4 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-400 text-xs mb-2">
                    {lvl.criteria.length - metCount} critère{lvl.criteria.length - metCount > 1 ? 's' : ''} restant{lvl.criteria.length - metCount > 1 ? 's' : ''} pour progresser
                  </p>
                  <div className="flex gap-2">
                    {criteriaResults.filter(c => !c.met).slice(0, 2).map((c, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> {c.label.split(' ')[0]} {c.label.split(' ')[1]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
