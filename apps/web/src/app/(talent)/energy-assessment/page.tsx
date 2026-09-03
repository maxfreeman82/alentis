'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// ─── Types — reflètent exactement la forme renvoyée par les routes API
// /api/energy-assessment/start et /api/energy-assessment/answer (jamais
// energy_signals, jamais de mapping option → énergie, jamais de pourcentage). ─

interface QuestionOption {
  key: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  format: 'forced_choice' | 'arbitration';
  options: QuestionOption[];
}

interface EnergySkill {
  code: string;
  name: string;
  definition: string;
}

interface FinalProfile {
  dominant: EnergySkill;
  secondary: EnergySkill[];
  interpretation: string;
}

// Les deux routes renvoient `error` en string dans le cas nominal, mais un
// échec de validation Zod (parsed.error.flatten()) renvoie un objet — jamais
// attendu dans le flux normal de cette page (les payloads envoyés sont
// toujours bien formés), mais on s'en protège pour ne jamais tenter de
// rendre un objet comme enfant React.
type ApiError = string | Record<string, unknown>;

interface StartResponse {
  assessmentId?: string;
  question?: Question;
  error?: ApiError;
}

interface AnswerResponse {
  done?: boolean;
  question?: Question;
  profile?: FinalProfile;
  error?: ApiError;
}

function errorMessage(err: ApiError | undefined, fallback: string): string {
  return typeof err === 'string' && err.length > 0 ? err : fallback;
}

export default function EnergyAssessmentPage() {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [profile, setProfile] = useState<FinalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        return;
      }
      if (json.question) setQuestion(json.question);
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-xs mb-4">
          {error}
        </div>
      )}

      {/* État 1 : démarrage */}
      {!assessmentId && !profile && (
        <div className="text-center py-12">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">Energy Assessment</p>
          <h1 className="font-display text-slate-900 text-2xl mb-4">Découvrez votre profil d&apos;énergie</h1>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            Une série de mises en situation pour comprendre votre façon naturelle d&apos;agir.
          </p>
          <button
            onClick={start}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-emerald text-white py-3.5 px-6 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Démarrage…' : 'Commencer'}
          </button>
        </div>
      )}

      {/* État 2 : question en cours */}
      {question && (
        <div className="bg-card border border-slate-200 rounded-xl p-6">
          <p className="text-slate-900 text-sm mb-5">{question.text}</p>
          <div className="space-y-2">
            {question.options.map(opt => (
              <button
                key={opt.key}
                onClick={() => answer(opt.key)}
                disabled={loading}
                className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 hover:border-emerald/50 disabled:opacity-50 transition-colors"
              >
                {opt.text}
              </button>
            ))}
          </div>
          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mt-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Question suivante…
            </div>
          )}
        </div>
      )}

      {/* État 3 : écran final — dominante/influences uniquement, jamais de pourcentage */}
      {profile && (
        <div className="text-center py-12">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">Votre profil</p>
          <h1 className="font-display text-slate-900 text-2xl mb-2">{profile.dominant.name}</h1>
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
