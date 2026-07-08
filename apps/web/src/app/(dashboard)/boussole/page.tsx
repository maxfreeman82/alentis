import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Compass, Target, Radio, ArrowRight, Zap, BarChart2, Wand2 } from 'lucide-react';
import { SectionHeader, ScoreCircle, CertBadge } from '@/components/shared';
import { ARCHETYPE_LABELS, ARCHETYPE_COLORS, iasLabel } from '@teranga/scoring';
import type { Archetype, CertLevel } from '@teranga/types';
import { getUserOrg } from '@/lib/supabase/auth';

const MODULES = [
  { href: '/boussole/vision',       icon: Compass,       label: 'Évaluation de vision',   desc: 'Identifier l\'ADN stratégique de votre organisation', color: '#8B5CF6', tag: 'BOUSSOLE' },
  { href: '/boussole/archetype',    icon: Zap,           label: 'Archétype stratégique',   desc: 'Comprendre votre profil et le mix énergétique idéal',  color: '#F97316', tag: 'ANALYSE'  },
  { href: '/boussole/objectifs',    icon: Target,        label: 'OKR & Objectifs',         desc: 'Cascade des objectifs alignés sur votre archétype',   color: '#10B981', tag: 'OKR'      },
  { href: '/vision-pulse',          icon: Radio,         label: 'Vision Pulse',            desc: 'Mesurer l\'adhésion de vos équipes à la vision',       color: '#0EA5E9', tag: 'PULSE'    },
  { href: '/boussole/correlation',  icon: BarChart2,  label: 'Corrélation Vision×Équipe', desc: 'Analyser les gaps énergie et les trajectoires',    color: '#10B981', tag: 'ANALYSE' },
  { href: '/boussole/simulateur',   icon: Wand2,      label: 'Simulateur war-gaming',     desc: 'Simuler l\'impact de vos décisions RH sur l\'IAS',  color: '#F43F5E', tag: 'SIM'     },
];

export default async function BousssolePage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    redirect('/setup-org');
  }

  const { supabase, organizationId, orgName, orgIasScore, orgCertLevel, orgArchetype } = ctx;

  // Dernière évaluation vision + dernier pulse
  const [assessmentRes, pulseRes, okrRes] = await Promise.all([
    supabase.from('vision_assessments').select('archetype, divergence_score, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vision_pulses').select('adhesion_score, quarter, year').eq('organization_id', organizationId).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('okr_company').select('progress, on_track').eq('organization_id', organizationId).eq('year', new Date().getFullYear()),
  ]);

  const latestAssessment = assessmentRes.data;
  const latestPulse      = pulseRes.data;
  const okrs             = okrRes.data ?? [];
  const okrVelocity      = okrs.length > 0 ? Math.round((okrs.filter(o => o.on_track).length / okrs.length) * 100) : null;

  const archetype     = (orgArchetype ?? latestAssessment?.archetype ?? 'INNOVATRICE') as Archetype;
  const archetypeColor = ARCHETYPE_COLORS[archetype];
  const archetypeLabel = ARCHETYPE_LABELS[archetype];
  const ias            = iasLabel(orgIasScore);

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        tag="BOUSSOLE STRATÉGIQUE"
        tagColor="text-violet"
        title={`Alignement de ${orgName}`}
        subtitle="Vision, archétype, OKR et adhésion des équipes"
        action={<CertBadge level={orgCertLevel as CertLevel} />}
      />

      {/* IAS + Archétype */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <ScoreCircle value={orgIasScore} size="lg" />
          <div>
            <p className="section-tag text-slate-500 mb-1">IAS Global</p>
            <p className="font-display text-slate-900 text-lg">{ias.label}</p>
            <p className="text-slate-400 text-xs mt-1">Index d&apos;Alignement Stratégique</p>
          </div>
        </div>

        <div className="card" style={{ borderLeft: `3px solid ${archetypeColor}` }}>
          <p className="section-tag text-slate-500 mb-2">ARCHÉTYPE</p>
          <p className="font-display text-xl text-slate-900" style={{ color: archetypeColor }}>{archetypeLabel}</p>
          {latestAssessment ? (
            <p className="text-slate-500 text-xs mt-1">
              Évalué le {new Date(latestAssessment.created_at).toLocaleDateString('fr-FR')}
            </p>
          ) : (
            <p className="text-slate-500 text-xs mt-1">Basé sur le profil organisation</p>
          )}
        </div>

        <div className="card space-y-2">
          <p className="section-tag text-slate-500">SIGNAUX CLÉS</p>
          <div className="space-y-1.5">
            {okrVelocity !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">OKR Velocity</span>
                <span className={`font-mono font-bold ${okrVelocity >= 70 ? 'text-emerald-400' : okrVelocity >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{okrVelocity}%</span>
              </div>
            )}
            {latestPulse && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Adhésion Q{latestPulse.quarter}</span>
                <span className={`font-mono font-bold ${(latestPulse.adhesion_score ?? 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{latestPulse.adhesion_score}/100</span>
              </div>
            )}
            {latestAssessment?.divergence_score != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Score divergence</span>
                <span className="font-mono font-bold text-violet-400">{latestAssessment.divergence_score}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map(m => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href}
              className="card hover:border-slate-200 border border-transparent group flex items-center gap-4 transition-all">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${m.color}15` }}>
                <Icon className="w-6 h-6" style={{ color: m.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="section-tag text-slate-500 mb-0.5">{m.tag}</p>
                <p className="text-slate-900 font-semibold text-sm">{m.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{m.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* OKR mini-board */}
      {okrs.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display text-slate-900 text-sm">OKR {new Date().getFullYear()}</h3>
            </div>
            <Link href="/boussole/objectifs" className="text-xs text-slate-500 hover:text-slate-600 transition-colors">
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {okrs.slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: o.on_track ? '#10B981' : '#F43F5E' }} />
                <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${o.progress}%`, backgroundColor: o.on_track ? '#10B981' : '#F43F5E' }} />
                </div>
                <span className="font-mono text-xs text-slate-400 w-8 text-right">{o.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
