// Étapes livrées. La tranche suivante ajoute 'exp'.
export const STEP_IDS = ['soft', 'life', 'risk', 'hard'] as const;
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
  // situational : mise en situation (SJT), options plausibles graduées par efficacité.
  // behavioral  : fait concret récent (fréquence…), options = échelle de la plus
  //               favorable à la plus préoccupante.
  // knowledge   : QCM / mini-cas, une seule bonne réponse, difficulté adaptative 1→5.
  questionStyle:  'situational' | 'behavioral' | 'knowledge';
  // true : options affichées dans l'ordre de l'échelle (sens tiré au hasard) —
  // nécessaire pour une échelle de fréquences lisible. false : ordre mélangé.
  orderedOptions: boolean;
}

// Une question déjà posée, telle que relue en base.
export interface AnsweredItem {
  facet:           string;
  optionValues:    Record<string, number>;
  candidateAnswer: string | null;
  responseMs:      number | null;
  difficulty:      number | null; // mode knowledge uniquement
}

export interface ClientQuestion {
  questionText: string;
  options:      { key: string; text: string }[];
}
