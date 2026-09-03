import { describe, it, expect } from 'vitest';
import { tallyEvidence, type AnsweredQuestion } from './engine';

describe('tallyEvidence', () => {
  it('retourne un total de 0 pour toutes les énergies quand rien n\'est répondu', () => {
    const evidence = tallyEvidence([]);
    for (const code of ['P', 'I', 'D', 'A', 'R'] as const) {
      expect(evidence[code].total).toBe(0);
      expect(evidence[code].contexts.size).toBe(0);
    }
  });

  it('incrémente le total et les contextes selon la réponse choisie', () => {
    const answered: AnsweredQuestion[] = [
      { dimensionTested: null, hypothesisTested: null, contextTag: 'incertitude',
        energySignals: { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' },
        candidateAnswer: 'opt_A' },
      { dimensionTested: null, hypothesisTested: null, contextTag: 'pression',
        energySignals: { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' },
        candidateAnswer: 'opt_A' },
    ];
    const evidence = tallyEvidence(answered);
    expect(evidence.A.total).toBe(2);
    expect(evidence.A.contexts).toEqual(new Set(['incertitude', 'pression']));
    expect(evidence.P.total).toBe(0);
  });

  it('ignore les questions sans réponse', () => {
    const answered: AnsweredQuestion[] = [
      { dimensionTested: null, hypothesisTested: null, contextTag: 'incertitude',
        energySignals: { opt_P: 'P', opt_I: 'I', opt_D: 'D', opt_A: 'A', opt_R: 'R' },
        candidateAnswer: null },
    ];
    const evidence = tallyEvidence(answered);
    expect(evidence.P.total).toBe(0);
  });
});
