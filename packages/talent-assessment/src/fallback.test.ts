import { describe, it, expect } from 'vitest';
import { buildFallbackQuestion, FALLBACK_BANKS } from './fallback';
import { STEP_CONFIGS, STEP_IDS } from './configs';

describe('buildFallbackQuestion', () => {
  it('chaque facette de chaque étape a un modèle de secours complet', () => {
    for (const step of STEP_IDS) {
      const c = STEP_CONFIGS[step];
      for (const f of c.facets) {
        expect(FALLBACK_BANKS[step][f]).toBeDefined();
        expect(FALLBACK_BANKS[step][f]!.optionsByRank).toHaveLength(c.valueLadder.length);
      }
    }
  });

  it('associe à chaque clé le texte du rang correspondant à sa valeur', () => {
    const c = STEP_CONFIGS.soft;
    const values = { k1: 0, k2: 1, k3: 0.33, k4: 0.66 };
    const q = buildFallbackQuestion(c, 'communication', values)!;
    const ranks = FALLBACK_BANKS.soft.communication!.optionsByRank;
    expect(q.options).toEqual([
      { key: 'k1', text: ranks[3] }, { key: 'k2', text: ranks[0] },
      { key: 'k3', text: ranks[2] }, { key: 'k4', text: ranks[1] },
    ]);
  });

  it('renvoie null pour une facette inconnue', () => {
    expect(buildFallbackQuestion(STEP_CONFIGS.soft, 'inconnue', { k1: 1 })).toBeNull();
  });
});
