import type { AnsweredItem, StepConfig } from './types';

// Seuils ajustables — non validés psychométriquement (cf. design).
export const STRONG_VALUE = 0.66;
export const SPREAD_THRESHOLD = 0.34;
export const MAX_PER_FACET = 3;
export const FAST_ANSWER_MS = 2500;
export const FAST_ANSWERS_FLAG_COUNT = 3;

export type Phase = 'exploration' | 'deepening';

export interface AskDecision {
  action:       'ask';
  phase:        Phase;
  facet:        string;
  contextTag:   string;
  optionValues: Record<string, number>;
}

export interface ConcludeDecision {
  action:         'conclude';
  facetScores:    Record<string, number>;
  stepScore:      number;
  forced:         boolean;
  integrityFlags: string[];
}

export type Decision = AskDecision | ConcludeDecision;

// Clés opaques k1..kN, valeurs mélangées (Fisher-Yates) : la position
// d'affichage ne trahit jamais la meilleure réponse.
export function assignOptionValues(
  ladder: readonly number[],
  rng: () => number = Math.random,
): Record<string, number> {
  const values = [...ladder];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return Object.fromEntries(values.map((v, i) => [`k${i + 1}`, v]));
}

function isAnswered(a: AnsweredItem): boolean {
  return a.candidateAnswer != null && a.candidateAnswer in a.optionValues;
}

export function observationsByFacet(config: StepConfig, answered: AnsweredItem[]): Record<string, number[]> {
  const obs: Record<string, number[]> = Object.fromEntries(config.facets.map(f => [f, []]));
  for (const a of answered) {
    if (!isAnswered(a)) continue;
    obs[a.facet]?.push(a.optionValues[a.candidateAnswer!]!);
  }
  return obs;
}

// Une seule réponse faible ne suffit jamais à conclure : on la confirme.
export function isSettled(values: number[]): boolean {
  if (values.length === 0) return false;
  if (values.length >= MAX_PER_FACET) return true;
  if (values.length === 1) return values[0]! >= STRONG_VALUE;
  return Math.max(...values) - Math.min(...values) <= SPREAD_THRESHOLD;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function computeIntegrityFlags(answered: AnsweredItem[]): string[] {
  const fast = answered.filter(a => isAnswered(a) && a.responseMs != null && a.responseMs < FAST_ANSWER_MS).length;
  return fast >= FAST_ANSWERS_FLAG_COUNT ? ['fast_answers'] : [];
}

export function decideNextStep(
  config: StepConfig,
  answered: AnsweredItem[],
  rng: () => number = Math.random,
): Decision {
  const obs = observationsByFacet(config, answered);
  const count = answered.filter(isAnswered).length;
  const contextTag = config.contextTags[count % config.contextTags.length]!;
  const unsettled = config.facets.filter(f => !isSettled(obs[f]!));

  const ask = (phase: Phase, facet: string): AskDecision => ({
    action: 'ask', phase, facet, contextTag,
    optionValues: assignOptionValues(config.valueLadder, rng),
  });

  const conclude = (forced: boolean): ConcludeDecision => {
    const facetScores = Object.fromEntries(config.facets.map(f => [f, Math.round(mean(obs[f]!) * 100)]));
    return {
      action: 'conclude', facetScores, forced,
      stepScore: Math.round(mean(Object.values(facetScores))),
      integrityFlags: computeIntegrityFlags(answered),
    };
  };

  if (count >= config.maxQuestions) return conclude(unsettled.length > 0);

  const unexplored = config.facets.find(f => obs[f]!.length === 0);
  if (unexplored) return ask('exploration', unexplored);

  if (unsettled.length === 0 && count >= config.minQuestions) return conclude(false);

  const pool = unsettled.length > 0 ? unsettled : config.facets;
  const target = pool.reduce((best, f) => (obs[f]!.length < obs[best]!.length ? f : best));
  return ask('deepening', target);
}
