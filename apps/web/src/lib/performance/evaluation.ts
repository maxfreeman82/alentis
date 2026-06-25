// Modèle d'évaluation 360° — 5 dimensions Teranga Align
// Évaluateurs : manager, pair, auto-évaluation

export type EvaluatorRole = 'manager' | 'peer' | 'self';

export type EvalDimension =
  | 'results'      // Atteinte des résultats / OKRs
  | 'collaboration'// Travail en équipe / contribution collective
  | 'growth'       // Montée en compétences / apprentissage
  | 'alignment'    // Alignement valeurs / vision organisation
  | 'energy';      // Énergie apportée / posture

export interface EvalQuestion {
  id: string;
  dimension: EvalDimension;
  text: string;
  forRoles: EvaluatorRole[];
}

export interface EvalResponse {
  questionId: string;
  score: number; // 1-5
  comment?: string;
}

const ALL: EvaluatorRole[] = ['manager', 'peer', 'self'];
const MGR: EvaluatorRole[] = ['manager'];
const NOT_SELF: EvaluatorRole[] = ['manager', 'peer'];

export const EVAL_QUESTIONS: EvalQuestion[] = [
  // ── RÉSULTATS ───────────────────────────────────────────────────────
  { id: 'R1', dimension: 'results', forRoles: ALL,
    text: 'Les objectifs fixés pour ce trimestre ont été atteints dans les délais.' },
  { id: 'R2', dimension: 'results', forRoles: NOT_SELF,
    text: 'La qualité des livrables produits est à la hauteur des attentes.' },
  { id: 'R3', dimension: 'results', forRoles: MGR,
    text: 'La personne prend des initiatives pour dépasser les objectifs définis.' },
  { id: 'R4', dimension: 'results', forRoles: ALL,
    text: 'Les priorités sont bien gérées, même en situation de pression.' },

  // ── COLLABORATION ────────────────────────────────────────────────────
  { id: 'C1', dimension: 'collaboration', forRoles: ALL,
    text: 'La personne contribue activement au succès collectif de l\'équipe.' },
  { id: 'C2', dimension: 'collaboration', forRoles: NOT_SELF,
    text: 'Elle communique clairement et partage les informations utiles à l\'équipe.' },
  { id: 'C3', dimension: 'collaboration', forRoles: ALL,
    text: 'Elle est disponible et fiable pour ses collègues quand ils ont besoin d\'aide.' },
  { id: 'C4', dimension: 'collaboration', forRoles: NOT_SELF,
    text: 'Elle gère constructivement les désaccords et les tensions.' },

  // ── CROISSANCE ───────────────────────────────────────────────────────
  { id: 'G1', dimension: 'growth', forRoles: ALL,
    text: 'Des efforts visibles ont été faits pour monter en compétence ce trimestre.' },
  { id: 'G2', dimension: 'growth', forRoles: MGR,
    text: 'La personne prend en compte les feedbacks reçus et les applique.' },
  { id: 'G3', dimension: 'growth', forRoles: ALL,
    text: 'Elle cherche proactivement de nouvelles connaissances liées à son rôle.' },

  // ── ALIGNEMENT VISION ────────────────────────────────────────────────
  { id: 'A1', dimension: 'alignment', forRoles: ALL,
    text: 'Les actions menées sont cohérentes avec les valeurs de l\'organisation.' },
  { id: 'A2', dimension: 'alignment', forRoles: NOT_SELF,
    text: 'La personne contribue à la culture d\'entreprise par son comportement.' },
  { id: 'A3', dimension: 'alignment', forRoles: MGR,
    text: 'Elle comprend et porte la vision de l\'organisation auprès des autres.' },

  // ── ÉNERGIE / POSTURE ────────────────────────────────────────────────
  { id: 'E1', dimension: 'energy', forRoles: ALL,
    text: 'L\'énergie et la motivation affichées sont positives et contagieuses.' },
  { id: 'E2', dimension: 'energy', forRoles: NOT_SELF,
    text: 'La personne maintient une posture constructive même en période difficile.' },
  { id: 'E3', dimension: 'energy', forRoles: ALL,
    text: 'Elle sait récupérer rapidement après des échecs ou des revers.' },
];

// Dimensions et leurs méta-données
export const DIMENSIONS: Record<EvalDimension, { label: string; color: string; weight: number }> = {
  results:       { label: 'Résultats',        color: '#10B981', weight: 0.35 },
  collaboration: { label: 'Collaboration',    color: '#0EA5E9', weight: 0.25 },
  growth:        { label: 'Croissance',       color: '#8B5CF6', weight: 0.20 },
  alignment:     { label: 'Alignement',       color: '#F97316', weight: 0.10 },
  energy:        { label: 'Énergie/Posture',  color: '#F59E0B', weight: 0.10 },
};

// Calcule le score de corrélation (0-100) à partir des réponses
export function computeCorrelationScore(responses: EvalResponse[]): {
  global: number;
  byDimension: Record<EvalDimension, number>;
  responseCount: number;
} {
  const dims: EvalDimension[] = ['results', 'collaboration', 'growth', 'alignment', 'energy'];
  const byDim = {} as Record<EvalDimension, number[]>;

  for (const dim of dims) byDim[dim] = [];

  for (const r of responses) {
    const q = EVAL_QUESTIONS.find((q) => q.id === r.questionId);
    if (!q) continue;
    byDim[q.dimension].push(r.score);
  }

  const dimScores = {} as Record<EvalDimension, number>;
  let weightedSum = 0;

  for (const dim of dims) {
    const vals = byDim[dim] ?? [];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
    dimScores[dim] = Math.round((avg / 5) * 100);
    weightedSum += dimScores[dim] * (DIMENSIONS[dim]?.weight ?? 0.2);
  }

  return {
    global:       Math.round(weightedSum),
    byDimension:  dimScores,
    responseCount: responses.length,
  };
}

// Dérive le risque départ (0-100) depuis le score de corrélation + dimension énergie
export function computeDepartureRisk(correlationScore: number, energyScore: number): number {
  const base = Math.max(0, 100 - correlationScore);
  const energyPenalty = energyScore < 50 ? (50 - energyScore) * 0.4 : 0;
  return Math.min(100, Math.round(base * 0.7 + energyPenalty));
}
