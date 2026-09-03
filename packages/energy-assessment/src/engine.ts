import { ENERGY_CODES, type EnergyCode } from './referentiel';

export interface AnsweredQuestion {
  dimensionTested: EnergyCode | null;
  hypothesisTested: string | null;
  contextTag: string;
  energySignals: Record<string, EnergyCode>;
  candidateAnswer: string | null;
}

export interface EvidenceEntry {
  total: number;
  contexts: Set<string>;
}

export type EvidenceMap = Record<EnergyCode, EvidenceEntry>;

export function tallyEvidence(answered: AnsweredQuestion[]): EvidenceMap {
  const evidence = Object.fromEntries(
    ENERGY_CODES.map(code => [code, { total: 0, contexts: new Set<string>() }])
  ) as EvidenceMap;

  for (const q of answered) {
    if (!q.candidateAnswer) continue;
    const code = q.energySignals[q.candidateAnswer];
    if (!code) continue;
    evidence[code].total += 1;
    evidence[code].contexts.add(q.contextTag);
  }

  return evidence;
}

export const CONTEXT_TAGS_CYCLE = ['incertitude', 'pression', 'changement', 'collectif', 'decision'] as const;

export const BROAD_SIGNALS: Record<string, EnergyCode> = {
  opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R',
};

export const MIN_QUESTIONS = 12;
export const MAX_QUESTIONS = 20;
export const CONFIDENCE_THRESHOLD = 0.65;
export const MIN_CONTEXTS_FOR_DOMINANT = 2;
export const CLOSE_GAP = 1;

export type Phase = 'exploration' | 'discrimination' | 'confirmation';

export interface AskAction {
  action: 'ask';
  phase: Phase;
  dimensionTested: EnergyCode | null;
  hypothesisTested: string | null;
  energySignals: Record<string, EnergyCode>;
  contextTag: string;
}

export interface ConcludeAction {
  action: 'conclude';
  dominant: EnergyCode;
  secondary: EnergyCode[];
  confidence: number;
  forced: boolean;
}

export type EngineDecision = AskAction | ConcludeAction;

function nextContextTag(answeredCount: number): string {
  // Index is always in bounds thanks to the modulo, so the assertion is safe.
  return CONTEXT_TAGS_CYCLE[answeredCount % CONTEXT_TAGS_CYCLE.length]!;
}

export function rankEvidence(evidence: EvidenceMap) {
  return ENERGY_CODES
    .map(code => ({ code, total: evidence[code].total, contextCount: evidence[code].contexts.size }))
    // Ties fall back to alphabetical order by code (A < D < I < P < R) so the
    // ranking is deterministic — Task 5's discrimination phase depends on this
    // (e.g. A and P tied at the same total must yield 'A-P', not 'P-A').
    .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
}

export function decideNextStep(answered: AnsweredQuestion[]): EngineDecision {
  const count = answered.length;
  const evidence = tallyEvidence(answered);
  const ranked = rankEvidence(evidence);
  const contextTag = nextContextTag(count);

  const allCovered = ranked.every(r => r.total >= 1);
  if (!allCovered || count < 5) {
    return {
      action: 'ask', phase: 'exploration',
      dimensionTested: null, hypothesisTested: null,
      energySignals: BROAD_SIGNALS, contextTag,
    };
  }

  // Phases suivantes : implémentées à la Task 5.
  throw new Error('not implemented past exploration');
}
