'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { PULSE_QUESTIONS, DIMENSIONS } from '@/lib/vision-pulse/survey';
import type { PulseDimension } from '@/lib/vision-pulse/survey';

interface PulseSurveyProps {
  visionStatement?: string | null;
  quarter: number;
  year: number;
  organizationId: string;
}

const DIM_ORDER: PulseDimension[] = ['knowledge', 'credibility', 'connection', 'capability', 'projection'];

const RATING_LABELS: Record<number, string> = {
  1: 'Jamais',
  2: 'Rarement',
  3: 'Parfois',
  4: 'Souvent',
  5: 'Toujours',
};

const RATING_COLORS: Record<number, string> = {
  1: '#F43F5E',
  2: '#F97316',
  3: '#F59E0B',
  4: '#0EA5E9',
  5: '#10B981',
};

export function PulseSurvey({ visionStatement, quarter, year, organizationId }: PulseSurveyProps) {
  const router  = useRouter();
  const [step,  setStep]      = useState(0); // index de dimension (0-4)
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error,  setError]    = useState<string | null>(null);

  const currentDim  = DIM_ORDER[step] ?? 'knowledge';
  const dimInfo     = DIMENSIONS[currentDim];
  const dimQuestions = PULSE_QUESTIONS.filter(q => q.dimension === currentDim);

  const dimResponses = dimQuestions.map(q => responses[q.id]);
  const dimComplete  = dimResponses.every(v => v !== undefined);

  const totalAnswered = Object.keys(responses).length;
  const progress      = Math.round((totalAnswered / PULSE_QUESTIONS.length) * 100);

  function handleRate(questionId: string, value: number) {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleNext() {
    if (!dimComplete) return;
    if (step < DIM_ORDER.length - 1) {
      setStep(s => s + 1);
      return;
    }
    // Dernière dimension — soumettre
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vision-pulse/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, quarter, year, responses }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Erreur serveur');
      }
      router.push('/boussole?pulse=done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Vision context */}
      {visionStatement && (
        <div className="mb-6 p-4 rounded-xl bg-emerald/5 border border-emerald/15">
          <p className="text-xs text-emerald font-semibold uppercase tracking-widest mb-1">VISION ORGANISATION</p>
          <p className="text-slate-600 text-sm italic leading-relaxed">{visionStatement}</p>
        </div>
      )}

      {/* Barre de progression globale */}
      <div className="mb-6">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
          <span>Question {totalAnswered}/{PULSE_QUESTIONS.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: dimInfo.color }}
          />
        </div>
      </div>

      {/* Pastilles dimensions */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {DIM_ORDER.map((d, i) => {
          const info    = DIMENSIONS[d];
          const done    = i < step || (i === step && dimComplete);
          const current = i === step;
          return (
            <button
              key={d}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
                done    ? 'bg-emerald/10 border-emerald/20 text-emerald' :
                current ? 'border-slate-200 text-slate-900'                   :
                          'border-slate-200 text-slate-600'
              }`}
              style={current ? { borderColor: `${info.color}40`, color: info.color } : {}}
              disabled={i > step}
            >
              {done ? <Check size={10} /> : <span>{info.icon}</span>}
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Questions de la dimension courante */}
      <div className="space-y-5">
        <div className="mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: dimInfo.color }}>
            {dimInfo.label}
          </p>
        </div>

        {dimQuestions.map((q) => {
          const selected = responses[q.id];
          return (
            <div key={q.id} className="card space-y-4">
              <p className="text-slate-900 text-sm leading-relaxed">{q.text}</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => handleRate(q.id, v)}
                    className={`flex-1 min-w-[3.5rem] py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      selected === v
                        ? 'text-slate-900 border-transparent'
                        : 'border-slate-200 text-slate-500 hover:border-slate-200 hover:text-slate-600'
                    }`}
                    style={selected === v ? { backgroundColor: `${RATING_COLORS[v]}20`, borderColor: RATING_COLORS[v], color: RATING_COLORS[v] } : {}}
                  >
                    {v}
                    <span className="block text-[9px] font-normal mt-0.5 opacity-70">{RATING_LABELS[v]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Erreur */}
      {error && (
        <p className="mt-4 text-rose-400 text-xs text-center">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={14} />
            Retour
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!dimComplete || loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: dimComplete ? dimInfo.color : undefined,
            color:           dimComplete ? '#000' : undefined,
            border:          dimComplete ? 'none' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : step < DIM_ORDER.length - 1 ? (
            <>Suivant <ChevronRight size={14} /></>
          ) : (
            <>Soumettre <Check size={14} /></>
          )}
        </button>
      </div>
    </div>
  );
}
