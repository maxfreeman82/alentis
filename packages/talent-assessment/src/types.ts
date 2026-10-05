// Étapes livrées. Les tranches suivantes ajoutent 'life', 'risk', 'hard', 'exp'.
export const STEP_IDS = ['soft'] as const;
export type StepId = typeof STEP_IDS[number];

export interface StepConfig {
  step:         StepId;
  facets:       readonly string[];
  facetLabels:  Readonly<Record<string, string>>;
  minQuestions: number;
  maxQuestions: number;
  // Valeurs cachées des options, de la meilleure à la moins bonne.
  // L'index dans ce tableau = rang utilisé par la banque de secours.
  valueLadder:  readonly number[];
  // Décors de mise en situation, utilisés en rotation.
  contextTags:  readonly string[];
}

// Une question déjà posée, telle que relue en base.
export interface AnsweredItem {
  facet:           string;
  optionValues:    Record<string, number>;
  candidateAnswer: string | null;
  responseMs:      number | null;
}

export interface ClientQuestion {
  questionText: string;
  options:      { key: string; text: string }[];
}
