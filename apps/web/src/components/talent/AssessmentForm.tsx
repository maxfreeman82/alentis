'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { questionKind, type Question, type QUESTION_STEPS } from '@/lib/talent/assessment';
import EnergyStepAdaptive, { type FinalProfile } from './EnergyStepAdaptive';
import AdaptiveStep from './AdaptiveStep';
import type { StepId } from '@teranga/talent-assessment';

type Step = typeof QUESTION_STEPS[number];
interface Props { steps: Step[]; profileId: string; completedAdaptiveSteps: string[]; }

const DIM_COLORS: Record<string, string> = {
  H: '#0EA5E9', S: '#8B5CF6', X: '#F97316', L: '#10B981', E: '#F59E0B', R: '#F43F5E',
};
const DIM_ICONS: Record<string, string> = {
  H: '⚙', S: '🧩', X: '📈', L: '🌿', E: '⚡', R: '🛡',
};
// Onglets du wizard pilotés par le moteur adaptatif (tranches suivantes : H, X).
const ADAPTIVE_STEPS: Partial<Record<string, StepId>> = { S: 'soft', L: 'life', R: 'risk' };

export default function AssessmentForm({ steps, profileId, completedAdaptiveSteps }: Props) {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);
  const [energyProfile, setEnergyProfile] = useState<FinalProfile | null>(null);
  const [adaptiveDone, setAdaptiveDone]   = useState<Set<string>>(() => new Set(completedAdaptiveSteps));

  const currentStep  = steps[step];
  if (!currentStep) return null;

  const totalQ       = steps.reduce((s, st) => s + st.questions.length, 0);
  const answeredQ    = Object.keys(responses).length;
  const globalPct    = Math.round((answeredQ / totalQ) * 100);

  const stepQuestions  = currentStep.questions;
  const stepAnswered   = stepQuestions.filter(q => responses[q.id] != null).length;
  function isStepDone(key: string, questions: { id: string }[]): boolean {
    if (key === 'E') return energyProfile !== null;
    const adaptive = ADAPTIVE_STEPS[key];
    if (adaptive) return adaptiveDone.has(adaptive);
    return questions.length > 0 && questions.every(q => responses[q.id] != null);
  }

  const currentAdaptive = ADAPTIVE_STEPS[currentStep.key];
  const stepComplete   = isStepDone(currentStep.key, stepQuestions);
  const allStepsDone   = steps.every(s => isStepDone(s.key, s.questions));
  const isLastStep     = step === steps.length - 1;
  const color          = DIM_COLORS[currentStep.key] ?? '#10B981';

  function answer(qId: string, value: number) {
    setResponses(prev => ({ ...prev, [qId]: value }));
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/talent/assessment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ responses }),
      });
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
      {/* Progress global */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{answeredQ}/{totalQ} questions répondues</span>
          <span>{globalPct}%</span>
        </div>
        <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${globalPct}%` }} />
        </div>
      </div>

      {/* Étapes navettes */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const sDone     = isStepDone(s.key, s.questions);
          const sColor    = DIM_COLORS[s.key] ?? '#10B981';
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

      {/* Bloc questions de l'étape */}
      <div className="card space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}>
            {DIM_ICONS[currentStep.key]}
          </div>
          <div>
            <p className="text-slate-900 font-semibold">{currentStep.label}</p>
            {currentStep.key !== 'E' && !currentAdaptive && (
              <p className="text-slate-500 text-xs">{stepAnswered}/{stepQuestions.length} répondues</p>
            )}
          </div>
        </div>

        {currentStep.key === 'E' ? (
          <EnergyStepAdaptive
            key="energy-step"
            onComplete={(profile) => setEnergyProfile(profile)}
            initialProfile={energyProfile}
          />
        ) : currentAdaptive ? (
          <AdaptiveStep
            key={currentAdaptive}
            step={currentAdaptive}
            color={color}
            initiallyDone={adaptiveDone.has(currentAdaptive)}
            onComplete={() => setAdaptiveDone(prev => new Set(prev).add(currentAdaptive))}
          />
        ) : (
          <div className="space-y-8">
            {stepQuestions.map((q, qi) => {
              const selected = responses[q.id];
              return (
                <div key={q.id} className="space-y-3">
                  <p className="text-slate-700 text-sm leading-relaxed">
                    <span className="text-slate-600 text-xs font-mono mr-2">{qi + 1}.</span>
                    {q.text}
                    {q.inverse && <span className="ml-2 text-[10px] text-rose-400/70">[score inversé]</span>}
                  </p>
                  <QuestionInput question={q} selected={selected} color={color} onAnswer={v => answer(q.id, v)} />
                </div>
              );
            })}
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

// ─── Widgets de réponse (valeurs 1→5 dans tous les cas) ──────────────────────

interface InputProps {
  question: Question;
  selected: number | undefined;
  color:    string;
  onAnswer: (value: number) => void;
}

function QuestionInput(props: InputProps) {
  switch (questionKind(props.question)) {
    case 'agree':     return <AgreeScale {...props} />;
    case 'frequency': return <FrequencySlider {...props} />;
    case 'range':     return <RangeSegments {...props} />;
    case 'choice':    return <ChoiceCards {...props} />;
  }
}

// Likert : 5 pastilles, plus grandes aux extrêmes
function AgreeScale({ question, selected, color, onAnswer }: InputProps) {
  const sizes = ['w-10 h-10', 'w-8 h-8', 'w-6 h-6', 'w-8 h-8', 'w-10 h-10'];
  const current = question.options.find(o => o.value === selected);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="hidden sm:block text-xs text-slate-500 w-24">Pas d&apos;accord</span>
        <div className="flex flex-1 items-center justify-between sm:justify-center sm:gap-8">
          {question.options.map((opt, i) => {
            const active = selected === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => onAnswer(opt.value)}
                aria-label={opt.label} aria-pressed={active} title={opt.label}
                className={`${sizes[i]} rounded-full border-2 transition-all hover:scale-110`}
                style={active
                  ? { borderColor: color, backgroundColor: color }
                  : { borderColor: i < 2 ? '#FDA4AF' : i > 2 ? '#6EE7B7' : '#CBD5E1' }} />
            );
          })}
        </div>
        <span className="hidden sm:block text-xs text-slate-500 w-24 text-right">D&apos;accord</span>
      </div>
      <p className="text-center text-xs h-4 font-medium" style={{ color }}>{current?.label ?? ''}</p>
    </div>
  );
}

// Fréquence : curseur gradué
function FrequencySlider({ question, selected, color, onAnswer }: InputProps) {
  const current = question.options.find(o => o.value === selected);
  const pct = selected ? ((selected - 1) / 4) * 100 : 0;
  return (
    <div className="space-y-2 px-1">
      <input type="range" min={1} max={5} step={1}
        value={selected ?? 3}
        onChange={e => onAnswer(Number(e.target.value))}
        onClick={e => onAnswer(Number(e.currentTarget.value))}
        aria-label={question.text}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          accentColor: color,
          background: selected ? `linear-gradient(to right, ${color} ${pct}%, #E2E8F0 ${pct}%)` : '#E2E8F0',
        }} />
      <div className="flex justify-between text-[11px] text-slate-500">
        {question.options.map(o => (
          <span key={o.value} className="w-1/5 text-center first:text-left last:text-right">
            {o.label.split(' / ')[1] ?? o.label}
          </span>
        ))}
      </div>
      <p className="text-center text-xs h-4 font-medium" style={{ color: current ? color : undefined }}>
        {current ? current.label : 'Cliquez ou déplacez le curseur'}
      </p>
    </div>
  );
}

// Plage numérique : barre segmentée qui se remplit jusqu'à la valeur choisie
function RangeSegments({ question, selected, color, onAnswer }: InputProps) {
  return (
    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
      {question.options.map(opt => {
        const filled = selected != null && opt.value <= selected;
        const active = selected === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onAnswer(opt.value)} aria-pressed={active}
            className={`flex-1 px-1 py-3 text-xs sm:text-sm transition-all border-r last:border-r-0 border-slate-200 ${
              active ? 'font-semibold text-white' : filled ? 'font-medium' : 'text-slate-500 hover:bg-slate-50'
            }`}
            style={active ? { backgroundColor: color } : filled ? { backgroundColor: `${color}20`, color } : {}}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Choix qualitatif : grille de cartes avec indicateur de niveau
function ChoiceCards({ question, selected, color, onAnswer }: InputProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {question.options.map(opt => {
        const active = selected === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onAnswer(opt.value)} aria-pressed={active}
            className={`relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left text-sm transition-all ${
              active ? 'font-medium shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
            style={active ? { borderColor: color, color, backgroundColor: `${color}10` } : {}}>
            <span className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: n <= opt.value ? (active ? color : '#94A3B8') : '#E2E8F0' }} />
              ))}
            </span>
            {opt.label}
            {active && <CheckCircle className="absolute top-2 right-2 w-4 h-4" />}
          </button>
        );
      })}
    </div>
  );
}
