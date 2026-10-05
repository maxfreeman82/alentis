'use client';

import { useRef, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { STEP_CONFIGS, type StepId } from '@teranga/talent-assessment';

interface Option { key: string; text: string; }
interface Question { id: string; text: string; options: Option[]; }
interface ApiResponse { sessionId?: string; question?: Question; done?: boolean; error?: unknown; }

interface Props {
  step:          StepId;
  color:         string;
  initiallyDone: boolean;
  onComplete:    () => void;
}

// Dernière action réseau, rejouée telle quelle par « Réessayer » (le chemin
// retry de /answer est idempotent pour une même réponse).
type PendingAction = { kind: 'start' } | { kind: 'answer'; key: string; responseMs: number };

const INTROS: Record<'situational' | 'behavioral' | 'knowledge', string> = {
  knowledge:   'Questions techniques sur les compétences de votre CV, avec une seule bonne réponse. Répondez sans aide extérieure : le temps de réponse est pris en compte.',
  situational: 'Vous allez découvrir des situations professionnelles. Pour chacune, choisissez la réaction la plus proche de ce que vous feriez réellement.',
  behavioral:  'Ces questions portent sur des faits concrets de vos dernières semaines (ou de votre dernière expérience). Il n’y a pas de bonne réponse : répondez au plus près de la réalité.',
};

function errorText(json: ApiResponse, fallback: string): string {
  return typeof json.error === 'string' && json.error ? json.error : fallback;
}

export default function AdaptiveStep({ step, color, initiallyDone, onComplete }: Props) {
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [question, setQuestion]     = useState<Question | null>(null);
  const [done, setDone]             = useState(initiallyDone);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [count, setCount]           = useState(0);
  const [lastAction, setLastAction] = useState<PendingAction | null>(null);
  const shownAt = useRef<number>(0);
  const config  = STEP_CONFIGS[step];

  async function call(action: PendingAction) {
    setLoading(true);
    setError('');
    setLastAction(action);
    try {
      const res = action.kind === 'start'
        ? await fetch('/api/talent-assessment/start', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step }),
          })
        : await fetch('/api/talent-assessment/answer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, questionId: question?.id, answerKey: action.key, responseMs: action.responseMs }),
          });
      const json = await res.json().catch(() => ({})) as ApiResponse;
      if (!res.ok) { setError(errorText(json, 'Une erreur est survenue.')); return; }

      if (json.sessionId) setSessionId(json.sessionId);
      if (action.kind === 'answer') setCount(c => c + 1);
      if (json.done) { setDone(true); setQuestion(null); onComplete(); return; }
      if (json.question) { setQuestion(json.question); shownAt.current = Date.now(); }
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  function answer(key: string) {
    if (loading) return;
    void call({ kind: 'answer', key, responseMs: Date.now() - shownAt.current });
  }

  if (done) return (
    <div className="text-center py-10 space-y-3">
      <CheckCircle className="w-12 h-12 mx-auto" style={{ color }} />
      <p className="text-slate-900 font-semibold">Étape terminée</p>
      <p className="text-slate-500 text-sm">Vos réponses sont enregistrées. Passez à l&apos;étape suivante.</p>
    </div>
  );

  if (!question && !error) return (
    <div className="text-center py-8 space-y-4">
      <p className="text-slate-700 text-sm max-w-md mx-auto leading-relaxed">
        {INTROS[config.questionStyle]} Les questions s&apos;adaptent à vos réponses.
      </p>
      <p className="text-slate-500 text-xs">
        Une question à la fois · pas de retour en arrière ·{' '}
        {config.questionStyle === 'knowledge'
          ? '2 à 3 questions par compétence, difficulté adaptée'
          : `${config.minQuestions} à ${config.maxQuestions} questions`}
      </p>
      <button type="button" onClick={() => void call({ kind: 'start' })} disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: color }}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Préparation de la question…' : 'Commencer'}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {question && (
        <>
          <p className="text-xs text-slate-500">Question {count + 1}</p>
          <p className="text-slate-900 text-base leading-relaxed">{question.text}</p>
          <div className="grid grid-cols-1 gap-2">
            {question.options.map(opt => (
              <button key={opt.key} type="button" onClick={() => answer(opt.key)} disabled={loading}
                data-testid="adaptive-option"
                className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-wait"
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}>
                {opt.text}
              </button>
            ))}
          </div>
          {loading && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Préparation de la question suivante…
            </p>
          )}
        </>
      )}

      {error && (
        <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl px-4 py-3 text-sm text-rose-500 flex items-center justify-between gap-3">
          <span>{error}</span>
          {lastAction && (
            <button type="button" onClick={() => void call(lastAction)} disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-rose-500/30 text-xs font-medium hover:bg-rose-500/10">
              Réessayer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
