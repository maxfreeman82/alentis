'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { PULSE_QUESTIONS, DIMENSIONS } from '@/lib/vision-pulse/survey';
import type { PulseDimension } from '@/lib/vision-pulse/survey';

interface Props {
  organizationId: string;
  quarter: number;
  year: number;
}

const DIM_ORDER: PulseDimension[] = ['knowledge', 'credibility', 'connection', 'capability', 'projection'];
const LABELS = ['Pas du tout', 'Plutôt non', 'Neutre', 'Plutôt oui', 'Tout à fait'];

export default function PulseSurvey({ organizationId, quarter, year }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0); // index de dimension active
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dim = DIM_ORDER[step] as PulseDimension;
  const dimConfig = DIMENSIONS[dim];
  const dimQuestions = PULSE_QUESTIONS.filter(q => q.dimension === dim);
  const totalSteps = DIM_ORDER.length;

  const dimAnswered = dimQuestions.every(q => responses[q.id] !== undefined);
  const totalAnswered = PULSE_QUESTIONS.every(q => responses[q.id] !== undefined);

  function setResponse(questionId: string, value: number) {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/vision-pulse/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, quarter, year, responses }),
      });
      if (!res.ok) throw new Error('Erreur lors de la soumission');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 gap-6 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-400" />
        <div>
          <h2 className="font-display text-2xl text-white mb-2">Merci pour votre réponse !</h2>
          <p className="text-slate-400">Votre contribution compte pour améliorer l&apos;alignement de l&apos;organisation.</p>
        </div>
        <button
          onClick={() => router.push('/vision-pulse')}
          className="btn-primary"
        >
          Voir les résultats
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Barre de progression */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Dimension {step + 1} sur {totalSteps}</span>
          <span className="text-slate-400">{Math.round(((step) / totalSteps) * 100)}% complété</span>
        </div>
        <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((step) / totalSteps) * 100}%` }}
          />
        </div>
        {/* Indicateurs de dimensions */}
        <div className="flex gap-2 pt-1">
          {DIM_ORDER.map((d, i) => (
            <button
              key={d}
              onClick={() => i < step || DIM_ORDER.slice(0, i).every(prev => PULSE_QUESTIONS.filter(q => q.dimension === prev).every(q => responses[q.id] !== undefined)) ? setStep(i) : null}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i < step ? 'bg-emerald-500' : i === step ? 'bg-violet-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card dimension */}
      <div className="card space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{dimConfig?.icon}</span>
          <div>
            <p className="section-tag" style={{ color: dimConfig?.color }}>{dimConfig?.label}</p>
            <p className="text-slate-400 text-sm">
              {dim === 'knowledge'   && 'Dans quelle mesure comprenez-vous où va votre organisation ?'}
              {dim === 'credibility' && 'Faites-vous confiance à la direction pour mener l\'organisation ?'}
              {dim === 'connection'  && 'Vous sentez-vous appartenir et fier(e) de votre organisation ?'}
              {dim === 'capability'  && 'Avez-vous les moyens de bien faire votre travail ?'}
              {dim === 'projection'  && 'Vous voyez-vous évoluer et rester dans cette organisation ?'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {dimQuestions.map((q, qi) => (
            <div key={q.id} className="space-y-3">
              <p className="text-white text-sm leading-relaxed">
                <span className="text-slate-500 mr-2">{qi + 1}.</span>
                {q.text}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setResponse(q.id, v)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs ${
                      responses[q.id] === v
                        ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                        : 'border-slate-700 bg-bg-card text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-bold text-sm">{v}</span>
                    <span className="hidden sm:block text-center leading-tight">
                      {LABELS[v - 1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-rose-400 text-sm text-center">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="btn-secondary flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
        )}
        <div className="flex-1" />
        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!dimAnswered}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!totalAnswered || submitting}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi…' : 'Soumettre mon avis'}
          </button>
        )}
      </div>
    </div>
  );
}
