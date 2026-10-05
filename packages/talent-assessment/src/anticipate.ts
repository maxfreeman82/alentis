import { decideNextStep, type AskDecision } from './engine';
import type { AnsweredItem, StepConfig } from './types';

// Pré-génération : pendant que le candidat lit la question en attente, on
// calcule la décision du moteur pour chaque réponse possible, afin de préparer
// la question suivante à l'avance. Les branches identiques sont fusionnées
// (en exploration, toutes les réponses mènent à la même facette).
export function anticipateNextSteps(
  config: StepConfig,
  answered: AnsweredItem[],
  pending: Pick<AskDecision, 'facet' | 'optionValues' | 'difficulty'>,
  rng: () => number = Math.random,
): AskDecision[] {
  const branches: AskDecision[] = [];
  const seenValues = new Set<number>();
  for (const [key, value] of Object.entries(pending.optionValues)) {
    if (seenValues.has(value)) continue;
    seenValues.add(value);
    const hypothetical: AnsweredItem = {
      facet: pending.facet, optionValues: pending.optionValues,
      candidateAnswer: key, responseMs: null, difficulty: pending.difficulty,
    };
    const decision = decideNextStep(config, [...answered, hypothetical], rng);
    if (decision.action !== 'ask') continue;
    if (!branches.some(b => sameStep(b, decision))) branches.push(decision);
  }
  return branches;
}

// Même question à poser : seules phase, facette et difficulté comptent (les
// valeurs d'options et le décor sont propres à chaque génération).
export function sameStep(
  a: Pick<AskDecision, 'phase' | 'facet' | 'difficulty'>,
  b: Pick<AskDecision, 'phase' | 'facet' | 'difficulty'>,
): boolean {
  return a.phase === b.phase && a.facet === b.facet && (a.difficulty ?? null) === (b.difficulty ?? null);
}
