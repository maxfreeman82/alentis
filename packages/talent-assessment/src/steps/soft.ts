import type { StepConfig } from '../types';

// Les clés correspondent aux colonnes talent_passports.soft_<clé>.
export const SOFT_FACETS = [
  'communication', 'leadership', 'adaptability', 'problem_solving', 'critical_thinking',
  'collaboration', 'stress_mgmt', 'organization', 'learning_speed', 'emotional_intel',
] as const;
export type SoftFacet = typeof SOFT_FACETS[number];

export const SOFT_CONFIG: StepConfig = {
  step: 'soft',
  facets: SOFT_FACETS,
  facetLabels: {
    communication:     'Communication claire',
    leadership:        'Leadership',
    adaptability:      'Adaptabilité',
    problem_solving:   'Résolution de problèmes',
    critical_thinking: 'Esprit critique',
    collaboration:     'Collaboration',
    stress_mgmt:       'Gestion du stress et des priorités',
    organization:      'Organisation',
    learning_speed:    'Vitesse d\'apprentissage',
    emotional_intel:   'Intelligence émotionnelle',
  },
  minQuestions: 10,
  maxQuestions: 16,
  // Grille SJT : meilleure pratique / correcte mais incomplète / peu efficace / contre-productive
  valueLadder: [1, 0.66, 0.33, 0],
  contextTags: ['réunion', 'client', 'urgence', 'projet', 'hiérarchie', 'nouvelle équipe'],
};
