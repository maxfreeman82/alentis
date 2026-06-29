// Tour de Table — 7 dimensions comportementales observées par les pairs
// Ces dimensions capturent CE QUE LES AUTRES VOIENT, pas l'auto-évaluation 6D

export type TdtDimensionId = 'fiabilite' | 'collaboration' | 'communication' | 'initiative' | 'adaptabilite' | 'impact' | 'bien_etre';

export interface TdtDimension {
  id:          TdtDimensionId;
  label:       string;
  description: string;
  color:       string;
  icon:        string;
  // Correspondance avec le passport 6D (quels champs on met à jour)
  passportFields: string[];
  items: TdtItem[];
}

export interface TdtItem {
  key: string;   // f1, f2, f3, c1, c2... (colonne SQL)
  text: string;  // énoncé comportemental
}

export const TDT_DIMENSIONS: TdtDimension[] = [
  {
    id:          'fiabilite',
    label:       'Fiabilité',
    description: 'Respect des engagements et des délais',
    color:       '#10B981',
    icon:        'ShieldCheck',
    passportFields: ['soft_organization', 'soft_stress_mgmt'],
    items: [
      { key: 'f1', text: 'Cette personne respecte les délais qu\'elle s\'est fixés.' },
      { key: 'f2', text: 'Quand elle dit qu\'elle va faire quelque chose, elle le fait.' },
      { key: 'f3', text: 'On peut compter sur elle dans les moments critiques.' },
    ],
  },
  {
    id:          'collaboration',
    label:       'Collaboration',
    description: 'Entraide et esprit d\'équipe',
    color:       '#0EA5E9',
    icon:        'Users',
    passportFields: ['soft_collaboration', 'soft_leadership'],
    items: [
      { key: 'c1', text: 'Elle aide spontanément ses collègues quand ils en ont besoin.' },
      { key: 'c2', text: 'Elle partage les informations utiles à l\'équipe sans qu\'on lui demande.' },
      { key: 'c3', text: 'Elle met le succès de l\'équipe avant son succès personnel.' },
    ],
  },
  {
    id:          'communication',
    label:       'Communication',
    description: 'Clarté, écoute et feedback constructif',
    color:       '#8B5CF6',
    icon:        'MessageSquare',
    passportFields: ['soft_communication', 'soft_emotional_intel'],
    items: [
      { key: 'k1', text: 'Elle s\'exprime de façon claire et compréhensible.' },
      { key: 'k2', text: 'Elle écoute vraiment quand les autres parlent.' },
      { key: 'k3', text: 'Elle donne des retours constructifs sans blesser.' },
    ],
  },
  {
    id:          'initiative',
    label:       'Initiative',
    description: 'Proactivité et force de proposition',
    color:       '#F97316',
    icon:        'Zap',
    passportFields: ['score_energy'],
    items: [
      { key: 'i1', text: 'Elle propose des idées ou solutions sans y être invitée.' },
      { key: 'i2', text: 'Elle prend des actions de sa propre initiative pour améliorer les choses.' },
      { key: 'i3', text: 'Elle anticipe les problèmes avant qu\'ils surviennent.' },
    ],
  },
  {
    id:          'adaptabilite',
    label:       'Adaptabilité',
    description: 'Flexibilité face au changement et apprentissage',
    color:       '#06B6D4',
    icon:        'RefreshCw',
    passportFields: ['soft_adaptability', 'soft_learning_speed'],
    items: [
      { key: 'a1', text: 'Elle s\'ajuste rapidement quand les priorités changent.' },
      { key: 'a2', text: 'Elle apprend de ses erreurs et évolue.' },
      { key: 'a3', text: 'Elle reste efficace même dans l\'incertitude.' },
    ],
  },
  {
    id:          'impact',
    label:       'Impact',
    description: 'Contribution visible aux résultats',
    color:       '#F59E0B',
    icon:        'TrendingUp',
    passportFields: ['score_hard'],
    items: [
      { key: 'p1', text: 'Son travail a un impact positif visible sur les résultats.' },
      { key: 'p2', text: 'Elle élève le niveau de qualité de l\'équipe.' },
      { key: 'p3', text: 'Elle livre ce qu\'elle promet, même en conditions difficiles.' },
    ],
  },
  {
    id:          'bien_etre',
    label:       'Bien-être collectif',
    description: 'Contribution à l\'atmosphère positive',
    color:       '#84CC16',
    icon:        'Heart',
    passportFields: ['soft_stress_mgmt', 'soft_emotional_intel'],
    items: [
      { key: 'b1', text: 'Elle contribue à une atmosphère positive dans l\'équipe.' },
      { key: 'b2', text: 'Elle gère son propre stress sans le propager aux autres.' },
      { key: 'b3', text: 'Elle est une présence positive même dans les périodes difficiles.' },
    ],
  },
];

// Toutes les clés d'items dans l'ordre SQL
export const TDT_ALL_ITEM_KEYS = TDT_DIMENSIONS.flatMap(d => d.items.map(i => i.key));

// Type des réponses à une observation
export type TdtObservationResponses = Record<typeof TDT_ALL_ITEM_KEYS[number], number>;

// Calcule le score d'une dimension (0-100) à partir des réponses
export function computeDimensionScore(
  dimensionId: TdtDimensionId,
  responses: Partial<Record<string, number>>
): number {
  const dim   = TDT_DIMENSIONS.find(d => d.id === dimensionId);
  if (!dim) return 0;
  const vals  = dim.items.map(i => responses[i.key]).filter((v): v is number => v != null);
  if (vals.length === 0) return 0;
  const avg   = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(((avg - 1) / 4) * 100); // 1-5 → 0-100
}

// Calcule le score comportemental global observé
export function computeGlobalObservedScore(responses: Partial<Record<string, number>>): number {
  const scores = TDT_DIMENSIONS.map(d => computeDimensionScore(d.id, responses));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export const RATING_LABELS: Record<number, string> = {
  1: 'Jamais',
  2: 'Rarement',
  3: 'Parfois',
  4: 'Souvent',
  5: 'Toujours',
};
