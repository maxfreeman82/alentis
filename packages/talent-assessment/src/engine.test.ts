import { describe, it, expect } from 'vitest';
import { assignOptionValues, decideNextStep, type AskDecision } from './engine';
import { SOFT_CONFIG } from './steps/soft';
import { RISK_CONFIG } from './steps/risk';
import type { AnsweredItem } from './types';

// RNG déterministe (LCG) pour des tests reproductibles
function seeded(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('assignOptionValues', () => {
  it('produit les clés k1..kN et une permutation de la grille', () => {
    const ladder = [1, 0.66, 0.33, 0];
    const out = assignOptionValues(ladder, seeded());
    expect(Object.keys(out)).toEqual(['k1', 'k2', 'k3', 'k4']);
    expect(Object.values(out).sort()).toEqual([...ladder].sort());
  });

  it('en mode ordonné, garde une échelle monotone dans un sens ou l\'autre', () => {
    const ladder = [1, 0.66, 0.33, 0];
    const rng = seeded(3);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const values = Object.values(assignOptionValues(ladder, rng, true));
      const asc = [...ladder].reverse();
      expect([JSON.stringify(ladder), JSON.stringify(asc)]).toContain(JSON.stringify(values));
      seen.add(JSON.stringify(values));
    }
    expect(seen.size).toBe(2);
  });

  it('ne place pas toujours la meilleure option en k1', () => {
    const rng = seeded(7);
    const positions = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const out = assignOptionValues([1, 0.66, 0.33, 0], rng);
      positions.add(Object.keys(out).find(k => out[k] === 1)!);
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

function answerWith(d: AskDecision, value: number, responseMs = 8000): AnsweredItem {
  const key = Object.keys(d.optionValues).find(k => d.optionValues[k] === value);
  if (!key) throw new Error(`valeur ${value} absente`);
  return { facet: d.facet, optionValues: d.optionValues, candidateAnswer: key, responseMs };
}

// Simule une passation complète ; pick(facette, nbDéjàRépondusSurCetteFacette) → valeur choisie
function run(pick: (facet: string, n: number) => number, responseMs = 8000) {
  const rng = seeded(1);
  const answered: AnsweredItem[] = [];
  for (let i = 0; i < 50; i++) {
    const d = decideNextStep(SOFT_CONFIG, answered, rng);
    if (d.action === 'conclude') return { d, answered };
    const n = answered.filter(a => a.facet === d.facet).length;
    answered.push(answerWith(d, pick(d.facet, n), responseMs));
  }
  throw new Error('aucune conclusion');
}

describe('decideNextStep', () => {
  it('commence par explorer la première facette', () => {
    const d = decideNextStep(SOFT_CONFIG, [], seeded());
    expect(d).toMatchObject({ action: 'ask', phase: 'exploration', facet: 'communication' });
  });

  it('explore chaque facette une fois avant tout approfondissement', () => {
    const { answered } = run(() => 0);
    const first10 = answered.slice(0, 10).map(a => a.facet);
    expect(new Set(first10).size).toBe(10);
  });

  it('conclut en 10 questions si toutes les réponses sont fortes', () => {
    const { d, answered } = run(() => 1);
    expect(answered).toHaveLength(10);
    expect(d).toMatchObject({ action: 'conclude', forced: false, stepScore: 100 });
  });

  it('confirme une faiblesse avant de la retenir', () => {
    const { d, answered } = run((f) => (f === 'communication' ? 0.33 : 1));
    expect(answered.filter(a => a.facet === 'communication')).toHaveLength(2);
    expect(answered).toHaveLength(11);
    if (d.action !== 'conclude') throw new Error('attendu: conclude');
    expect(d.facetScores.communication).toBe(33);
  });

  it('pose une 3e question sur une facette contradictoire', () => {
    const { answered } = run((f, n) => (f === 'leadership' ? (n === 0 ? 0 : n === 1 ? 1 : 0.66) : 1));
    expect(answered.filter(a => a.facet === 'leadership')).toHaveLength(3);
  });

  it('ne dépasse jamais le plafond et marque la conclusion comme forcée', () => {
    const { d, answered } = run(() => 0);
    expect(answered).toHaveLength(SOFT_CONFIG.maxQuestions);
    expect(d).toMatchObject({ action: 'conclude', forced: true });
  });

  it('calcule score facette et score d\'étape', () => {
    const { d } = run((f) => (f === 'collaboration' ? 0.66 : 1));
    if (d.action !== 'conclude') throw new Error('attendu: conclude');
    expect(d.facetScores.collaboration).toBe(66);
    expect(d.stepScore).toBe(Math.round((9 * 100 + 66) / 10));
  });

  it('signale les réponses trop rapides', () => {
    const { d } = run(() => 1, 1200);
    expect(d).toMatchObject({ action: 'conclude', integrityFlags: ['fast_answers'] });
  });

  it('ne signale rien pour un rythme normal', () => {
    const { d } = run(() => 1);
    expect(d).toMatchObject({ action: 'conclude', integrityFlags: [] });
  });

  it('ignore une réponse dont la clé est inconnue', () => {
    const first = decideNextStep(SOFT_CONFIG, [], seeded()) as AskDecision;
    const bogus: AnsweredItem = { facet: first.facet, optionValues: first.optionValues, candidateAnswer: 'k99', responseMs: 5000 };
    const d = decideNextStep(SOFT_CONFIG, [bogus], seeded());
    expect(d).toMatchObject({ action: 'ask', phase: 'exploration', facet: 'communication' });
  });

  it('fait tourner les décors de situation', () => {
    const { answered } = run(() => 1);
    const d0 = decideNextStep(SOFT_CONFIG, [], seeded());
    const d1 = decideNextStep(SOFT_CONFIG, answered.slice(0, 1), seeded());
    if (d0.action !== 'ask' || d1.action !== 'ask') throw new Error('attendu: ask');
    expect(d0.contextTag).not.toBe(d1.contextTag);
  });

  it('Risques : respecte le minimum de questions même sans aucun signal', () => {
    const rng = seeded(5);
    const answered: AnsweredItem[] = [];
    let d = decideNextStep(RISK_CONFIG, answered, rng);
    while (d.action === 'ask') {
      answered.push(answerWith(d, 1));
      d = decideNextStep(RISK_CONFIG, answered, rng);
    }
    expect(answered).toHaveLength(RISK_CONFIG.minQuestions);
    expect(d).toMatchObject({ forced: false, stepScore: 100 });
  });

  it("Risques : un signal d'alerte est confirmé avant d'être retenu", () => {
    const rng = seeded(5);
    const answered: AnsweredItem[] = [];
    let d = decideNextStep(RISK_CONFIG, answered, rng);
    while (d.action === 'ask') {
      answered.push(answerWith(d, d.facet === 'overload' ? 0 : 1));
      d = decideNextStep(RISK_CONFIG, answered, rng);
    }
    expect(answered.filter(a => a.facet === 'overload')).toHaveLength(2);
    if (d.action !== 'conclude') throw new Error('attendu: conclude');
    expect(d.facetScores.overload).toBe(0);
  });
});
