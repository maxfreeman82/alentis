'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { TDT_DIMENSIONS, RATING_LABELS } from '@/lib/tour-de-table/dimensions';
import type { TdtDimension } from '@/lib/tour-de-table/dimensions';

interface ObservedProfile { id: string; first_name: string | null; last_name: string | null; }

interface Props {
  sessionId:   string;
  observed:    ObservedProfile;
  totalPeople: number;  // nb total de personnes à observer
  current:     number;  // position courante (1-based)
  onComplete:  () => void;
}

export default function ObservationForm({ sessionId, observed, totalPeople, current, onComplete }: Props) {
  const router  = useRouter();
  const [step,      setStep]      = useState(0); // index dans TDT_DIMENSIONS
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const dim       = TDT_DIMENSIONS[step];
  if (!dim) return null;

  const progress  = Math.round((step / TDT_DIMENSIONS.length) * 100);
  const isLast    = step === TDT_DIMENSIONS.length - 1;
  const dimDone   = dim.items.every(item => responses[item.key] != null);
  const allDone   = TDT_DIMENSIONS.every(d => d.items.every(i => responses[i.key] != null));

  function rate(key: string, val: number) {
    setResponses(prev => ({ ...prev, [key]: val }));
  }

  async function submit() {
    if (!allDone) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/tour-de-table/observe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id: sessionId, observed_id: observed.id, responses }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Erreur lors de la soumission');
      setLoading(false);
      return;
    }

    onComplete();
  }

  return (
    <div className="space-y-5">
      {/* Qui on observe */}
      <div className="text-center space-y-1">
        <p className="text-slate-500 text-xs">{current} sur {totalPeople}</p>
        <p className="text-white font-display text-lg">
          {observed.first_name} {observed.last_name}
        </p>
        <p className="text-slate-500 text-xs">Répondez selon vos observations réelles, pas selon ce que vous aimeriez voir.</p>
      </div>

      {/* Progression globale */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Dimension {step + 1}/{TDT_DIMENSIONS.length} — {dim.label}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 bg-bg-card rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: dim.color }} />
        </div>
        {/* Pastilles dimensions */}
        <div className="flex gap-1 justify-center">
          {TDT_DIMENSIONS.map((d, i) => {
            const done = d.items.every(item => responses[item.key] != null);
            return (
              <button key={d.id} onClick={() => setStep(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{ backgroundColor: done ? d.color : i === step ? `${d.color}40` : 'rgba(255,255,255,0.08)' }} />
            );
          })}
        </div>
      </div>

      {/* Questions de la dimension */}
      <DimensionCard dimension={dim} responses={responses} onRate={rate} />

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10 text-sm transition-all">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {!isLast ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!dimDone}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              dimDone ? 'text-white hover:opacity-90' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
            }`}
            style={dimDone ? { backgroundColor: dim.color } : {}}>
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={!allDone || loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
              : <><CheckCircle className="w-4 h-4" /> Valider l&apos;observation</>}
          </button>
        )}
      </div>

      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
    </div>
  );
}

function DimensionCard({
  dimension, responses, onRate,
}: {
  dimension:  TdtDimension;
  responses:  Record<string, number>;
  onRate:     (key: string, val: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ borderTop: `3px solid ${dimension.color}` }}>
      <div className="px-5 py-3.5" style={{ backgroundColor: `${dimension.color}08` }}>
        <p className="font-display text-white text-sm">{dimension.label}</p>
        <p className="text-slate-500 text-[11px] mt-0.5">{dimension.description}</p>
      </div>
      <div className="p-4 space-y-6">
        {dimension.items.map(item => {
          const val = responses[item.key];
          return (
            <div key={item.key} className="space-y-2.5">
              <p className="text-slate-300 text-sm leading-relaxed">{item.text}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => onRate(item.key, n)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      val === n
                        ? 'border-current text-white'
                        : 'border-white/[0.04] text-slate-600 hover:border-white/10 hover:text-slate-400'
                    }`}
                    style={val === n ? { borderColor: dimension.color, backgroundColor: `${dimension.color}15`, color: dimension.color } : {}}>
                    <span className="text-base leading-none">{n}</span>
                    <span className="text-[9px] font-normal text-center leading-tight hidden sm:block">
                      {RATING_LABELS[n]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
