import type { StepConfig } from '../types';

// Valeur 1 = aucun signal de risque ; score_risk = 100 − score d'étape.
// Le moteur confirme tout signal faible avant de le retenir (cf. isSettled).
export const RISK_FACETS = ['overload', 'disconnection', 'meaning_recognition', 'conflicts'] as const;
export type RiskFacet = typeof RISK_FACETS[number];

export const RISK_CONFIG: StepConfig = {
  step: 'risk',
  facets: RISK_FACETS,
  facetLabels: {
    overload:            'Surcharge de travail',
    disconnection:       'Capacité à déconnecter',
    meaning_recognition: 'Sens et reconnaissance',
    conflicts:           'Conflits non résolus',
  },
  minQuestions: 5,
  maxQuestions: 8,
  valueLadder: [1, 0.66, 0.33, 0],
  contextTags: ['dernière semaine', '4 dernières semaines', '3 derniers mois'],
  questionStyle: 'behavioral',
  orderedOptions: true,
};
