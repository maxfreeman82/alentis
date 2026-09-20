import { describe, it, expect } from 'vitest';
import { bridgeConclusionToTalentPassport, ENERGY_CODE_TO_FAMILY } from './talent-passport-bridge';
import type { ConcludeAction } from './engine';

function conclude(evidence: Record<string, number>, dominant: 'P'|'I'|'D'|'A'|'R'): ConcludeAction {
  return {
    action: 'conclude', dominant, secondary: [], confidence: 0.7, forced: false,
    evidence: evidence as ConcludeAction['evidence'],
  };
}

describe('bridgeConclusionToTalentPassport', () => {
  it('normalise les décomptes en pourcentages sommant à 100', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    const sum = Object.values(result.energyPercentages).reduce((s, v) => s + v, 0);
    expect(sum).toBe(100);
    expect(result.energyPercentages.accomplisseurs).toBeGreaterThan(result.energyPercentages.pilotes);
  });

  it('mappe le code dominant vers le nom de famille legacy', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    expect(result.dominantFamily).toBe('accomplisseurs');
  });

  it('vérifie le mapping complet des 5 codes (attention à l\'ordre D/A qui diffère entre nomenclatures)', () => {
    expect(ENERGY_CODE_TO_FAMILY).toEqual({
      P: 'pilotes', I: 'initialiseurs', D: 'dynamiseurs', A: 'accomplisseurs', R: 'regulateurs',
    });
  });

  it('scoreEnergy est la part normalisée de la famille dominante', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    expect(result.scoreEnergy).toBe(result.energyPercentages.accomplisseurs);
  });

  it('retombe sur 20% partout si aucune preuve (evidence vide/tout à zéro)', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 0, P: 0, I: 0, D: 0, R: 0 }, 'A'));
    expect(result.energyPercentages).toEqual({
      pilotes: 20, initialiseurs: 20, accomplisseurs: 20, dynamiseurs: 20, regulateurs: 20,
    });
  });

  it('dérive energyLevel (C1-C5) depuis scoreEnergy', () => {
    const result = bridgeConclusionToTalentPassport(conclude({ A: 8, P: 1, I: 1, D: 1, R: 1 }, 'A'));
    expect(['C1', 'C2', 'C3', 'C4', 'C5']).toContain(result.energyLevel);
  });
});
