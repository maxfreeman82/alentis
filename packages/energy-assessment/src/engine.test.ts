import { describe, it, expect } from 'vitest';
import { tallyEvidence, rankEvidence, decideNextStep, BROAD_SIGNALS, CONTEXT_TAGS_CYCLE, type AnsweredQuestion } from './engine';
import type { EnergyCode } from './referentiel';

function answeredFor(code: EnergyCode, contextTag: string): AnsweredQuestion {
  return {
    dimensionTested: null, hypothesisTested: null, contextTag,
    energySignals: BROAD_SIGNALS, candidateAnswer: `opt_${code}`,
  };
}

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

describe('rankEvidence', () => {
  it('départage les égalités par ordre alphabétique de code (A < D < I < P < R)', () => {
    const answered: AnsweredQuestion[] = [
      { dimensionTested: null, hypothesisTested: null, contextTag: 'incertitude', energySignals: BROAD_SIGNALS, candidateAnswer: 'opt_P' },
      { dimensionTested: null, hypothesisTested: null, contextTag: 'pression', energySignals: BROAD_SIGNALS, candidateAnswer: 'opt_P' },
      { dimensionTested: null, hypothesisTested: null, contextTag: 'changement', energySignals: BROAD_SIGNALS, candidateAnswer: 'opt_A' },
      { dimensionTested: null, hypothesisTested: null, contextTag: 'collectif', energySignals: BROAD_SIGNALS, candidateAnswer: 'opt_A' },
    ];
    const evidence = tallyEvidence(answered);
    // A et P sont à égalité (2 chacun) : l'ordre de déclaration ENERGY_CODES (P avant A)
    // ne doit PAS déterminer le tri — c'est l'ordre alphabétique qui doit primer.
    const ranked = rankEvidence(evidence);
    expect(ranked[0]?.code).toBe('A');
    expect(ranked[0]?.total).toBe(2);
    expect(ranked[1]?.code).toBe('P');
    expect(ranked[1]?.total).toBe(2);
  });
});

describe('decideNextStep — phase exploration', () => {
  it('démarre en exploration avec les 5 énergies proposées', () => {
    const decision = decideNextStep([]);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('exploration');
    expect(decision.dimensionTested).toBeNull();
    expect(Object.values(decision.energySignals).sort()).toEqual(['A', 'D', 'I', 'P', 'R']);
    expect(decision.contextTag).toBe(CONTEXT_TAGS_CYCLE[0]);
  });

  it('reste en exploration tant que les 5 énergies n\'ont pas toutes au moins 1 preuve', () => {
    const answered: AnsweredQuestion[] = Array.from({ length: 4 }, (_, i) => ({
      dimensionTested: null, hypothesisTested: null, contextTag: CONTEXT_TAGS_CYCLE[i % CONTEXT_TAGS_CYCLE.length]!,
      energySignals: BROAD_SIGNALS, candidateAnswer: 'opt_P', // toujours P → I/D/A/R jamais couverts
    }));
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('exploration');
  });
});

describe('decideNextStep — discrimination', () => {
  it('bascule en discrimination quand deux énergies sont proches après couverture complète', () => {
    // Couvre les 5 énergies, avec A et P proches (2 vs 2) et les autres à 1
    const answered: AnsweredQuestion[] = [
      answeredFor('A', 'incertitude'), answeredFor('A', 'pression'),
      answeredFor('P', 'changement'), answeredFor('P', 'collectif'),
      answeredFor('I', 'decision'), answeredFor('D', 'incertitude'), answeredFor('R', 'pression'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('discrimination');
    expect(decision.hypothesisTested).toBe('A-P');
    expect(Object.values(decision.energySignals).sort()).toEqual(['A', 'P']);
  });
});

describe('decideNextStep — confirmation', () => {
  it('bascule en confirmation quand un leader est net mais count < MIN_QUESTIONS', () => {
    const answered: AnsweredQuestion[] = [
      answeredFor('A', 'incertitude'), answeredFor('A', 'pression'), answeredFor('A', 'changement'),
      answeredFor('P', 'collectif'), answeredFor('I', 'decision'),
      answeredFor('D', 'incertitude'), answeredFor('R', 'pression'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('ask');
    if (decision.action !== 'ask') throw new Error('unreachable');
    expect(decision.phase).toBe('confirmation');
    expect(decision.dimensionTested).toBe('A');
  });
});

describe('decideNextStep — conclusion', () => {
  it('conclut quand le seuil de confiance et le nombre de contextes sont atteints après MIN_QUESTIONS', () => {
    const contexts = ['incertitude', 'pression', 'changement', 'collectif', 'decision'];
    const answered: AnsweredQuestion[] = [
      ...Array.from({ length: 8 }, (_, i) => answeredFor('A', contexts[i % contexts.length]!)),
      answeredFor('P', 'incertitude'), answeredFor('I', 'pression'),
      answeredFor('D', 'changement'), answeredFor('R', 'collectif'),
    ];
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('conclude');
    if (decision.action !== 'conclude') throw new Error('unreachable');
    expect(decision.dominant).toBe('A');
    expect(decision.forced).toBe(false);
  });

  it('force la conclusion à MAX_QUESTIONS même sans seuil de confiance atteint', () => {
    const contexts = ['incertitude', 'pression', 'changement', 'collectif', 'decision'];
    const answered: AnsweredQuestion[] = Array.from({ length: 20 }, (_, i) =>
      answeredFor((['A', 'P', 'I', 'D', 'R'] as const)[i % 5]!, contexts[i % contexts.length]!)
    );
    const decision = decideNextStep(answered);
    expect(decision.action).toBe('conclude');
    if (decision.action !== 'conclude') throw new Error('unreachable');
    expect(decision.forced).toBe(true);
  });
});
