'use client';

import { useEffect, useRef } from 'react';

interface IntegrityTrackerProps {
  questionId: string;    // ID de la question actuellement affichée
  sessionId:  string;    // ID de la session (pour l'API)
  answer:     number | string | null;  // null = pas encore répondu
}

/**
 * Composant invisible — ne rend rien à l'écran.
 * Mesure le temps de réponse et les pertes de focus par question.
 * Dès que `answer` passe de null à une valeur, il enregistre le timing.
 * Le candidat ne sait pas que ce composant existe.
 *
 * Usage : placer à côté de chaque question, passer la réponse en cours.
 * <IntegrityTracker questionId="P1" sessionId={sessionId} answer={responses['P1'] ?? null} />
 */
export function IntegrityTracker({ questionId, sessionId, answer }: IntegrityTrackerProps) {
  const startRef     = useRef<number>(Date.now());
  const focusLostRef = useRef<number>(0);
  const recordedRef  = useRef<Set<string>>(new Set());

  // Réinitialiser le chrono quand la question change
  useEffect(() => {
    startRef.current     = Date.now();
    focusLostRef.current = 0;
  }, [questionId]);

  // Écouter les pertes de focus (changement d'onglet, minimisation de fenêtre)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) focusLostRef.current += 1;
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Enregistrer dès que la réponse arrive pour la première fois sur cette question
  useEffect(() => {
    if (answer === null) return;
    if (recordedRef.current.has(questionId)) return;
    recordedRef.current.add(questionId);

    const payload = {
      sessionId,
      question_id: questionId,
      time_ms:     Math.max(0, Date.now() - startRef.current),
      focus_lost:  focusLostRef.current,
    };

    // Fire-and-forget — ne bloque pas le flux du questionnaire
    void fetch('/api/assessment/session/answer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  }, [answer, questionId, sessionId]);

  return null;
}
