'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  EVAL_QUESTIONS,
  DIMENSIONS,
  type EvaluatorRole,
  type EvalDimension,
} from '@/lib/performance/evaluation';
import { cn } from '@/lib/utils';

const DIM_ORDER: EvalDimension[] = ['results', 'collaboration', 'growth', 'alignment', 'energy'];

const SCORE_LABELS = ['', 'Insuffisant', 'En dessous', 'Satisfaisant', 'Bien', 'Excellent'];

interface Props {
  organizationId: string;
  profileId:      string;
  evaluatorId:    string;
  evaluatorRole:  EvaluatorRole;
  targetName:     string;
  quarter:        number;
  year:           number;
}

export function EvaluationForm({
  organizationId, profileId, evaluatorId, evaluatorRole, targetName, quarter, year,
}: Props) {
  const router = useRouter();
  const [scores,   setScores]   = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [section,  setSection]  = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]   = useState<string | undefined>(undefined);

  // Filtre les questions selon le rôle de l'évaluateur
  const relevantQuestions = EVAL_QUESTIONS.filter((q) => q.forRoles.includes(evaluatorRole));
  const byDim = DIM_ORDER.map((dim) => ({
    dim,
    meta: DIMENSIONS[dim],
    questions: relevantQuestions.filter((q) => q.dimension === dim),
  })).filter((s) => s.questions.length > 0);

  const currentSection = byDim[section];
  const totalSections  = byDim.length;
  const progress       = Math.round((section / totalSections) * 100);

  const allAnswered = currentSection
    ? currentSection.questions.every((q) => scores[q.id] !== undefined)
    : false;

  const handleScore = useCallback((qId: string, val: number) => {
    setScores((prev) => ({ ...prev, [qId]: val }));
  }, []);

  const handleComment = useCallback((qId: string, val: string) => {
    setComments((prev) => ({ ...prev, [qId]: val }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(undefined);

    const responses = relevantQuestions.map((q) => ({
      questionId: q.id,
      score:      scores[q.id] ?? 3,
      ...(comments[q.id] ? { comment: comments[q.id] } : {}),
    }));

    try {
      const res = await fetch('/api/performance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId, profileId, evaluatorId, evaluatorRole, quarter, year, responses,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? 'Erreur inattendue');
        return;
      }

      router.push(`/performance/results/${profileId}?q=${quarter}&y=${year}`);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = section === totalSections - 1;

  if (!currentSection) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progression */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400">
            {currentSection.meta?.label} · {section + 1}/{totalSections}
          </span>
          <span className="font-mono text-xs text-slate-400">{progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: currentSection.meta?.color ?? '#10B981' }}
          />
        </div>
      </div>

      {/* En-tête section */}
      <div
        className="card border-l-4 !py-3"
        style={{ borderLeftColor: currentSection.meta?.color ?? '#10B981' }}
      >
        <p className="section-tag mb-0.5" style={{ color: currentSection.meta?.color }}>
          ÉVALUATION 360° · {evaluatorRole === 'self' ? 'AUTO-ÉVALUATION' : evaluatorRole === 'manager' ? 'MANAGER' : 'PAIR'}
        </p>
        <h2 className="text-white font-semibold text-lg">{currentSection.meta?.label}</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          {evaluatorRole === 'self' ? 'Votre auto-évaluation' : `Évaluation de ${targetName}`} · Q{quarter} {year}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {currentSection.questions.map((q, idx) => {
          const selected = scores[q.id];
          return (
            <div key={q.id} className="card space-y-3">
              <p className="text-slate-300 text-sm leading-relaxed">
                <span className="text-slate-500 font-mono text-xs mr-2">{idx + 1}.</span>
                {q.text}
              </p>

              {/* Échelle 1-5 */}
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleScore(q.id, val)}
                    title={SCORE_LABELS[val]}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150',
                      'border border-white/[0.06] hover:border-white/[0.15]',
                      selected === val ? 'text-white border-transparent' : 'text-slate-500 bg-bg-surface'
                    )}
                    style={selected === val
                      ? { backgroundColor: currentSection.meta?.color, borderColor: currentSection.meta?.color }
                      : {}
                    }
                  >
                    {val}
                  </button>
                ))}
              </div>
              {selected !== undefined && (
                <p className="text-xs text-slate-500 text-center -mt-1">{SCORE_LABELS[selected]}</p>
              )}

              {/* Commentaire optionnel */}
              <textarea
                placeholder="Commentaire (optionnel)…"
                value={comments[q.id] ?? ''}
                onChange={(e) => handleComment(q.id, e.target.value)}
                rows={2}
                className="w-full bg-bg-surface border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-white/[0.15]"
              />
            </div>
          );
        })}
      </div>

      {error && (
        <div className="card border border-rose/30 bg-rose/5">
          <p className="text-rose text-sm">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => { setSection((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0 }); }}
          disabled={section === 0}
          className="btn-secondary text-sm disabled:opacity-30"
        >
          ← Précédent
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {submitting ? 'Analyse en cours…' : 'Soumettre l\'évaluation'}
          </button>
        ) : (
          <button
            onClick={() => { setSection((s) => s + 1); window.scrollTo({ top: 0 }); }}
            disabled={!allAnswered}
            className="btn-primary text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}
