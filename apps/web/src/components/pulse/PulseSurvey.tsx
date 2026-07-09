'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check, Loader2, LockKeyhole, AlertTriangle } from 'lucide-react';
import { PULSE_QUESTIONS, DIMENSIONS } from '@/lib/vision-pulse/survey';
import type { PulseDimension } from '@/lib/vision-pulse/survey';
import { IntegrityTracker } from '@/components/assessment/IntegrityTracker';

interface PulseSurveyProps {
  visionStatement?: string | null;
  quarter:          number;
  year:             number;
  organizationId:   string;
}

const DIM_ORDER: PulseDimension[] = ['knowledge', 'credibility', 'connection', 'capability', 'projection'];

const RATING_LABELS: Record<number, string> = {
  1: 'Jamais', 2: 'Rarement', 3: 'Parfois', 4: 'Souvent', 5: 'Toujours',
};
const RATING_COLORS: Record<number, string> = {
  1: '#F43F5E', 2: '#F97316', 3: '#F59E0B', 4: '#0EA5E9', 5: '#10B981',
};

type SessionStatus = 'loading' | 'active' | 'completed' | 'expired' | 'error';

export function PulseSurvey({ visionStatement, quarter, year, organizationId }: PulseSurveyProps) {
  const router = useRouter();

  // ── Session anti-triche ───────────────────────────────────────────────────
  const [sessionId,     setSessionId]     = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    async function initSession() {
      try {
        const res  = await fetch('/api/assessment/session/start', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ assessmentType: 'vision_pulse', organizationId }),
        });
        const data = await res.json() as {
          status:        string;
          cannotRetake?: boolean;
          session?:      { id: string; current_index: number; responses: Record<string, number> };
        };
        if (cancelled) return;

        if (data.status === 'completed' || data.cannotRetake) {
          setSessionStatus('completed');
          return;
        }

        const session = data.session;
        if (!session) { setSessionStatus('error'); return; }

        setSessionId(session.id);
        // Reprendre les réponses et l'étape sauvegardées
        if (Object.keys(session.responses ?? {}).length > 0) {
          setResponses(session.responses);
        }
        if (session.current_index > 0) {
          setStep(Math.min(session.current_index, DIM_ORDER.length - 1));
        }
        setSessionStatus('active');
      } catch {
        if (!cancelled) setSessionStatus('error');
      }
    }
    void initSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  // ── État questionnaire ─────────────────────────────────────────────────────
  const [step,      setStep]      = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const currentDim   = DIM_ORDER[step] ?? 'knowledge';
  const dimInfo      = DIMENSIONS[currentDim];
  const dimQuestions = PULSE_QUESTIONS.filter(q => q.dimension === currentDim);
  const dimComplete  = dimQuestions.every(q => responses[q.id] !== undefined);

  const totalAnswered = Object.keys(responses).length;
  const progress      = Math.round((totalAnswered / PULSE_QUESTIONS.length) * 100);

  function handleRate(questionId: string, value: number) {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleNext() {
    if (!dimComplete || !sessionId) return;

    // Sauvegarder l'index avancé côté serveur (lock-back)
    void fetch('/api/assessment/session/answer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, question_id: '_nav', time_ms: 0, focus_lost: 0, nextIndex: step + 1 }),
    });

    if (step < DIM_ORDER.length - 1) {
      setStep(s => s + 1);
      return;
    }

    // Dernière dimension — soumettre
    setLoading(true);
    setError(null);
    try {
      // 1. Enregistrer l'intégrité de la session
      await fetch('/api/assessment/session/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, responses }),
      });

      // 2. Soumettre les réponses au Vision Pulse
      const res = await fetch('/api/vision-pulse/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ organizationId, quarter, year, responses }),
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

  // ── États spéciaux ─────────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="max-w-lg mx-auto flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 size={22} className="animate-spin text-violet mx-auto" />
          <p className="text-slate-400 text-sm">Préparation de votre session…</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'completed') {
    return (
      <div className="max-w-lg mx-auto card border-l-4 border-l-emerald py-10 text-center space-y-3">
        <LockKeyhole size={26} className="text-emerald mx-auto" />
        <p className="text-slate-900 font-semibold">Pulse déjà soumis ce trimestre</p>
        <p className="text-slate-400 text-sm">Vous avez déjà répondu au Vision Pulse pour Q{quarter} {year}.</p>
        <a href="/boussole/pulse" className="inline-block text-violet text-sm hover:underline">
          Voir les résultats →
        </a>
      </div>
    );
  }

  if (sessionStatus === 'expired') {
    return (
      <div className="max-w-lg mx-auto card border-l-4 border-l-amber py-10 text-center space-y-3">
        <AlertTriangle size={26} className="text-amber mx-auto" />
        <p className="text-slate-900 font-semibold">Session expirée</p>
        <p className="text-slate-400 text-sm">Votre session de 45 minutes a expiré. Contactez votre référent.</p>
      </div>
    );
  }

  if (sessionStatus === 'error') {
    return (
      <div className="max-w-lg mx-auto card border-l-4 border-l-rose py-10 text-center">
        <p className="text-rose text-sm">Impossible d'initialiser la session. Rechargez la page.</p>
      </div>
    );
  }

  // ── Questionnaire principal ────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      {/* Vision context */}
      {visionStatement && (
        <div className="mb-6 p-4 rounded-xl bg-emerald/5 border border-emerald/15">
          <p className="text-xs text-emerald font-semibold uppercase tracking-widest mb-1">VISION ORGANISATION</p>
          <p className="text-slate-600 text-sm italic leading-relaxed">{visionStatement}</p>
        </div>
      )}

      {/* Barre de progression */}
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

      {/* Pastilles dimensions — lecture seule (pas de retour arrière) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {DIM_ORDER.map((d, i) => {
          const info    = DIMENSIONS[d];
          const done    = i < step || (i === step && dimComplete);
          const current = i === step;
          return (
            <div
              key={d}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                done    ? 'bg-emerald/10 border-emerald/20 text-emerald' :
                current ? 'border-slate-200 text-slate-900'              :
                          'border-slate-200 text-slate-400'
              }`}
              style={current ? { borderColor: `${info.color}40`, color: info.color } : {}}
            >
              {done ? <Check size={10} /> : <span>{info.icon}</span>}
              {info.label}
            </div>
          );
        })}
      </div>

      {/* Questions de la dimension courante */}
      <div className="space-y-5">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: dimInfo.color }}>
          {dimInfo.label}
        </p>

        {dimQuestions.map((q) => {
          const selected = responses[q.id];
          return (
            <div key={q.id} className="card space-y-4">
              {/* Tracker invisible */}
              {sessionId && (
                <IntegrityTracker
                  questionId={q.id}
                  sessionId={sessionId}
                  answer={selected ?? null}
                />
              )}
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

      {error && <p className="mt-4 text-rose-400 text-xs text-center">{error}</p>}

      {/* Navigation — PAS de bouton Retour (anti-triche) */}
      <div className="mt-6">
        <button
          onClick={handleNext}
          disabled={!dimComplete || loading || !sessionId}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
