'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import type { AssessmentStep } from '@/lib/talent/assessment';
import EnergyStepAdaptive, { type FinalProfile } from './EnergyStepAdaptive';
import AdaptiveStep from './AdaptiveStep';
import CvGate from './CvGate';

interface Props {
  steps:                  AssessmentStep[];
  completedAdaptiveSteps: string[];
  energyDone:             boolean;
  cvReady:                boolean;
}

const DIM_COLORS: Record<string, string> = {
  H: '#0EA5E9', S: '#8B5CF6', X: '#F97316', L: '#10B981', E: '#F59E0B', R: '#F43F5E',
};
const DIM_ICONS: Record<string, string> = {
  H: '⚙', S: '🧩', X: '📈', L: '🌿', E: '⚡', R: '🛡',
};

export default function AssessmentForm({ steps, completedAdaptiveSteps, energyDone, cvReady }: Props) {
  const router = useRouter();
  const [step, setStep]                   = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [done, setDone]                   = useState(false);
  const [energyProfile, setEnergyProfile] = useState<FinalProfile | null>(null);
  const [energyComplete, setEnergyComplete] = useState(energyDone);
  const [adaptiveDone, setAdaptiveDone]   = useState<Set<string>>(() => new Set(completedAdaptiveSteps));
  // Change à chaque « Tout refaire » pour remonter les étapes à neuf
  const [resetKey, setResetKey]           = useState(0);

  // Le CV est la base des questions techniques et de preuve : obligatoire avant tout.
  if (!cvReady) return <CvGate />;

  const currentStep = steps[step];
  if (!currentStep) return null;

  function isStepDone(s: AssessmentStep): boolean {
    if (s.key === 'E') return energyComplete;
    return s.adaptive ? adaptiveDone.has(s.adaptive) : false;
  }

  const doneCount    = steps.filter(isStepDone).length;
  const globalPct    = Math.round((doneCount / steps.length) * 100);
  const stepComplete = isStepDone(currentStep);
  const allStepsDone = doneCount === steps.length;
  const isLastStep   = step === steps.length - 1;
  const color        = DIM_COLORS[currentStep.key] ?? '#10B981';
  const adaptive     = currentStep.adaptive;

  function markUndone(step: string) {
    setAdaptiveDone(prev => { const next = new Set(prev); next.delete(step); return next; });
  }

  function restartEnergy() {
    setEnergyProfile(null);
    setEnergyComplete(false);
  }

  // Remet toutes les étapes à zéro côté interface ; chaque « Commencer » crée
  // ensuite une nouvelle passation. Les résultats précédents restent en base et
  // comptent tant qu'une nouvelle passation n'est pas terminée.
  function restartAll() {
    setAdaptiveDone(new Set());
    restartEnergy();
    setResetKey(k => k + 1);
    setStep(0);
    setError('');
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      // Aucun score envoyé : le serveur relit les passations terminées.
      const res = await fetch('/api/talent/assessment', { method: 'POST' });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push('/passport'), 2000);
        return;
      }
      const json = await res.json().catch(() => ({})) as { error?: unknown };
      setError(typeof json.error === 'string' ? json.error : `Échec de l'enregistrement (erreur ${res.status}). Réessayez.`);
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div className="text-center py-16 space-y-4">
      <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
      <h2 className="font-display text-slate-900 text-2xl">Passport généré !</h2>
      <p className="text-slate-400">Redirection vers votre profil…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progression : étapes terminées */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{doneCount}/{steps.length} étapes terminées</span>
          <span className="flex items-center gap-3">
            {doneCount > 0 && (
              <button type="button" onClick={restartAll}
                className="underline hover:text-slate-800 transition-colors">
                Tout refaire
              </button>
            )}
            {globalPct}%
          </span>
        </div>
        <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${globalPct}%` }} />
        </div>
      </div>

      {/* Étapes navettes */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const sDone  = isStepDone(s);
          const sColor = DIM_COLORS[s.key] ?? '#10B981';
          return (
            <button key={s.key} onClick={() => setStep(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                i === step ? 'text-slate-900' : sDone ? 'text-slate-400' : 'text-slate-600 hover:text-slate-400'
              }`}
              style={i === step ? { backgroundColor: `${sColor}15`, color: sColor } : {}}>
              {sDone ? <CheckCircle className="w-3 h-3" style={{ color: sColor }} /> : <span>{DIM_ICONS[s.key]}</span>}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Bloc de l'étape */}
      <div className="card space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}>
            {DIM_ICONS[currentStep.key]}
          </div>
          <p className="text-slate-900 font-semibold">{currentStep.label}</p>
        </div>

        {adaptive ? (
          <AdaptiveStep
            key={`${adaptive}-${resetKey}`}
            step={adaptive}
            color={color}
            initiallyDone={adaptiveDone.has(adaptive)}
            onComplete={() => setAdaptiveDone(prev => new Set(prev).add(adaptive))}
            onRestart={() => markUndone(adaptive)}
          />
        ) : energyComplete && !energyProfile ? (
          <div className="text-center py-10 space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color }} />
            <p className="text-slate-900 font-semibold">Étape terminée</p>
            <button type="button" onClick={restartEnergy}
              className="text-xs text-slate-500 underline hover:text-slate-800 transition-colors">
              Refaire cette étape
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <EnergyStepAdaptive
              key={`energy-step-${resetKey}-${energyComplete ? 'done' : 'todo'}`}
              onComplete={(profile) => { setEnergyProfile(profile); setEnergyComplete(true); }}
              initialProfile={energyProfile}
            />
            {energyProfile && (
              <div className="text-center">
                <button type="button" onClick={restartEnergy}
                  className="text-xs text-slate-500 underline hover:text-slate-800 transition-colors">
                  Refaire cette étape
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl px-4 py-3 text-sm text-rose-500">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-200 text-sm transition-all">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {!isLastStep ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!stepComplete}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              stepComplete ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-50 text-slate-600 cursor-not-allowed'
            }`}>
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={!allStepsDone || loading}
            className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-slate-900 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? 'Génération du Passport…' : '✦ Générer mon Passport'}
          </button>
        )}
      </div>
    </div>
  );
}
