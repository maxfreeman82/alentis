'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Compass, CheckCircle, Loader2, LockKeyhole, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VISION_QUESTIONS,
  CATEGORY_LABELS,
  type QuestionCategory,
} from '@/lib/boussole/questions';
import { IntegrityTracker } from '@/components/assessment/IntegrityTracker';

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

type SessionStatus = 'loading' | 'active' | 'completed' | 'expired' | 'error';

export function VisionQuestionnaire() {
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
          body:    JSON.stringify({ assessmentType: 'boussole' }),
        });
        const data = await res.json() as {
          status:        string;
          cannotRetake?: boolean;
          session?:      { id: string; current_index: number; responses: Record<string, string> };
        };
        if (cancelled) return;

        if (data.status === 'completed' || data.cannotRetake) {
          setSessionStatus('completed');
          return;
        }

        const session = data.session;
        if (!session) { setSessionStatus('error'); return; }

        setSessionId(session.id);
        if (Object.keys(session.responses ?? {}).length > 0) {
          setResponses(session.responses);
        }
        if (session.current_index > 0) {
          setCurrentCategoryIndex(Math.min(session.current_index, CATEGORIES.length - 1));
        }
        setSessionStatus('active');
      } catch {
        if (!cancelled) setSessionStatus('error');
      }
    }
    void initSession();
    return () => { cancelled = true; };
  }, []);

  // ── État questionnaire ─────────────────────────────────────────────────────
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [responses,  setResponses]  = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const currentCategory  = CATEGORIES[currentCategoryIndex]!;
  const categoryQuestions = VISION_QUESTIONS.filter((q) => q.category === currentCategory);
  const categoryColor    = CATEGORY_COLORS[currentCategory];

  const answeredInCategory = categoryQuestions.filter((q) => responses[q.id]).length;
  const categoryComplete   = answeredInCategory === categoryQuestions.length;

  const totalAnswered  = Object.keys(responses).length;
  const totalQuestions = VISION_QUESTIONS.length;
  const globalProgress = Math.round((totalAnswered / totalQuestions) * 100);
  const isLastCategory = currentCategoryIndex === CATEGORIES.length - 1;

  function selectOption(questionId: string, value: string) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function goNext() {
    if (!categoryComplete || !sessionId) return;

    // Avancer l'index côté serveur (verrouillage retour arrière)
    void fetch('/api/assessment/session/answer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, question_id: '_nav', time_ms: 0, focus_lost: 0, nextIndex: currentCategoryIndex + 1 }),
    });

    if (currentCategoryIndex < CATEGORIES.length - 1) {
      setCurrentCategoryIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit() {
    if (totalAnswered < totalQuestions || !sessionId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Finaliser la session d'intégrité (comportemental uniquement pour le boussole)
      await fetch('/api/assessment/session/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, responses }),
      });

      // 2. Classifier l'archétype
      const res = await fetch('/api/boussole/classify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ responses }),
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

  // ── États spéciaux ─────────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 size={22} className="animate-spin text-violet mx-auto" />
          <p className="text-slate-400 text-sm">Préparation de votre session…</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'completed') {
    return (
      <div className="card border-l-4 border-l-emerald py-10 text-center space-y-3">
        <LockKeyhole size={26} className="text-emerald mx-auto" />
        <p className="text-slate-900 font-semibold">Boussole déjà complétée cette année</p>
        <p className="text-slate-400 text-sm">Vous avez déjà soumis votre Boussole Vision pour ce cycle annuel.</p>
        <a href="/boussole/archetype" className="inline-block text-violet text-sm hover:underline">
          Voir mon archétype →
        </a>
      </div>
    );
  }

  if (sessionStatus === 'expired') {
    return (
      <div className="card border-l-4 border-l-amber py-10 text-center space-y-3">
        <AlertTriangle size={26} className="text-amber mx-auto" />
        <p className="text-slate-900 font-semibold">Session expirée</p>
        <p className="text-slate-400 text-sm">Votre session d'1 heure a expiré. Contactez un administrateur.</p>
      </div>
    );
  }

  if (sessionStatus === 'error') {
    return (
      <div className="card border-l-4 border-l-rose py-10 text-center">
        <p className="text-rose text-sm">Impossible d'initialiser la session. Rechargez la page.</p>
      </div>
    );
  }

  // ── Questionnaire principal ────────────────────────────────────────────────

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

        {/* Onglets catégories — en lecture seule pour les catégories passées */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {CATEGORIES.map((cat, i) => {
            const questions = VISION_QUESTIONS.filter((q) => q.category === cat);
            const answered  = questions.filter((q) => responses[q.id]).length;
            const complete  = answered === questions.length;
            const active    = i === currentCategoryIndex;
            const isPast    = i < currentCategoryIndex;

            return (
              <div
                key={cat}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  active
                    ? 'text-slate-900'
                    : isPast
                      ? 'text-emerald bg-emerald/5 cursor-default'
                      : 'text-slate-400 bg-bg-surface cursor-default'
                )}
                style={active ? { backgroundColor: `${CATEGORY_COLORS[cat]}20`, color: CATEGORY_COLORS[cat], border: `1px solid ${CATEGORY_COLORS[cat]}40` } : {}}
              >
                {complete && <CheckCircle size={12} />}
                {CATEGORY_LABELS[cat]}
                <span className="font-mono text-[10px] opacity-70">{answered}/{questions.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* En-tête catégorie */}
      <div className="card border-l-4" style={{ borderLeftColor: categoryColor }}>
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
              {/* Tracker invisible */}
              {sessionId && (
                <IntegrityTracker
                  questionId={question.id}
                  sessionId={sessionId}
                  answer={selected ?? null}
                />
              )}

              <p className="text-slate-900 text-sm font-medium mb-4">
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
                          ? 'text-slate-900 font-medium'
                          : 'border-slate-200 text-slate-600 hover:border-slate-200 hover:bg-bg-surface'
                      )}
                      style={isSelected ? {
                        backgroundColor: `${categoryColor}15`,
                        borderColor:     `${categoryColor}50`,
                        color:           '#F1F5F9',
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

      {error && (
        <div className="card border-l-4 border-l-rose text-rose text-sm">{error}</div>
      )}

      {/* Navigation — PAS de bouton Précédent (anti-triche : verrouillage retour arrière) */}
      <div className="flex justify-end items-center pt-2 pb-8">
        {isLastCategory ? (
          <button
            onClick={handleSubmit}
            disabled={totalAnswered < totalQuestions || isSubmitting || !sessionId}
            className={cn(
              'flex items-center gap-2 btn-primary px-6 py-2.5',
              (totalAnswered < totalQuestions || isSubmitting) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" />Analyse en cours…</>
            ) : (
              <><Compass size={16} />Découvrir mon archétype</>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!categoryComplete || !sessionId}
            className={cn(
              'flex items-center gap-2 btn-primary px-5 py-2',
              !categoryComplete && 'opacity-50 cursor-not-allowed'
            )}
          >
            Suivant <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
