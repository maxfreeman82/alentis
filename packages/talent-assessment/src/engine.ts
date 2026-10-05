import type { AnsweredItem, StepConfig } from './types';

// Seuils ajustables — non validés psychométriquement (cf. design).
export const STRONG_VALUE = 0.66;
export const SPREAD_THRESHOLD = 0.34;
export const MAX_PER_FACET = 3;
export const FAST_ANSWER_MS = 2500;
export const FAST_ANSWERS_FLAG_COUNT = 3;
// Mode knowledge : réponse très lente = recherche extérieure possible (signalé, jamais bloqué).
export const SLOW_ANSWER_MS = 90_000;
export const SLOW_ANSWERS_FLAG_COUNT = 3;
export const START_DIFFICULTY = 3;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export type Phase = 'exploration' | 'deepening';

export interface AskDecision {
  action:       'ask';
  phase:        Phase;
  facet:        string;
  contextTag:   string;
  optionValues: Record<string, number>;
  difficulty:   number | null; // mode knowledge uniquement
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
// d'affichage ne trahit jamais la meilleure réponse. En mode ordonné (échelles
// de fréquence), l'ordre est conservé mais son sens est tiré au hasard.
export function assignOptionValues(
  ladder: readonly number[],
  rng: () => number = Math.random,
  ordered = false,
): Record<string, number> {
  const values = [...ladder];
  if (ordered) {
    if (rng() < 0.5) values.reverse();
    return Object.fromEntries(values.map((v, i) => [`k${i + 1}`, v]));
  }
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

function answeredByFacet(config: StepConfig, answered: AnsweredItem[]): Record<string, AnsweredItem[]> {
  const byFacet: Record<string, AnsweredItem[]> = Object.fromEntries(config.facets.map(f => [f, []]));
  for (const a of answered) if (isAnswered(a)) byFacet[a.facet]?.push(a);
  return byFacet;
}

const isCorrect = (a: AnsweredItem) => a.optionValues[a.candidateAnswer!] === 1;

// Mode knowledge : stable dès que le niveau est encadré (une juste, une fausse),
// ou confirmé à une borne, ou après 3 questions.
export function isKnowledgeSettled(items: AnsweredItem[]): boolean {
  if (items.length >= MAX_PER_FACET) return true;
  if (items.length < 2) return false;
  const results = items.map(isCorrect);
  if (results.some(r => r !== results[0])) return true;
  const last = items[items.length - 1]!;
  return results[0] ? last.difficulty === MAX_DIFFICULTY : last.difficulty === MIN_DIFFICULTY;
}

export function nextDifficulty(items: AnsweredItem[]): number {
  const last = items[items.length - 1];
  if (!last || last.difficulty == null) return START_DIFFICULTY;
  const next = last.difficulty + (isCorrect(last) ? 1 : -1);
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, next));
}

// Score = plus haut niveau réussi × 20 (0 si aucune bonne réponse).
function knowledgeScore(items: AnsweredItem[]): number {
  const best = Math.max(0, ...items.filter(isCorrect).map(a => a.difficulty ?? 0));
  return best * 20;
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

export function computeIntegrityFlags(config: StepConfig, answered: AnsweredItem[]): string[] {
  const timed = answered.filter(a => isAnswered(a) && a.responseMs != null);
  const flags: string[] = [];
  if (timed.filter(a => a.responseMs! < FAST_ANSWER_MS).length >= FAST_ANSWERS_FLAG_COUNT) flags.push('fast_answers');
  if (config.questionStyle === 'knowledge'
    && timed.filter(a => a.responseMs! > SLOW_ANSWER_MS).length >= SLOW_ANSWERS_FLAG_COUNT) flags.push('slow_answers');
  return flags;
}

export function decideNextStep(
  config: StepConfig,
  answered: AnsweredItem[],
  rng: () => number = Math.random,
): Decision {
  const knowledge = config.questionStyle === 'knowledge';
  const obs = observationsByFacet(config, answered);
  const items = answeredByFacet(config, answered);
  const count = answered.filter(isAnswered).length;
  const contextTag = config.contextTags[count % config.contextTags.length]!;
  const settled = (f: string) => (knowledge ? isKnowledgeSettled(items[f]!) : isSettled(obs[f]!));
  const unsettled = config.facets.filter(f => !settled(f));

  const ask = (phase: Phase, facet: string): AskDecision => ({
    action: 'ask', phase, facet, contextTag,
    optionValues: assignOptionValues(config.valueLadder, rng, config.orderedOptions),
    difficulty: knowledge ? nextDifficulty(items[facet]!) : null,
  });

  const conclude = (forced: boolean): ConcludeDecision => {
    const facetScores = Object.fromEntries(config.facets.map(f => [
      f, knowledge ? knowledgeScore(items[f]!) : Math.round(mean(obs[f]!) * 100),
    ]));
    return {
      action: 'conclude', facetScores, forced,
      stepScore: Math.round(mean(Object.values(facetScores))),
      integrityFlags: computeIntegrityFlags(config, answered),
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
