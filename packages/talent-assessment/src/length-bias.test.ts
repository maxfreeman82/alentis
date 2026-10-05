import { describe, it, expect } from 'vitest';
import { bestOptionStandsOut, MAX_BEST_LENGTH_RATIO } from './validation';
import { FALLBACK_BANKS, buildFallbackQuestion } from './fallback';
import { STEP_CONFIGS } from './configs';

const q = (texts: string[]) => ({
  questionText: 'Situation',
  options: texts.map((text, i) => ({ key: `k${i + 1}`, text })),
});
const values = { k1: 0, k2: 0.33, k3: 0.66, k4: 1 };
const x = (n: number) => 'x'.repeat(n);

describe('bestOptionStandsOut', () => {
  it('signale une meilleure option nettement plus longue que tous les distracteurs', () => {
    expect(bestOptionStandsOut(q([x(100), x(100), x(100), x(200)]), values)).toBe(true);
  });

  it('signale aussi un écart modéré mais systématique (constaté : +20 % en moyenne)', () => {
    expect(bestOptionStandsOut(q([x(150), x(160), x(170), x(205)]), values)).toBe(true);
  });

  it('accepte une meilleure option qui n\'est pas la plus longue', () => {
    expect(bestOptionStandsOut(q([x(150), x(140), x(210), x(200)]), values)).toBe(false);
  });

  it('tolère un léger dépassement du plus long distracteur', () => {
    const longest = 200;
    expect(bestOptionStandsOut(q([x(150), x(160), x(longest), x(Math.floor(longest * MAX_BEST_LENGTH_RATIO))]), values)).toBe(false);
    expect(bestOptionStandsOut(q([x(150), x(160), x(longest), x(Math.floor(longest * MAX_BEST_LENGTH_RATIO) + 2)]), values)).toBe(true);
  });

  it('ignore une question sans option de valeur 1', () => {
    expect(bestOptionStandsOut(q(['a', 'b']), { k1: 0, k2: 0.5 })).toBe(false);
  });
});

describe('banque de secours', () => {
  it('la meilleure réaction ne se repère pas à sa longueur', () => {
    const c = STEP_CONFIGS.soft;
    const optionValues = Object.fromEntries(c.valueLadder.map((v, i) => [`k${i + 1}`, v]));
    const offenders = Object.keys(FALLBACK_BANKS.soft).filter(facet =>
      bestOptionStandsOut(buildFallbackQuestion(c, facet, optionValues)!, optionValues),
    ).map(facet => `${facet} ${FALLBACK_BANKS.soft[facet]!.optionsByRank.map(t => t.length).join('/')}`);
    expect(offenders).toEqual([]);
  });
});
