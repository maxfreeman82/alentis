'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface QuestionOption { key: string; text: string; }
interface Question { id: string; text: string; format: 'forced_choice' | 'arbitration'; options: QuestionOption[]; }
export interface EnergySkill { code: string; name: string; definition: string; }
export interface FinalProfile { dominant: EnergySkill; secondary: EnergySkill[]; interpretation: string; }
type ApiError = string | Record<string, unknown>;
interface StartResponse { assessmentId?: string; question?: Question; error?: ApiError; }
interface AnswerResponse { done?: boolean; question?: Question; profile?: FinalProfile; error?: ApiError; }

function errorMessage(err: ApiError | undefined, fallback: string): string {
  return typeof err === 'string' && err.length > 0 ? err : fallback;
}

interface Props {
  onComplete: (profile: FinalProfile) => void;
  initialProfile?: FinalProfile | null;
}

export default function EnergyStepAdaptive({ onComplete, initialProfile }: Props) {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [profile, setProfile] = useState<FinalProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAnswerKey, setLastAnswerKey] = useState<string | null>(null);

  function resetToStart() {
    setAssessmentId(null);
    setQuestion(null);
    setProfile(null);
    setError('');
    setLastAnswerKey(null);
  }

  async function start() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/energy-assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentRoute: 'exploration', contextSnapshot: {} }),
      });
      const json = await res.json() as StartResponse;
      if (!res.ok || !json.assessmentId || !json.question) {
        setError(errorMessage(json.error, "Impossible de démarrer l'assessment."));
        return;
      }
      setAssessmentId(json.assessmentId);
      setQuestion(json.question);
      setLastAnswerKey(null);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  async function answer(answerKey: string) {
    if (!assessmentId || !question) return;
    setLoading(true);
    setError('');
    setLastAnswerKey(answerKey);
    try {
      const res = await fetch('/api/energy-assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, questionId: question.id, answerKey }),
      });
      const json = await res.json() as AnswerResponse;
      if (!res.ok) {
        setError(errorMessage(json.error, 'Une erreur est survenue.'));
        return;
      }
      if (json.done && json.profile) {
        setProfile(json.profile);
        setQuestion(null);
        setLastAnswerKey(null);
        onComplete(json.profile);
        return;
      }
      if (json.question) {
        setQuestion(json.question);
        setLastAnswerKey(null);
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs mb-4">
          <p>{error}</p>
          {assessmentId && (
            <button onClick={resetToStart} className="mt-2 underline font-semibold hover:text-rose-300 transition-colors">
              Recommencer
            </button>
          )}
        </div>
      )}

      {!assessmentId && !profile && (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Une série de mises en situation pour comprendre votre façon naturelle d&apos;agir — pas de bonne ou mauvaise réponse.
          </p>
          <button onClick={start} disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-emerald text-white py-3.5 px-6 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Démarrage…' : 'Commencer'}
          </button>
        </div>
      )}

      {question && (
        <div>
          <p className="text-slate-900 text-sm mb-5">{question.text}</p>
          <div className="space-y-2">
            {question.options.map(opt => (
              <button key={opt.key} onClick={() => answer(opt.key)} disabled={loading}
                className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 hover:border-emerald/50 disabled:opacity-50 transition-colors">
                {opt.text}
              </button>
            ))}
          </div>

          {error && lastAnswerKey && (
            <button onClick={() => answer(lastAnswerKey)} disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald/10 border border-emerald/30 text-emerald rounded-xl px-4 py-3 text-sm font-semibold hover:bg-emerald/20 disabled:opacity-50 transition-colors">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Réessayer
            </button>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mt-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Question suivante…
            </div>
          )}
        </div>
      )}

      {profile && (
        <div className="text-center py-8">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">Votre profil</p>
          <h3 className="font-display text-slate-900 text-xl mb-2">{profile.dominant.name}</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">{profile.dominant.definition}</p>
          {profile.secondary.length > 0 && (
            <p className="text-slate-600 text-xs mb-4">
              Influence(s) : {profile.secondary.map(s => s.name).join(', ')}
            </p>
          )}
          <p className="text-slate-600 text-xs max-w-sm mx-auto">{profile.interpretation}</p>
        </div>
      )}
    </div>
  );
}
