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
}

export interface AssessmentResult {
  scores: { H: number; S: number; X: number; L: number; R: number };
  score_global:     number;
  score_risk:       number;
  growth_potential: number;
  transfer_score:   number;
}

// ─── Options communes ─────────────────────────────────────────────────────────
const FREQ5 = (q: string): Question['options'] => [
  { value: 1, label: 'Jamais / Très faible' },
  { value: 2, label: 'Rarement / Faible' },
  { value: 3, label: 'Parfois / Moyen' },
  { value: 4, label: 'Souvent / Élevé' },
  { value: 5, label: 'Toujours / Très élevé' },
];
const AGR5: Question['options'] = [
  { value: 1, label: 'Pas du tout d\'accord' },
  { value: 2, label: 'Plutôt pas d\'accord' },
  { value: 3, label: 'Neutre' },
  { value: 4, label: 'Plutôt d\'accord' },
  { value: 5, label: 'Tout à fait d\'accord' },
];

export const QUESTIONS: Question[] = [
  // ── HARD SKILLS (H) — 8 questions ────────────────────────────────────────
  { id: 'H1', dim: 'H', text: 'Quel est votre niveau de maîtrise dans votre domaine d\'expertise principal ?', options: [{ value:1,label:'Débutant'},{value:2,label:'Intermédiaire'},{value:3,label:'Avancé'},{value:4,label:'Expert'},{value:5,label:'Maître reconnu'}] },
  { id: 'H2', dim: 'H', text: 'Combien d\'années d\'expérience pratique avez-vous dans vos compétences clés ?', options: [{ value:1,label:'< 1 an'},{value:2,label:'1-3 ans'},{value:3,label:'3-5 ans'},{value:4,label:'5-10 ans'},{value:5,label:'> 10 ans'}] },
  { id: 'H3', dim: 'H', text: 'Êtes-vous capable de former d\'autres personnes sur vos compétences techniques ?', options: AGR5 },
  { id: 'H4', dim: 'H', text: 'Combien de langues professionnelles maîtrisez-vous (niveau B2+) ?', options: [{ value:1,label:'1'},{value:2,label:'2'},{value:3,label:'3'},{value:4,label:'4'},{value:5,label:'5+'}] },
  { id: 'H5', dim: 'H', text: 'À quelle vitesse intégrez-vous de nouveaux outils technologiques ?', options: FREQ5('') },
  { id: 'H6', dim: 'H', text: 'Vos compétences sont-elles validées par des certifications reconnues ?', options: [{ value:1,label:'Aucune'},{value:2,label:'1 certification'},{value:3,label:'2-3 certifications'},{value:4,label:'4-5 certifications'},{value:5,label:'6+ certifications'}] },
  { id: 'H7', dim: 'H', text: 'Avez-vous des compétences dans des domaines complémentaires (polyvalence) ?', options: AGR5 },
  { id: 'H8', dim: 'H', text: 'Vos compétences techniques sont-elles à jour avec les évolutions récentes du marché ?', options: AGR5 },

  // ── SOFT SKILLS (S) — 10 questions ───────────────────────────────────────
  { id: 'S1', dim: 'S', text: 'Je communique clairement mes idées, même sur des sujets complexes.', options: AGR5 },
  { id: 'S2', dim: 'S', text: 'Je prends des initiatives et entraîne les autres dans mes projets.', options: AGR5 },
  { id: 'S3', dim: 'S', text: 'Je m\'adapte rapidement quand les priorités changent ou en situation d\'incertitude.', options: AGR5 },
  { id: 'S4', dim: 'S', text: 'Je résous des problèmes complexes de façon structurée et créative.', options: AGR5 },
  { id: 'S5', dim: 'S', text: 'Je remets en question mes propres hypothèses et celles de mon environnement.', options: AGR5 },
  { id: 'S6', dim: 'S', text: 'Je crée facilement un esprit d\'équipe et facilite la collaboration.', options: AGR5 },
  { id: 'S7', dim: 'S', text: 'Je gère bien la pression et reste efficace sous stress.', options: AGR5 },
  { id: 'S8', dim: 'S', text: 'J\'organise mon travail et mes priorités de façon autonome.', options: AGR5 },
  { id: 'S9', dim: 'S', text: 'J\'apprends vite de mes erreurs et de mes interactions avec les autres.', options: AGR5 },
  { id: 'S10', dim: 'S', text: 'Je perçois facilement les émotions des autres et adapte ma communication.', options: AGR5 },

  // ── EXPÉRIENCE (X) — 6 questions ─────────────────────────────────────────
  { id: 'X1', dim: 'X', text: 'Combien d\'années d\'expérience professionnelle totale avez-vous ?', options: [{ value:1,label:'< 2 ans'},{value:2,label:'2-5 ans'},{value:3,label:'5-10 ans'},{value:4,label:'10-15 ans'},{value:5,label:'> 15 ans'}] },
  { id: 'X2', dim: 'X', text: 'Avez-vous managé des équipes de façon régulière ?', options: [{ value:1,label:'Jamais'},{value:2,label:'Équipes < 3 pers.'},{value:3,label:'Équipes 3-10 pers.'},{value:4,label:'Équipes 10-30 pers.'},{value:5,label:'Équipes > 30 pers.'}] },
  { id: 'X3', dim: 'X', text: 'Quelle est la complexité des projets que vous avez dirigés ?', options: [{ value:1,label:'Tâches simples'},{value:2,label:'Projets locaux'},{value:3,label:'Projets transverses'},{value:4,label:'Programmes multi-équipes'},{value:5,label:'Transformations stratégiques'}] },
  { id: 'X4', dim: 'X', text: 'Avez-vous une expérience internationale (travail à l\'étranger ou projets multiculturels) ?', options: [{ value:1,label:'Aucune'},{value:2,label:'Quelques missions'},{value:3,label:'1-2 ans à l\'étranger'},{value:4,label:'3-5 ans à l\'étranger'},{value:5,label:'> 5 ans / mobilité multiple'}] },
  { id: 'X5', dim: 'X', text: 'Avez-vous créé ou cofondé une organisation (entreprise, projet, association) ?', options: [{ value:1,label:'Non'},{value:2,label:'Projet associatif'},{value:3,label:'Startup/freelance'},{value:4,label:'PME créée'},{value:5,label:'Plusieurs entreprises créées'}] },
  { id: 'X6', dim: 'X', text: 'Votre évolution de carrière a-t-elle été rapide par rapport à votre secteur ?', options: AGR5 },

  // ── LIFE SCORE (L) — 6 questions ─────────────────────────────────────────
  { id: 'L1', dim: 'L', text: 'Je suis épanoui(e) dans mon travail actuel (ou ma dernière expérience).', options: AGR5 },
  { id: 'L2', dim: 'L', text: 'Mes valeurs personnelles sont alignées avec les valeurs de mon employeur.', options: AGR5 },
  { id: 'L3', dim: 'L', text: 'J\'arrive à maintenir un équilibre sain entre vie pro et vie perso.', options: AGR5 },
  { id: 'L4', dim: 'L', text: 'Je me sens en bonne santé physique et mentale.', options: AGR5 },
  { id: 'L5', dim: 'L', text: 'J\'ai des activités enrichissantes en dehors du travail (sport, art, famille, engagement).', options: AGR5 },
  { id: 'L6', dim: 'L', text: 'Je me sens optimiste concernant l\'évolution de ma carrière.', options: AGR5 },

  // ── RISQUE (R) — 4 questions (inversées) ─────────────────────────────────
  { id: 'R1', dim: 'R', inverse: true, text: 'Je me sens souvent débordé(e) et sous pression au travail.', options: AGR5 },
  { id: 'R2', dim: 'R', inverse: true, text: 'J\'ai du mal à déconnecter du travail le soir ou le week-end.', options: AGR5 },
  { id: 'R3', dim: 'R', inverse: true, text: 'Je ressens régulièrement un manque de sens ou de reconnaissance dans mon travail.', options: AGR5 },
  { id: 'R4', dim: 'R', inverse: true, text: 'Des conflits récurrents avec ma hiérarchie ou mes collègues perturbent mon efficacité.', options: AGR5 },
];

export const FAMILY_PROFILES: Record<EnergyFamily, string[]> = {
  pilotes:        ['Le Stratège', 'Le Commandant', 'Le Visionnaire'],
  initialiseurs:  ['L\'Innovateur', 'Le Créatif', 'L\'Explorateur'],
  accomplisseurs: ['L\'Expert', 'Le Bâtisseur', 'L\'Optimiseur'],
  dynamiseurs:    ['Le Connecteur', 'L\'Ambassadeur', 'L\'Énergiseur'],
  regulateurs:    ['Le Gardien', 'L\'Harmoniseur', 'Le Stabilisateur'],
};

export function computeAssessment(
  responses: Record<string, number>,
  scoreEnergy: number
): AssessmentResult {
  // Hard Skills
  const hQs = QUESTIONS.filter(q => q.dim === 'H');
  const H = Math.round((hQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / hQs.length) * 20);

  // Soft Skills
  const sQs = QUESTIONS.filter(q => q.dim === 'S');
  const S = Math.round((sQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / sQs.length) * 20);

  // Expérience
  const xQs = QUESTIONS.filter(q => q.dim === 'X');
  const X = Math.round((xQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / xQs.length) * 20);

  // Life Score
  const lQs = QUESTIONS.filter(q => q.dim === 'L');
  const L = Math.round((lQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / lQs.length) * 20);

  // Risque (inverse)
  const rQs = QUESTIONS.filter(q => q.dim === 'R');
  const rRaw = rQs.reduce((s, q) => s + (responses[q.id] ?? 3), 0) / rQs.length;
  const R    = Math.round(rRaw * 20); // 100 = risque max

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
  { key: 'H',   label: 'Compétences techniques',  questions: QUESTIONS.filter(q => q.dim === 'H') },
  { key: 'S',   label: 'Soft Skills',              questions: QUESTIONS.filter(q => q.dim === 'S') },
  { key: 'X',   label: 'Expérience',               questions: QUESTIONS.filter(q => q.dim === 'X') },
  { key: 'L',   label: 'Life Score',               questions: QUESTIONS.filter(q => q.dim === 'L') },
  { key: 'R',   label: 'Risques & bien-être',      questions: QUESTIONS.filter(q => q.dim === 'R') },
];
