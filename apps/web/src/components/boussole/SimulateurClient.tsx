'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, RotateCcw, Plus, Info } from 'lucide-react';
import { computeEnergyFit } from '@teranga/scoring';
import type { EnergyFamily } from '@teranga/scoring';
import type { Archetype } from '@teranga/types';

const FAMILIES: EnergyFamily[] = ['Pilotes', 'Initialiseurs', 'Accomplisseurs', 'Dynamiseurs', 'Regulateurs'];

const FAMILY_COLORS: Record<EnergyFamily, string> = {
  Pilotes:        '#F97316',
  Initialiseurs:  '#8B5CF6',
  Accomplisseurs: '#10B981',
  Dynamiseurs:    '#0EA5E9',
  Regulateurs:    '#F59E0B',
};

interface Props {
  archetype:          Archetype;
  archetypeLabel:     string;
  currentIas:         number;
  currentEnergy:      Record<EnergyFamily, number>;
  requiredEnergy:     Record<EnergyFamily, number>;
  teamSize:           number;
  baselineCapability: number;
  baselineAdhesion:   number;
  baselineVelocity:   number;
}

function computeIAS(capabilityFit: number, energyFit: number, adhesion: number, velocity: number, trajectories: number) {
  return Math.round(0.30 * capabilityFit + 0.25 * energyFit + 0.20 * adhesion + 0.15 * velocity + 0.10 * trajectories);
}

type Scenario = { label: string; delta: Partial<Record<EnergyFamily, number>>; capDelta: number };

const SCENARIOS: Scenario[] = [
  { label: 'Embauche 2 Pilotes',        delta: { Pilotes: 5 },        capDelta: 3  },
  { label: 'Départ 3 Accomplisseurs',   delta: { Accomplisseurs: -8 }, capDelta: -5 },
  { label: 'Programme Initialiseurs',   delta: { Initialiseurs: 6 },   capDelta: 4  },
  { label: 'Réduction 10% effectif',    delta: { Pilotes: -3, Accomplisseurs: -3, Regulateurs: -2 }, capDelta: -4 },
  { label: 'Transformation digitale',   delta: { Initialiseurs: 8, Dynamiseurs: 4 }, capDelta: 6 },
];

export default function SimulateurClient({
  archetype, archetypeLabel, currentIas, currentEnergy, requiredEnergy,
  teamSize, baselineCapability, baselineAdhesion, baselineVelocity,
}: Props) {
  const [simEnergy, setSimEnergy] = useState<Record<EnergyFamily, number>>({ ...currentEnergy });
  const [simCapability, setSimCapability] = useState(baselineCapability);
  const [appliedScenario, setAppliedScenario] = useState<string | null>(null);

  const simEnergyFit  = computeEnergyFit(archetype, simEnergy);
  const baseEnergyFit = computeEnergyFit(archetype, currentEnergy);

  // Trajectoires dérivées de l'energy fit simulé
  const simTrajectories = Math.round(Math.min(100, (simEnergyFit / 100) * 85 + 15));
  const baseTraj        = Math.round(Math.min(100, (baseEnergyFit / 100) * 85 + 15));

  const simIas  = computeIAS(simCapability, simEnergyFit,  baselineAdhesion, baselineVelocity, simTrajectories);
  const baseIas = computeIAS(baselineCapability, baseEnergyFit, baselineAdhesion, baselineVelocity, baseTraj);
  const iasGain = simIas - currentIas;

  function adjustFamily(family: EnergyFamily, delta: number) {
    setSimEnergy(prev => {
      const next = { ...prev };
      next[family] = Math.max(0, Math.min(100, (next[family] ?? 0) + delta));
      // Normaliser
      const total = FAMILIES.reduce((s, f) => s + (next[f] ?? 0), 0);
      if (total > 0) for (const f of FAMILIES) next[f] = Math.round((next[f] / total) * 100);
      return next;
    });
    setAppliedScenario(null);
  }

  function applyScenario(s: Scenario) {
    setSimEnergy(prev => {
      const next = { ...prev };
      for (const [f, d] of Object.entries(s.delta) as [EnergyFamily, number][]) {
        next[f] = Math.max(0, (next[f] ?? 0) + d);
      }
      const total = FAMILIES.reduce((sum, f) => sum + (next[f] ?? 0), 0);
      if (total > 0) for (const f of FAMILIES) next[f] = Math.round((next[f] / total) * 100);
      return next;
    });
    setSimCapability(Math.max(0, Math.min(100, baselineCapability + s.capDelta)));
    setAppliedScenario(s.label);
  }

  function reset() {
    setSimEnergy({ ...currentEnergy });
    setSimCapability(baselineCapability);
    setAppliedScenario(null);
  }

  const hasChanged = JSON.stringify(simEnergy) !== JSON.stringify(currentEnergy) || simCapability !== baselineCapability;

  return (
    <div className="space-y-6">
      {/* IAS Avant / Après */}
      <div className="grid grid-cols-3 gap-4 items-center">
        <div className="card text-center">
          <p className="text-slate-500 text-xs mb-2">IAS ACTUEL</p>
          <p className={`font-display text-4xl font-bold ${currentIas >= 70 ? 'text-emerald-400' : currentIas >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
            {currentIas}
          </p>
        </div>

        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-bold font-mono ${
            iasGain > 0 ? 'bg-emerald-500/15 text-emerald-400' : iasGain < 0 ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {iasGain > 0 ? <TrendingUp className="w-5 h-5" /> : iasGain < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            {iasGain > 0 ? `+${iasGain}` : iasGain}
          </div>
          <p className="text-slate-500 text-xs mt-2">impact simulé</p>
        </div>

        <div className="card text-center">
          <p className="text-slate-500 text-xs mb-2">IAS SIMULÉ</p>
          <p className={`font-display text-4xl font-bold ${simIas >= 70 ? 'text-emerald-400' : simIas >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
            {simIas}
          </p>
        </div>
      </div>

      {/* Scénarios prédéfinis */}
      <div className="card space-y-3">
        <h3 className="font-display text-slate-900 text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400" /> Scénarios rapides
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SCENARIOS.map(s => {
            const testEnergy = { ...currentEnergy };
            for (const [f, d] of Object.entries(s.delta) as [EnergyFamily, number][]) {
              testEnergy[f] = Math.max(0, (testEnergy[f] ?? 0) + d);
            }
            const testFit   = computeEnergyFit(archetype, testEnergy);
            const testTraj  = Math.round(Math.min(100, (testFit / 100) * 85 + 15));
            const testIas   = computeIAS(baselineCapability + s.capDelta, testFit, baselineAdhesion, baselineVelocity, testTraj);
            const impact    = testIas - currentIas;
            return (
              <button key={s.label} onClick={() => applyScenario(s)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${
                  appliedScenario === s.label
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-slate-200 hover:border-slate-200 bg-slate-50'
                }`}>
                <p className="text-slate-900 font-medium">{s.label}</p>
                <p className={`font-mono text-xs font-bold mt-0.5 ${impact > 0 ? 'text-emerald-400' : impact < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  IAS {impact > 0 ? `+${impact}` : impact}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ajustement manuel énergie */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-slate-900 text-sm">Ajustement manuel du mix énergétique</h3>
          {hasChanged && (
            <button onClick={reset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-600 transition-colors">
              <RotateCcw className="w-3 h-3" /> Réinitialiser
            </button>
          )}
        </div>

        <div className="space-y-4">
          {FAMILIES.map(f => {
            const color    = FAMILY_COLORS[f];
            const simVal   = simEnergy[f] ?? 0;
            const currVal  = currentEnergy[f] ?? 0;
            const reqVal   = requiredEnergy[f] ?? 0;
            const delta    = simVal - currVal;

            return (
              <div key={f} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color }}>{f}</span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>Requis : <strong className="text-slate-900">{reqVal}%</strong></span>
                    {delta !== 0 && (
                      <span className={`font-mono font-bold ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {delta > 0 ? `+${delta}` : delta}%
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-900">{simVal}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustFamily(f, -5)}
                    className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 transition-colors flex-shrink-0">
                    <span className="text-sm font-bold">−</span>
                  </button>
                  <div className="flex-1 relative h-3 bg-bg rounded-full overflow-hidden cursor-pointer">
                    {/* Requis (fond clair) */}
                    <div className="absolute inset-0 h-full rounded-full opacity-20" style={{ width: `${reqVal}%`, backgroundColor: color }} />
                    {/* Actuel */}
                    <div className="absolute inset-0 h-full rounded-full transition-all" style={{ width: `${simVal}%`, backgroundColor: color }} />
                  </div>
                  <button onClick={() => adjustFamily(f, 5)}
                    className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-colors flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tableau IAS décomposé simulé */}
      <div className="card space-y-2">
        <h3 className="font-display text-slate-900 text-sm">Impact sur les composantes IAS</h3>
        <div className="space-y-2">
          {[
            { label: 'Capacité (C)',       base: baselineCapability, sim: simCapability,    weight: 0.30 },
            { label: 'Énergie fit (E)',     base: baseEnergyFit,      sim: simEnergyFit,     weight: 0.25 },
            { label: 'Adhésion vision (P)', base: baselineAdhesion,   sim: baselineAdhesion, weight: 0.20 },
            { label: 'OKR velocity (V)',    base: baselineVelocity,   sim: baselineVelocity, weight: 0.15 },
            { label: 'Trajectoires (T)',    base: baseTraj,            sim: simTrajectories,  weight: 0.10 },
          ].map(({ label, base, sim, weight }) => {
            const basePts = Math.round(base * weight);
            const simPts  = Math.round(sim * weight);
            const diff    = simPts - basePts;
            return (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="text-slate-400 text-xs w-44 flex-shrink-0">{label}</span>
                <span className="font-mono text-slate-500 w-14 text-right">{base} → {sim}</span>
                <span className="font-mono text-slate-500 w-12 text-right">+{basePts}pts</span>
                <span className={`font-mono text-xs font-bold w-14 text-right ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {diff > 0 ? `+${diff}` : diff > 0 ? diff : diff === 0 ? '=' : diff}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <p className="text-slate-600 text-xs text-center">
        Barre foncée = valeur simulée · Barre transparente = objectif archétype {archetypeLabel}. Les valeurs d'adhésion et velocity ne sont pas modifiables ici (elles dépendent de sondages et d'OKR réels).
      </p>
    </div>
  );
}
