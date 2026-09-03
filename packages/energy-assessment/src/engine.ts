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
