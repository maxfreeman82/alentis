import type { StepConfig } from '../types';

// Faits concrets récents plutôt qu'opinions (« Je suis épanoui ») : un fait
// précis se gonfle moins facilement. Valeur 1 = situation la plus favorable.
export const LIFE_FACETS = [
  'fulfillment', 'values_alignment', 'work_life_balance', 'health', 'outside_activities', 'optimism',
] as const;
export type LifeFacet = typeof LIFE_FACETS[number];

export const LIFE_CONFIG: StepConfig = {
  step: 'life',
  facets: LIFE_FACETS,
  facetLabels: {
    fulfillment:        'Épanouissement au travail',
    values_alignment:   'Alignement avec les valeurs de l\'employeur',
    work_life_balance:  'Équilibre vie professionnelle / vie personnelle',
    health:             'Santé physique et mentale',
    outside_activities: 'Activités ressourçantes hors travail',
    optimism:           'Projection dans l\'avenir professionnel',
  },
  minQuestions: 6,
  maxQuestions: 9,
  valueLadder: [1, 0.66, 0.33, 0],
  contextTags: ['4 dernières semaines', '2 dernières semaines', '3 derniers mois'],
  questionStyle: 'behavioral',
  orderedOptions: true,
};
