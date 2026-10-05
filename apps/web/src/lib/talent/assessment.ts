// Questionnaire 40 questions — Talent Passport 6D
// Dimensions : H (Hard Skills) · S (Soft Skills) · X (Expérience) · L (Life Score) · E (Énergie) · R (Risque)

export type Dimension = 'H' | 'S' | 'X' | 'L' | 'E' | 'R';
export type EnergyFamily = 'pilotes' | 'initialiseurs' | 'accomplisseurs' | 'dynamiseurs' | 'regulateurs';

export interface Question {
  id:        string;
  dim:       Dimension;
  family?:   EnergyFamily; // uniquement pour dim E
  text:      string;
  options:   { value: 1 | 2 | 3 | 4 | 5; label: string }[];
  inverse?:  boolean; // si true, 5 = mauvais (risque, stress)
  kind?:     QuestionKind; // rendu UI — déduit des options si absent
}

// Type de widget affiché. Toutes les réponses restent codées 1→5.
//  agree     : échelle Likert horizontale (pas d'accord ↔ d'accord)
//  range     : plage numérique en segments (années, nombre…)
//  choice    : cartes de choix qualitatives
export type QuestionKind = 'agree' | 'range' | 'choice';

export function questionKind(q: Question): QuestionKind {
  if (q.kind) return q.kind;
  if (q.options === AGR5) return 'agree';
  return 'choice';
}

export interface AssessmentResult {
  scores: { H: number; S: number; X: number; L: number; R: number };
  score_global:     number;
  score_risk:       number;
  growth_potential: number;
  transfer_score:   number;
}

// ─── Options communes ─────────────────────────────────────────────────────────
const AGR5: Question['options'] = [
  { value: 1, label: 'Pas du tout d\'accord' },
  { value: 2, label: 'Plutôt pas d\'accord' },
  { value: 3, label: 'Neutre' },
  { value: 4, label: 'Plutôt d\'accord' },
  { value: 5, label: 'Tout à fait d\'accord' },
];

export const QUESTIONS: Question[] = [
  // ── EXPÉRIENCE (X) — 6 questions ─────────────────────────────────────────
  { id: 'X1', dim: 'X', kind: 'range', text: 'Combien d\'années d\'expérience professionnelle totale avez-vous ?', options: [{ value:1,label:'< 2 ans'},{value:2,label:'2-5 ans'},{value:3,label:'5-10 ans'},{value:4,label:'10-15 ans'},{value:5,label:'> 15 ans'}] },
  { id: 'X2', dim: 'X', kind: 'range', text: 'Avez-vous managé des équipes de façon régulière ?', options: [{ value:1,label:'Jamais'},{value:2,label:'Équipes < 3 pers.'},{value:3,label:'Équipes 3-10 pers.'},{value:4,label:'Équipes 10-30 pers.'},{value:5,label:'Équipes > 30 pers.'}] },
  { id: 'X3', dim: 'X', text: 'Quelle est la complexité des projets que vous avez dirigés ?', options: [{ value:1,label:'Tâches simples'},{value:2,label:'Projets locaux'},{value:3,label:'Projets transverses'},{value:4,label:'Programmes multi-équipes'},{value:5,label:'Transformations stratégiques'}] },
  { id: 'X4', dim: 'X', text: 'Avez-vous une expérience internationale (travail à l\'étranger ou projets multiculturels) ?', options: [{ value:1,label:'Aucune'},{value:2,label:'Quelques missions'},{value:3,label:'1-2 ans à l\'étranger'},{value:4,label:'3-5 ans à l\'étranger'},{value:5,label:'> 5 ans / mobilité multiple'}] },
  { id: 'X5', dim: 'X', text: 'Avez-vous créé ou cofondé une organisation (entreprise, projet, association) ?', options: [{ value:1,label:'Non'},{value:2,label:'Projet associatif'},{value:3,label:'Startup/freelance'},{value:4,label:'PME créée'},{value:5,label:'Plusieurs entreprises créées'}] },
  { id: 'X6', dim: 'X', text: 'Votre évolution de carrière a-t-elle été rapide par rapport à votre secteur ?', options: AGR5 },
];

export const FAMILY_PROFILES: Record<EnergyFamily, string[]> = {
  pilotes:        ['Le Stratège', 'Le Commandant', 'Le Visionnaire'],
  initialiseurs:  ['L\'Innovateur', 'Le Créatif', 'L\'Explorateur'],
  accomplisseurs: ['L\'Expert', 'Le Bâtisseur', 'L\'Optimiseur'],
  dynamiseurs:    ['Le Connecteur', 'L\'Ambassadeur', 'L\'Énergiseur'],
  regulateurs:    ['Le Gardien', 'L\'Harmoniseur', 'Le Stabilisateur'],
};

// Scores déjà mesurés par une étape adaptative (0–100), prioritaires sur les réponses Likert.
export type ScoreOverrides = Partial<Record<'H' | 'S' | 'X' | 'L' | 'R', number>>;

export function computeAssessment(
  responses: Record<string, number>,
  scoreEnergy: number,
  overrides: ScoreOverrides = {},
): AssessmentResult {
  // Hard Skills — quiz adaptatif sur les compétences du CV
  const H = overrides.H ?? 0;

  // Soft Skills — mesurées par l'étape adaptative (talent_assessment_sessions)
  const S = overrides.S ?? 0;

  // Expérience
  const xQs = QUESTIONS.filter(q => q.dim === 'X');
  const X = Math.round((xQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / xQs.length) * 20);

  // Life Score et Risque — mesurés par les étapes adaptatives (100 = risque max)
  const L = overrides.L ?? 0;
  const R = overrides.R ?? 0;

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

// Grouper les questions par dimension pour l'affichage step-by-step
export const QUESTION_STEPS = [
  { key: 'H',   label: 'Compétences techniques',  questions: [] as Question[] },
  { key: 'S',   label: 'Soft Skills',              questions: [] as Question[] },
  { key: 'X',   label: 'Expérience',               questions: QUESTIONS.filter(q => q.dim === 'X') },
  { key: 'L',   label: 'Life Score',               questions: [] as Question[] },
  { key: 'E',   label: 'Profil énergétique',       questions: [] as Question[] },
  { key: 'R',   label: 'Risques & bien-être',      questions: [] as Question[] },
];
