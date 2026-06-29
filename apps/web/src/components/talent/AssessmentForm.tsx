'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import type { QUESTION_STEPS } from '@/lib/talent/assessment';

type Step = typeof QUESTION_STEPS[number];
interface Props { steps: Step[]; profileId: string; }

const DIM_COLORS: Record<string, string> = {
  H: '#0EA5E9', S: '#8B5CF6', X: '#F97316', L: '#10B981', E: '#F59E0B', R: '#F43F5E',
};
const DIM_ICONS: Record<string, string> = {
  H: '⚙', S: '🧩', X: '📈', L: '🌿', E: '⚡', R: '🛡',
};

export default function AssessmentForm({ steps, profileId }: Props) {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const currentStep  = steps[step];
  if (!currentStep) return null;

  const totalQ       = steps.reduce((s, st) => s + st.questions.length, 0);
  const answeredQ    = Object.keys(responses).length;
  const globalPct    = Math.round((answeredQ / totalQ) * 100);

  const stepQuestions  = currentStep.questions;
  const stepAnswered   = stepQuestions.filter(q => responses[q.id] != null).length;
  const stepComplete   = stepAnswered === stepQuestions.length;
  const isLastStep     = step === steps.length - 1;
  const color          = DIM_COLORS[currentStep.key] ?? '#10B981';

  function answer(qId: string, value: number) {
    setResponses(prev => ({ ...prev, [qId]: value }));
  }

  async function submit() {
    setLoading(true);
    const res = await fetch('/api/talent/assessment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ responses }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push('/talent/passport'), 2000);
    }
  }

  if (done) return (
    <div className="text-center py-16 space-y-4">
      <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
      <h2 className="font-display text-white text-2xl">Passport généré !</h2>
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
          const sAnswered = s.questions.filter(q => responses[q.id] != null).length;
          const sDone     = sAnswered === s.questions.length;
          const sColor    = DIM_COLORS[s.key] ?? '#10B981';
          return (
            <button key={s.key} onClick={() => setStep(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                i === step ? 'text-white' : sDone ? 'text-slate-400' : 'text-slate-600 hover:text-slate-400'
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
        <div className="flex items-center gap-3 pb-3 border-b border-white/[0.04]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}>
            {DIM_ICONS[currentStep.key]}
          </div>
          <div>
            <p className="text-white font-semibold">{currentStep.label}</p>
            <p className="text-slate-500 text-xs">{stepAnswered}/{stepQuestions.length} répondues</p>
          </div>
        </div>

        <div className="space-y-8">
          {stepQuestions.map((q, qi) => {
            const selected = responses[q.id];
            return (
              <div key={q.id} className="space-y-3">
                <p className="text-slate-200 text-sm leading-relaxed">
                  <span className="text-slate-600 text-xs font-mono mr-2">{qi + 1}.</span>
                  {q.text}
                  {q.inverse && <span className="ml-2 text-[10px] text-rose-400/70">[score inversé]</span>}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {q.options.map(opt => (
                    <button key={opt.value} onClick={() => answer(q.id, opt.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all border ${
                        selected === opt.value
                          ? 'border-current font-medium'
                          : 'border-white/[0.04] text-slate-400 hover:border-white/10 hover:text-slate-300'
                      }`}
                      style={selected === opt.value ? { borderColor: color, color, backgroundColor: `${color}10` } : {}}>
                      <span className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                        style={selected === opt.value ? { borderColor: color, backgroundColor: color } : { borderColor: '#374151' }}>
                        {selected === opt.value && <span className="w-2 h-2 rounded-full bg-white" />}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10 text-sm transition-all">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {!isLastStep ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!stepComplete}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              stepComplete ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/[0.03] text-slate-600 cursor-not-allowed'
            }`}>
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={!stepComplete || loading}
            className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? 'Génération du Passport…' : '✦ Générer mon Passport'}
          </button>
        )}
      </div>
    </div>
  );
}
