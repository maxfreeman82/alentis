'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import type { FounderQuestion } from '@/lib/founder/questions';

interface Props { questions: FounderQuestion[]; }

export default function FounderQuestionnaire({ questions }: Props) {
  const router  = useRouter();
  const [step, setStep]         = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const current    = questions[step];
  if (!current) return null;

  const currentId  = current.id;
  const progress   = Math.round(((step) / questions.length) * 100);
  const answered   = responses[currentId];
  const isLast     = step === questions.length - 1;
  const allAnswered = Object.keys(responses).length === questions.length;

  function select(value: string) {
    setResponses(prev => ({ ...prev, [currentId]: value }));
  }

  function next() {
    if (!answered) return;
    if (isLast) { submit(); return; }
    setStep(s => s + 1);
  }

  async function submit() {
    if (!allAnswered) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/founder/boussole', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ responses }),
    });

    if (!res.ok) {
      setError('Une erreur est survenue. Vos réponses sont sauvegardées.');
      setLoading(false);
      return;
    }
    router.push('/demarrer/resultat');
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {step + 1} sur {questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 bg-bg-card rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        {/* Pastilles */}
        <div className="flex gap-1.5 justify-center">
          {questions.map((q, i) => (
            <button key={q.id} onClick={() => setStep(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: responses[q.id]
                  ? '#F59E0B'
                  : i === step
                  ? 'rgba(245,158,11,0.4)'
                  : 'rgba(255,255,255,0.08)',
              }} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="card space-y-6">
        <p className="text-slate-900 text-base leading-relaxed font-medium">
          {current.text}
        </p>

        <div className="space-y-2">
          {current.options.map(opt => {
            const isSelected = answered === opt.value;
            return (
              <button key={opt.value} onClick={() => select(opt.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all border ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-white font-medium'
                    : 'border-slate-200 text-slate-400 hover:border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 transition-all ${
                  isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-600 text-slate-600'
                }`}>
                  {opt.value}
                </span>
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-200 text-sm transition-all">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {!isLast ? (
          <button onClick={next} disabled={!answered}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              answered
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-slate-50 text-slate-600 cursor-not-allowed'
            }`}>
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={!allAnswered || loading}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Révéler mon archétype</>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
    </div>
  );
}
