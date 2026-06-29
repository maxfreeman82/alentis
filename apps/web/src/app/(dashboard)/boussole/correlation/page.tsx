import { withAuth } from '@workos-inc/authkit-nextjs';
import { ArrowRight, TrendingUp, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { SectionHeader, ScoreCircle, AIInsightCard } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import {
  computeEnergyGap, computeEnergyFit,
  ARCHETYPE_ENERGY, ARCHETYPE_LABELS, ARCHETYPE_COLORS,
} from '@teranga/scoring';
import type { EnergyFamily } from '@teranga/scoring';
import type { Archetype } from '@teranga/types';

const FAMILY_COLORS: Record<EnergyFamily, string> = {
  Pilotes:        '#F97316',
  Initialiseurs:  '#8B5CF6',
  Accomplisseurs: '#10B981',
  Dynamiseurs:    '#0EA5E9',
  Regulateurs:    '#F59E0B',
};

const FAMILIES: EnergyFamily[] = ['Pilotes', 'Initialiseurs', 'Accomplisseurs', 'Dynamiseurs', 'Regulateurs'];

export default async function CorrelationPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, orgArchetype, orgName, orgIasScore } = ctx;
  const year = new Date().getFullYear();

  const [passportsRes, assessmentRes, pulseRes, okrsRes, evalsRes] = await Promise.all([
    supabase.from('talent_passports')
      .select('profile_id, score_global, energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs, dominant_family, score_risk')
      .eq('organization_id', organizationId),
    supabase.from('vision_assessments')
      .select('archetype, vision_statement, divergence_score, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('vision_pulses')
      .select('adhesion_score, quarter')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('okr_company')
      .select('on_track')
      .eq('organization_id', organizationId)
      .eq('year', year),
    supabase.from('quarterly_evaluations')
      .select('correlation_score, departure_risk')
      .eq('organization_id', organizationId)
      .eq('year', year),
  ]);

  const passports  = passportsRes.data ?? [];
  const archetype  = (assessmentRes.data?.archetype ?? orgArchetype ?? 'CONQUERANTE') as Archetype;
  const okrs       = okrsRes.data   ?? [];
  const evals      = evalsRes.data  ?? [];

  // ─── Distribution énergie réelle (moyenne sur tous les passports) ────────────
  const n = passports.length;
  const actual: Record<EnergyFamily, number> = {
    Pilotes:        n > 0 ? passports.reduce((s, p) => s + (p.energy_pilotes ?? 0), 0) / n : 0,
    Initialiseurs:  n > 0 ? passports.reduce((s, p) => s + (p.energy_initialiseurs ?? 0), 0) / n : 0,
    Accomplisseurs: n > 0 ? passports.reduce((s, p) => s + (p.energy_accomplisseurs ?? 0), 0) / n : 0,
    Dynamiseurs:    n > 0 ? passports.reduce((s, p) => s + (p.energy_dynamiseurs ?? 0), 0) / n : 0,
    Regulateurs:    n > 0 ? passports.reduce((s, p) => s + (p.energy_regulateurs ?? 0), 0) / n : 0,
  };

  // Normaliser à 100%
  const totalActual = FAMILIES.reduce((s, f) => s + actual[f], 0);
  if (totalActual > 0) {
    for (const f of FAMILIES) actual[f] = Math.round((actual[f] / totalActual) * 100);
  }

  const gaps       = computeEnergyGap(archetype, actual);
  const energyFit  = computeEnergyFit(archetype, actual);
  const required   = ARCHETYPE_ENERGY[archetype];
  const archColor  = ARCHETYPE_COLORS[archetype];

  // ─── IAS décomposé ────────────────────────────────────────────────────────────
  const avgCorr        = evals.length > 0 ? evals.reduce((s, e) => s + (e.correlation_score ?? 0), 0) / evals.length : 0;
  const capabilityFit  = Math.round(avgCorr);
  const adhesion       = pulseRes.data?.adhesion_score ?? 0;
  const velocity       = okrs.length > 0 ? Math.round(okrs.filter(o => o.on_track).length / okrs.length * 100) : 0;
  const highRisk       = passports.filter(p => (p.score_risk ?? 0) > 40).length;
  const trajectories   = n > 0 ? Math.round(((n - highRisk) / n) * 100) : 0;

  // ─── Profils à risque ─────────────────────────────────────────────────────────
  const atRisk = passports.filter(p => (p.score_risk ?? 0) > 40).slice(0, 5);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="BOUSSOLE — CORRÉLATION"
        title="Analyse de corrélation Vision × Équipe"
        subtitle={`${orgName} · Archétype ${ARCHETYPE_LABELS[archetype]}`}
      />

      {/* IAS décomposé */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <ScoreCircle value={orgIasScore} size="lg" />
          <div>
            <p className="section-tag text-slate-500 mb-1">INDEX D'ALIGNEMENT STRATÉGIQUE</p>
            <p className="font-display text-white text-xl">Décomposition IAS</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Capacité (C×0.30)', value: capabilityFit, weight: 0.30 },
            { label: 'Énergie fit (E×0.25)',   value: energyFit,    weight: 0.25 },
            { label: 'Adhésion vision (P×0.20)', value: adhesion,    weight: 0.20 },
            { label: 'OKR velocity (V×0.15)',   value: velocity,     weight: 0.15 },
            { label: 'Trajectoires (T×0.10)',   value: trajectories, weight: 0.10 },
          ].map(({ label, value, weight }) => {
            const contrib = Math.round(value * weight);
            const color   = value >= 80 ? '#10B981' : value >= 60 ? '#F59E0B' : '#F43F5E';
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-52 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
                </div>
                <span className="font-mono text-xs text-slate-400 w-8">{value}</span>
                <span className="font-mono text-xs font-bold w-6 text-right" style={{ color }}>+{contrib}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Archétype cible */}
      <div className="card" style={{ borderLeft: `4px solid ${archColor}` }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: archColor }} />
          <p className="font-display text-white">{ARCHETYPE_LABELS[archetype]}</p>
          <span className="ml-auto text-xs text-slate-500">Mix requis</span>
        </div>
        {assessmentRes.data?.vision_statement && (
          <p className="text-slate-400 text-sm italic mt-1">"{assessmentRes.data.vision_statement}"</p>
        )}
      </div>

      {/* Gaps énergétiques */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-white text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" /> Gaps énergétiques
          </h3>
          <span className="text-xs font-mono font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: `${energyFit >= 70 ? '#10B981' : energyFit >= 50 ? '#F59E0B' : '#F43F5E'}15`,
                     color: energyFit >= 70 ? '#10B981' : energyFit >= 50 ? '#F59E0B' : '#F43F5E' }}>
            Energy Fit : {energyFit}/100
          </span>
        </div>

        {n === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Aucun Talent Passport — les gaps seront calculés une fois les passports renseignés.</p>
        ) : (
          <div className="space-y-4">
            {FAMILIES.map(f => {
              const req  = required[f] ?? 0;
              const act  = actual[f] ?? 0;
              const gap  = gaps[f] ?? 0;
              const color = FAMILY_COLORS[f];
              const isExcess  = gap < -3;
              const isDeficit = gap > 3;

              return (
                <div key={f} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color }}>{f}</span>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Requis : <strong className="text-white">{req}%</strong></span>
                      <span>Actuel : <strong className="text-white">{act}%</strong></span>
                      <span className={`font-mono font-bold ${isDeficit ? 'text-rose-400' : isExcess ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {gap > 0 ? `−${gap}%` : gap < 0 ? `+${Math.abs(gap)}%` : '≈ OK'}
                      </span>
                    </div>
                  </div>
                  {/* Barres superposées */}
                  <div className="relative h-3 bg-bg rounded-full overflow-hidden">
                    <div className="absolute inset-0 h-full rounded-full opacity-30" style={{ width: `${req}%`, backgroundColor: color }} />
                    <div className="absolute inset-0 h-full rounded-full" style={{ width: `${act}%`, backgroundColor: color }} />
                  </div>
                  {(isDeficit || isExcess) && (
                    <p className="text-[10px] text-slate-600 flex items-center gap-1">
                      {isDeficit ? (
                        <><AlertTriangle className="w-3 h-3 text-rose-400" /> Déficit — recrutez des profils <strong style={{ color }}>{f}</strong></>
                      ) : (
                        <><TrendingUp className="w-3 h-3 text-amber-400" /> Excédent — potentiel de mobilité ou reconversion</>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Métriques de corrélation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="font-display text-3xl font-bold" style={{ color: capabilityFit >= 70 ? '#10B981' : capabilityFit >= 50 ? '#F59E0B' : '#F43F5E' }}>
            {capabilityFit}
          </p>
          <p className="text-slate-400 text-sm mt-1">Score corrélation moyen</p>
          <p className="text-slate-600 text-xs">évaluations vs passport</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl font-bold text-emerald-400">{n - highRisk}</p>
          <p className="text-slate-400 text-sm mt-1">Trajectoires alignées</p>
          <p className="text-slate-600 text-xs">sur {n} passports actifs</p>
        </div>
        <div className="card text-center">
          <p className={`font-display text-3xl font-bold ${highRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{highRisk}</p>
          <p className="text-slate-400 text-sm mt-1">Profils à risque départ</p>
          <p className="text-slate-600 text-xs">score_risk &gt; 40</p>
        </div>
      </div>

      {/* Profils à risque */}
      {atRisk.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-display text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Profils à risque de départ
          </h3>
          <div className="space-y-2">
            {atRisk.map(p => (
              <div key={p.profile_id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-300 text-sm">{p.dominant_family ?? '—'}</p>
                  <p className="text-slate-600 text-xs">Score global : {p.score_global ?? '—'}</p>
                </div>
                <span className="font-mono text-sm font-bold text-rose-400">{p.score_risk ?? 0}% risque</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommandations IA */}
      <AIInsightCard
        title="Analyse de corrélation"
        insights={[
          energyFit < 50
            ? `Écart énergétique critique (Energy Fit ${energyFit}/100) — votre mix actuel diverge fortement du profil ${ARCHETYPE_LABELS[archetype]}. Priorisez le recrutement de profils ${FAMILIES.filter(f => (gaps[f] ?? 0) > 5).join(', ')}.`
            : `Energy Fit satisfaisant (${energyFit}/100). Concentrez-vous sur l'amélioration du score de corrélation (${capabilityFit}/100) via des évaluations plus régulières.`,
          highRisk > 0
            ? `${highRisk} profil(s) à risque de départ identifié(s). Action recommandée : entretien individuel et révision de trajectoire sous 30 jours.`
            : `Aucun profil critique détecté — situation saine.`,
          velocity < 60
            ? `OKR Velocity à ${velocity}% — seulement ${okrs.filter(o => o.on_track).length}/${okrs.length} objectifs on-track. Renforcez le suivi hebdomadaire.`
            : `OKR Velocity à ${velocity}% — bonne progression des objectifs stratégiques.`,
        ]}
      />
    </div>
  );
}
