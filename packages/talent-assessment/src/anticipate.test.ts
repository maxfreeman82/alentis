import { describe, it, expect } from 'vitest';
import { anticipateNextSteps, sameStep } from './anticipate';
import { decideNextStep, type AskDecision } from './engine';
import { SOFT_CONFIG } from './steps/soft';
import { buildHardConfig } from './steps/hard';
import type { AnsweredItem } from './types';

const rng = () => 0.42;

function answer(d: AskDecision, value: number): AnsweredItem {
  const key = Object.keys(d.optionValues).find(k => d.optionValues[k] === value)!;
  return { facet: d.facet, optionValues: d.optionValues, candidateAnswer: key, responseMs: 8000, difficulty: d.difficulty };
}

describe('anticipateNextSteps', () => {
  it('en exploration, toutes les réponses mènent à la même question suivante', () => {
    const pending = decideNextStep(SOFT_CONFIG, [], rng) as AskDecision;
    const next = anticipateNextSteps(SOFT_CONFIG, [], pending, rng);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ phase: 'exploration', facet: 'leadership' });
  });

  it('en technique, prépare les deux difficultés possibles', () => {
    const config = buildHardConfig(['Excel']);
    const pending = decideNextStep(config, [], rng) as AskDecision;
    const next = anticipateNextSteps(config, [], pending, rng);
    expect(next.map(d => d.difficulty).sort()).toEqual([2, 4]);
  });

  it('ignore les réponses qui concluent l\'étape', () => {
    const config = buildHardConfig(['Excel']);
    const rngSeq = () => 0.42;
    const d1 = decideNextStep(config, [], rngSeq) as AskDecision;
    const answered = [answer(d1, 1)];                       // juste à 3
    const pending = decideNextStep(config, answered, rngSeq) as AskDecision; // niveau 4
    // faux à 4 → encadré → conclusion ; juste à 4 → question niveau 5
    const next = anticipateNextSteps(config, answered, pending, rngSeq);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ facet: 'Excel', difficulty: 5 });
  });

  it('chaque branche correspond à la décision réelle prise après la réponse', () => {
    const config = buildHardConfig(['Excel', 'SQL']);
    const pending = decideNextStep(config, [], rng) as AskDecision;
    const next = anticipateNextSteps(config, [], pending, rng);
    for (const value of [0, 1]) {
      const real = decideNextStep(config, [answer(pending, value)], rng);
      if (real.action !== 'ask') continue;
      expect(next.some(n => sameStep(n, real))).toBe(true);
    }
  });
});

describe('sameStep', () => {
  it('compare phase, facette et difficulté, pas les valeurs tirées au hasard', () => {
    const a: AskDecision = { action: 'ask', phase: 'deepening', facet: 'SQL', contextTag: 'x', optionValues: { k1: 1 }, difficulty: 2 };
    const b: AskDecision = { ...a, optionValues: { k1: 0 }, contextTag: 'y' };
    expect(sameStep(a, b)).toBe(true);
    expect(sameStep(a, { ...a, difficulty: 3 })).toBe(false);
    expect(sameStep(a, { ...a, facet: 'Excel' })).toBe(false);
  });
});
