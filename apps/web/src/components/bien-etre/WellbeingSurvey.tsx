'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { WELLBEING_QUESTIONS, WELLBEING_DIMENSIONS } from '@/lib/wellbeing/survey';
import type { WellbeingDimension } from '@/lib/wellbeing/survey';

const DIM_KEYS: WellbeingDimension[] = ['stress', 'balance', 'relations', 'meaning', 'autonomy'];
const SCALE = ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'];

export default function WellbeingSurvey() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [result, setResult]       = useState<{ globalScore: number; label: string; burnoutRisk: number } | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const dim      = DIM_KEYS[step] as WellbeingDimension;
  const dimCfg   = WELLBEING_DIMENSIONS[dim];
  const dimQs    = WELLBEING_QUESTIONS.filter(q => q.dimension === dim);
  const answered = dimQs.every(q => responses[q.id] !== undefined);
  const allDone  = WELLBEING_QUESTIONS.every(q => responses[q.id] !== undefined);

  function set(id: string, v: number) { setResponses(r => ({ ...r, [id]: v })); }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/bien-etre/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });
      if (!res.ok) throw new Error('Erreur lors de la soumission');
      const data = await res.json() as { globalScore: number; label: string; burnoutRisk: number };
      setResult(data);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  if (done && result) {
    const scoreColor = result.globalScore >= 80 ? '#10B981' : result.globalScore >= 65 ? '#0EA5E9' : result.globalScore >= 50 ? '#F59E0B' : '#F43F5E';
    return (
      <div className="card flex flex-col items-center justify-center py-16 gap-6 text-center max-w-md mx-auto">
        <CheckCircle className="w-14 h-14 text-emerald-400" />
        <div>
          <h2 className="font-display text-2xl text-slate-900 mb-1">Merci !</h2>
          <p className="text-slate-400 text-sm">Votre bilan bien-être a été enregistré.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="font-display text-4xl font-bold" style={{ color: scoreColor }}>{result.globalScore}</p>
            <p className="text-slate-400 text-xs mt-1">Score bien-être</p>
          </div>
          <div className="text-center">
            <p className="font-display text-4xl font-bold text-rose-400">{result.burnoutRisk}%</p>
            <p className="text-slate-400 text-xs mt-1">Risque burnout</p>
          </div>
        </div>
        <p className="text-slate-900 font-semibold">{result.label}</p>
        <button onClick={() => router.push('/bien-etre')} className="btn-primary">
          Voir le tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Dimension {step + 1}/{DIM_KEYS.length}</span>
          <span>{Math.round((step / DIM_KEYS.length) * 100)}% complété</span>
        </div>
        <div className="flex gap-1.5">
          {DIM_KEYS.map((d, i) => (
            <div key={d} className="flex-1 h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: i < step ? (WELLBEING_DIMENSIONS[d]?.color ?? '#10B981') : i === step ? '#8B5CF6' : '#1E293B' }} />
          ))}
        </div>
      </div>

      {/* Dimension card */}
      <div className="card space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{dimCfg?.icon}</span>
          <div>
            <p className="section-tag font-semibold" style={{ color: dimCfg?.color }}>{dimCfg?.label}</p>
            <p className="text-slate-400 text-xs">Évaluez votre ressenti ce mois-ci</p>
          </div>
        </div>

        <div className="space-y-7">
          {dimQs.map((q, qi) => (
            <div key={q.id} className="space-y-3">
              <p className="text-slate-900 text-sm leading-relaxed">
                <span className="text-slate-500 mr-2">{qi + 1}.</span>{q.text}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => set(q.id, v)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      responses[q.id] === v
                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                        : 'border-slate-700 bg-bg-card text-slate-500 hover:border-slate-500'
                    }`}>
                    <span className="font-bold">{v}</span>
                    <span className="text-[9px] text-center leading-tight hidden sm:block">{SCALE[v - 1]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {step < DIM_KEYS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!answered}
            className="btn-primary flex items-center gap-2 disabled:opacity-40">
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={!allDone || submitting}
            className="btn-primary disabled:opacity-40">
            {submitting ? 'Envoi…' : 'Valider mon bilan'}
          </button>
        )}
      </div>
    </div>
  );
}
