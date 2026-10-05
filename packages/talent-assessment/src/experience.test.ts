import { describe, it, expect } from 'vitest';
import { computeExperienceScore, EXP_CONFIG, yearsBaseScore } from './steps/exp';
import { STEP_CONFIGS } from './configs';
import { FALLBACK_BANKS } from './fallback';

describe('EXP_CONFIG', () => {
  it('pose des questions de preuve sur le parcours déclaré', () => {
    expect(STEP_CONFIGS.exp).toBe(EXP_CONFIG);
    expect(EXP_CONFIG).toMatchObject({ questionStyle: 'proof', minQuestions: 5, maxQuestions: 8 });
    // praticien expérimenté / réponse « manuel » naïve / deux erreurs de débutant
    expect(EXP_CONFIG.valueLadder).toEqual([1, 0.5, 0, 0]);
  });

  it('n\'a pas de banque de secours (questions propres au métier du candidat)', () => {
    expect(FALLBACK_BANKS.exp).toEqual({});
  });
});

describe('yearsBaseScore', () => {
  it('reprend les paliers d\'années de l\'ancien questionnaire', () => {
    expect(yearsBaseScore(1)).toBe(20);
    expect(yearsBaseScore(3)).toBe(40);
    expect(yearsBaseScore(7)).toBe(60);
    expect(yearsBaseScore(12)).toBe(80);
    expect(yearsBaseScore(20)).toBe(100);
  });

  it('sans années connues, ne retient que le palier minimal', () => {
    expect(yearsBaseScore(null)).toBe(20);
  });
});

describe('computeExperienceScore', () => {
  it('pondère les années du CV par la crédibilité mesurée', () => {
    expect(computeExperienceScore(12, 100)).toEqual({ score: 80, verification: 'corroborated' });
    expect(computeExperienceScore(12, 50)).toEqual({ score: 40, verification: 'declared' });
  });

  it('corrobore à partir de 66 de crédibilité', () => {
    expect(computeExperienceScore(7, 66).verification).toBe('corroborated');
    expect(computeExperienceScore(7, 65).verification).toBe('declared');
  });

  it('reste « déclaré » sans années connues, même crédible', () => {
    expect(computeExperienceScore(null, 100)).toEqual({ score: 20, verification: 'declared' });
  });
});
