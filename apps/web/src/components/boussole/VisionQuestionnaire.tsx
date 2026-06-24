'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Compass, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VISION_QUESTIONS,
  CATEGORY_LABELS,
  type QuestionCategory,
} from '@/lib/boussole/questions';

const CATEGORIES: QuestionCategory[] = [
  'ambition', 'croissance', 'culture', 'risque', 'horizon',
];

const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  ambition:   '#F97316',
  croissance: '#10B981',
  culture:    '#8B5CF6',
  risque:     '#F43F5E',
  horizon:    '#0EA5E9',
};

export function VisionQuestionnaire() {
  const router = useRouter();
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCategory = CATEGORIES[currentCategoryIndex]!;
  const categoryQuestions = VISION_QUESTIONS.filter((q) => q.category === currentCategory);
  const categoryColor = CATEGORY_COLORS[currentCategory];

  const answeredInCategory = categoryQuestions.filter((q) => responses[q.id]).length;
  const categoryComplete = answeredInCategory === categoryQuestions.length;

  const totalAnswered = Object.keys(responses).length;
  const totalQuestions = VISION_QUESTIONS.length;
  const globalProgress = Math.round((totalAnswered / totalQuestions) * 100);

  const isLastCategory = currentCategoryIndex === CATEGORIES.length - 1;

  function selectOption(questionId: string, value: string) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function goNext() {
    if (currentCategoryIndex < CATEGORIES.length - 1) {
      setCurrentCategoryIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goPrev() {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit() {
    if (totalAnswered < totalQuestions) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // organizationId — sera injecté depuis le contexte auth réel
      // Pour l'instant on passe une valeur placeholder que l'API validera
      const res = await fetch('/api/boussole/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          organizationId: 'TODO_REPLACE_WITH_REAL_ORG_ID',
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Erreur lors de la classification');
      }

      const result = await res.json() as { archetype: string };
      router.push(`/boussole/archetype?archetype=${result.archetype}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Barre de progression globale */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400 text-xs">Progression globale</span>
          <span className="font-mono text-xs font-bold text-violet">{globalProgress}%</span>
        </div>
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${globalProgress}%`, backgroundColor: '#8B5CF6' }}
          />
        </div>
        {/* Onglets catégories */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {CATEGORIES.map((cat, i) => {
            const questions = VISION_QUESTIONS.filter((q) => q.category === cat);
            const answered = questions.filter((q) => responses[q.id]).length;
            const complete = answered === questions.length;
            const active = i === currentCategoryIndex;

            return (
              <button
                key={cat}
                onClick={() => setCurrentCategoryIndex(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-bg-surface'
                )}
                style={active ? { backgroundColor: `${CATEGORY_COLORS[cat]}20`, color: CATEGORY_COLORS[cat], border: `1px solid ${CATEGORY_COLORS[cat]}40` } : {}}
              >
                {complete && <CheckCircle size={12} />}
                {CATEGORY_LABELS[cat]}
                <span className="font-mono text-[10px] opacity-70">{answered}/{questions.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* En-tête catégorie */}
      <div
        className="card border-l-4"
        style={{ borderLeftColor: categoryColor }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Compass size={14} style={{ color: categoryColor }} />
          <span className="section-tag" style={{ color: categoryColor }}>
            {CATEGORY_LABELS[currentCategory]}
          </span>
        </div>
        <p className="text-slate-400 text-xs">
          {answeredInCategory}/{categoryQuestions.length} questions répondues dans cette section
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {categoryQuestions.map((question, qi) => {
          const selected = responses[question.id];
          return (
            <div key={question.id} className="card animate-slide-up">
              <p className="text-white text-sm font-medium mb-4">
                <span className="font-mono text-xs mr-2" style={{ color: categoryColor }}>
                  {qi + 1}/{categoryQuestions.length}
                </span>
                {question.text}
              </p>
              <div className="space-y-2">
                {question.options.map((option) => {
                  const isSelected = selected === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => selectOption(question.id, option.value)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-150',
                        isSelected
                          ? 'text-white font-medium'
                          : 'border-white/[0.06] text-slate-300 hover:border-white/10 hover:bg-bg-surface'
                      )}
                      style={isSelected ? {
                        backgroundColor: `${categoryColor}15`,
                        borderColor: `${categoryColor}50`,
                        color: '#F1F5F9',
                      } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all',
                            isSelected ? 'border-current' : 'border-slate-600'
                          )}
                          style={isSelected ? { borderColor: categoryColor, backgroundColor: categoryColor } : {}}
                        />
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Erreur */}
      {error && (
        <div className="card border-l-4 border-l-rose text-rose text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2 pb-8">
        <button
          onClick={goPrev}
          disabled={currentCategoryIndex === 0}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
          Précédent
        </button>

        {isLastCategory ? (
          <button
            onClick={handleSubmit}
            disabled={totalAnswered < totalQuestions || isSubmitting}
            className={cn(
              'flex items-center gap-2 btn-primary px-6 py-2.5',
              (totalAnswered < totalQuestions || isSubmitting) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Compass size={16} />
                Découvrir mon archétype
              </>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!categoryComplete}
            className={cn(
              'flex items-center gap-2 btn-primary px-5 py-2',
              !categoryComplete && 'opacity-50 cursor-not-allowed'
            )}
          >
            Suivant
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
