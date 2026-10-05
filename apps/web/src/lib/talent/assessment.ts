// Questionnaire Talent Passport 6D — entièrement adaptatif
// Dimensions : H (Hard Skills) · S (Soft Skills) · X (Expérience) · L (Life Score) · E (Énergie) · R (Risque)
// Chaque dimension est mesurée par une passation adaptative (packages/talent-assessment,
// sauf E : packages/energy-assessment). Aucune auto-déclaration statique.

import type { StepId } from '@teranga/talent-assessment';

export type Dimension = 'H' | 'S' | 'X' | 'L' | 'E' | 'R';
export type EnergyFamily = 'pilotes' | 'initialiseurs' | 'accomplisseurs' | 'dynamiseurs' | 'regulateurs';

export interface AssessmentStep {
  key:       Dimension;
  label:     string;
  // Étape du moteur adaptatif ; absente pour E (moteur énergie dédié)
  adaptive?: StepId;
}

// Ordre du parcours (le CV, prérequis, est demandé avant).
export const ASSESSMENT_STEPS: AssessmentStep[] = [
  { key: 'H', label: 'Compétences techniques', adaptive: 'hard' },
  { key: 'S', label: 'Soft Skills',            adaptive: 'soft' },
  { key: 'X', label: 'Expérience',             adaptive: 'exp'  },
  { key: 'E', label: 'Profil énergétique' },
  { key: 'L', label: 'Life Score',             adaptive: 'life' },
  { key: 'R', label: 'Risques & bien-être',    adaptive: 'risk' },
];

export interface AssessmentResult {
  scores: { H: number; S: number; X: number; L: number; R: number };
  score_global:     number;
  score_risk:       number;
  growth_potential: number;
  transfer_score:   number;
}

export const FAMILY_PROFILES: Record<EnergyFamily, string[]> = {
  pilotes:        ['Le Stratège', 'Le Commandant', 'Le Visionnaire'],
  initialiseurs:  ['L\'Innovateur', 'Le Créatif', 'L\'Explorateur'],
  accomplisseurs: ['L\'Expert', 'Le Bâtisseur', 'L\'Optimiseur'],
  dynamiseurs:    ['Le Connecteur', 'L\'Ambassadeur', 'L\'Énergiseur'],
  regulateurs:    ['Le Gardien', 'L\'Harmoniseur', 'Le Stabilisateur'],
};

// scores : 0–100 par dimension, issus des passations adaptatives (R : 100 = risque max).
export function computeAssessment(
  scores: { H: number; S: number; X: number; L: number; R: number },
  scoreEnergy: number,
): AssessmentResult {
  const { H, S, X, L, R } = scores;
  const E = scoreEnergy;

  // Score global 6D : H*0.25 + S*0.20 + X*0.15 + L*0.10 + E*0.20 - R*0.10
  const riskPenalty = R > 70 ? 0.10 * Math.pow(R / 100, 2) * 100 : 0.10 * (R / 100) * 100;
  const raw = 0.25 * H + 0.20 * S + 0.15 * X + 0.10 * L + 0.20 * E - riskPenalty;
  const score_global = Math.round(Math.max(0, Math.min(100, raw)));

  // Growth potential = capacité à monter (soft + learning speed)
  const growth_potential = Math.round((S * 0.6 + X * 0.4));

  // Transfer score = polyvalence
  const transfer_score = Math.round((H * 0.3 + S * 0.4 + X * 0.3));

  return { scores: { H, S, X, L, R }, score_global, score_risk: R, growth_potential, transfer_score };
}
