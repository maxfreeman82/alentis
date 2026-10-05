import { describe, it, expect } from 'vitest';
import { decideNextStep, START_DIFFICULTY, type AskDecision } from './engine';
import { buildHardConfig, sanitizeSkills } from './steps/hard';
import { resolveStepConfig, STEP_CONFIGS } from './configs';
import type { AnsweredItem } from './types';

function seeded(seed = 11): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function answer(d: AskDecision, correct: boolean, responseMs = 20_000): AnsweredItem {
  const key = Object.keys(d.optionValues).find(k => (d.optionValues[k] === 1) === correct)!;
  return { facet: d.facet, optionValues: d.optionValues, candidateAnswer: key, responseMs, difficulty: d.difficulty };
}

// isCorrect(facette, difficulté) → le candidat répond juste ?
function run(skills: string[], isCorrect: (facet: string, difficulty: number) => boolean, responseMs = 20_000) {
  const config = buildHardConfig(skills);
  const rng = seeded();
  const answered: AnsweredItem[] = [];
  for (let i = 0; i < 40; i++) {
    const d = decideNextStep(config, answered, rng);
    if (d.action === 'conclude') return { d, answered, config };
    answered.push(answer(d, isCorrect(d.facet, d.difficulty!), responseMs));
  }
  throw new Error('aucune conclusion');
}

describe('sanitizeSkills', () => {
  it('nettoie, dédoublonne et limite à 5 compétences', () => {
    expect(sanitizeSkills(['  Excel ', 'excel', '', 'SQL', 42, 'Python', 'Power BI', 'SAP', 'Comptabilité']))
      .toEqual(['Excel', 'SQL', 'Python', 'Power BI', 'SAP']);
  });

  it('rejette les entrées trop longues et les non-tableaux', () => {
    expect(sanitizeSkills(['x'.repeat(61), 'Go'])).toEqual(['Go']);
    expect(sanitizeSkills('Excel')).toEqual([]);
  });
});

describe('buildHardConfig', () => {
  it('pose 2 à 3 questions par compétence', () => {
    const c = buildHardConfig(['Excel', 'SQL']);
    expect(c).toMatchObject({ step: 'hard', questionStyle: 'knowledge', minQuestions: 4, maxQuestions: 6 });
    expect(c.facetLabels.Excel).toBe('Excel');
  });
});

describe('decideNextStep — mode connaissance', () => {
  it('une seule bonne réponse parmi 4 options, position mélangée', () => {
    const d = decideNextStep(buildHardConfig(['Excel']), [], seeded()) as AskDecision;
    expect(Object.values(d.optionValues).filter(v => v === 1)).toHaveLength(1);
    expect(Object.keys(d.optionValues)).toHaveLength(4);
  });

  it('commence au niveau intermédiaire', () => {
    const d = decideNextStep(buildHardConfig(['Excel']), [], seeded());
    expect(d).toMatchObject({ action: 'ask', difficulty: START_DIFFICULTY });
  });

  it('monte après une bonne réponse, descend après une erreur', () => {
    const config = buildHardConfig(['Excel']);
    const rng = seeded();
    const d1 = decideNextStep(config, [], rng) as AskDecision;
    const up = decideNextStep(config, [answer(d1, true)], rng) as AskDecision;
    expect(up.difficulty).toBe(START_DIFFICULTY + 1);
    const down = decideNextStep(config, [answer(d1, false)], rng) as AskDecision;
    expect(down.difficulty).toBe(START_DIFFICULTY - 1);
  });

  it('un expert atteint le niveau 5 → score 100', () => {
    const { d } = run(['Excel'], () => true);
    expect(d).toMatchObject({ action: 'conclude', facetScores: { Excel: 100 } });
  });

  it('aucune bonne réponse → score 0', () => {
    const { d } = run(['Excel'], () => false);
    expect(d).toMatchObject({ action: 'conclude', facetScores: { Excel: 0 } });
  });

  it('le score suit le plus haut niveau réussi (palier à 3)', () => {
    const { d, answered } = run(['SQL'], (_f, diff) => diff <= 3);
    if (d.action !== 'conclude') throw new Error('attendu: conclude');
    expect(d.facetScores.SQL).toBe(60);
    expect(answered).toHaveLength(2); // juste à 3, faux à 4 : encadré
  });

  it('ne dépasse jamais 3 questions par compétence', () => {
    const { answered, config } = run(['Excel', 'SQL', 'Python'], () => true);
    for (const f of config.facets) {
      expect(answered.filter(a => a.facet === f).length).toBeLessThanOrEqual(3);
    }
  });

  it('signale les réponses très lentes (recherche extérieure possible)', () => {
    const { d } = run(['Excel', 'SQL'], () => true, 120_000);
    expect(d).toMatchObject({ action: 'conclude', integrityFlags: ['slow_answers'] });
  });
});

describe('resolveStepConfig', () => {
  it('construit la config technique depuis les compétences du CV', () => {
    expect(resolveStepConfig('hard', { skills: ['Excel', ' SQL '] }).facets).toEqual(['Excel', 'SQL']);
    expect(resolveStepConfig('hard', {}).facets).toEqual([]);
  });

  it('renvoie la config fixe pour les autres étapes', () => {
    expect(resolveStepConfig('soft', { skills: ['Excel'] })).toBe(STEP_CONFIGS.soft);
  });
});
