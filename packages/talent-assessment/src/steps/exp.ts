import type { StepConfig } from '../types';

// Questions de preuve : chaque facette vérifie une affirmation du CV (poste,
// secteur, ancienneté) par une question de terrain que seule une personne
// ayant réellement ce parcours tranche correctement.
export const EXP_FACETS = ['role_practice', 'sector_knowledge', 'seniority'] as const;
export type ExpFacet = typeof EXP_FACETS[number];

export const EXP_CONFIG: StepConfig = {
  step: 'exp',
  facets: EXP_FACETS,
  facetLabels: {
    role_practice:    'Pratique réelle du poste déclaré',
    sector_knowledge: 'Connaissance concrète du secteur déclaré',
    seniority:        'Situations rencontrées seulement avec l\'ancienneté déclarée',
  },
  minQuestions: 5,
  maxQuestions: 8,
  // praticien expérimenté / réponse « manuel » juste en théorie mais naïve / erreurs de débutant
  valueLadder: [1, 0.5, 0, 0],
  contextTags: ['incident terrain', 'arbitrage quotidien', 'piège classique du métier'],
  questionStyle: 'proof',
  orderedOptions: false,
};

// Seuil de crédibilité (0–100) au-delà duquel l'expérience est « corroborée ».
export const CORROBORATION_THRESHOLD = 66;

// Mêmes paliers que l'ancienne question déclarative X1 (années totales).
export function yearsBaseScore(years: number | null): number {
  if (years == null || years < 2) return 20;
  if (years < 5) return 40;
  if (years < 10) return 60;
  if (years < 15) return 80;
  return 100;
}

// score_exp = palier d'années du CV × crédibilité mesurée.
export function computeExperienceScore(
  years: number | null,
  credibility: number,
): { score: number; verification: 'declared' | 'corroborated' } {
  return {
    score: Math.round(yearsBaseScore(years) * credibility / 100),
    verification: years != null && credibility >= CORROBORATION_THRESHOLD ? 'corroborated' : 'declared',
  };
}
