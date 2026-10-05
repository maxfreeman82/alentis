import { describe, it, expect } from 'vitest';
import { STEP_CONFIGS, STEP_IDS } from './index';

describe('STEP_CONFIGS', () => {
  it('a une config pour chaque étape livrée', () => {
    for (const step of STEP_IDS) expect(STEP_CONFIGS[step].step).toBe(step);
  });

  it('chaque config peut explorer toutes ses facettes avant le plafond', () => {
    for (const step of STEP_IDS) {
      const c = STEP_CONFIGS[step];
      expect(c.maxQuestions).toBeGreaterThanOrEqual(c.facets.length);
      expect(c.minQuestions).toBeLessThanOrEqual(c.maxQuestions);
    }
  });

  it('chaque facette a un libellé', () => {
    for (const step of STEP_IDS) {
      const c = STEP_CONFIGS[step];
      for (const f of c.facets) expect(c.facetLabels[f]).toBeTruthy();
    }
  });

  it('livre les 5 étapes non énergétiques', () => {
    expect([...STEP_IDS].sort()).toEqual(['exp', 'hard', 'life', 'risk', 'soft']);
  });

  it('Life Score et Risques posent des questions factuelles à options ordonnées', () => {
    for (const step of ['life', 'risk'] as const) {
      expect(STEP_CONFIGS[step].questionStyle).toBe('behavioral');
      expect(STEP_CONFIGS[step].orderedOptions).toBe(true);
    }
    expect(STEP_CONFIGS.soft.questionStyle).toBe('situational');
    expect(STEP_CONFIGS.soft.orderedOptions).toBe(false);
  });

  it('Soft Skills couvre les 10 colonnes soft_* de talent_passports', () => {
    expect([...STEP_CONFIGS.soft.facets].sort()).toEqual([
      'adaptability', 'collaboration', 'communication', 'critical_thinking',
      'emotional_intel', 'leadership', 'learning_speed', 'organization',
      'problem_solving', 'stress_mgmt',
    ]);
  });
});
