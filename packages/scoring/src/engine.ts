export interface Score6DInput {
  hardSkills:  number;
  softSkills:  number;
  experience:  number;
  lifeScore:   number;
  energyFit:   number;
  stressRisk:  number;
  weights?:    Partial<Weights6D>;
}

export interface Weights6D {
  H: number; // Hard Skills   défaut 0.25
  S: number; // Soft Skills   défaut 0.20
  X: number; // Expérience    défaut 0.15
  L: number; // Life Score    défaut 0.10
  E: number; // Energy Fit    défaut 0.20
  R: number; // Risque Stress défaut 0.10
}

export interface Score6DResult {
  composite: number;
  breakdown: { H: number; S: number; X: number; L: number; E: number; R: number };
  color: ScoreColor;
}

export type ScoreColor = 'emerald' | 'sky' | 'amber' | 'rose';

const DEFAULT_WEIGHTS: Weights6D = {
  H: 0.25, S: 0.20, X: 0.15, L: 0.10, E: 0.20, R: 0.10,
};

export function compute6DScore(input: Score6DInput): Score6DResult {
  const w = { ...DEFAULT_WEIGHTS, ...input.weights };

  // Pénalité exponentielle si risque stress élevé
  const riskPenalty = input.stressRisk > 70
    ? w.R * Math.pow(input.stressRisk / 100, 2)
    : w.R * (input.stressRisk / 100);

  const raw =
    w.H * (input.hardSkills / 100) +
    w.S * (input.softSkills / 100) +
    w.X * (input.experience / 100) +
    w.L * (input.lifeScore / 100) +
    w.E * (input.energyFit / 100) -
    riskPenalty;

  const composite = Math.round(Math.max(0, Math.min(1, raw)) * 100);

  return {
    composite,
    breakdown: {
      H: Math.round(input.hardSkills),
      S: Math.round(input.softSkills),
      X: Math.round(input.experience),
      L: Math.round(input.lifeScore),
      E: Math.round(input.energyFit),
      R: Math.round(input.stressRisk),
    },
    color: scoreColor(composite),
  };
}

export function scoreColor(score: number): ScoreColor {
  if (score >= 80) return 'emerald';
  if (score >= 70) return 'sky';
  if (score >= 60) return 'amber';
  return 'rose';
}
