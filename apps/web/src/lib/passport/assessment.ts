// Questionnaire Energy Skills — 40 questions
// 5 familles × 5 questions énergie + 10 questions soft skills

export type EnergyFamilyId = 'pilotes' | 'initialiseurs' | 'accomplisseurs' | 'dynamiseurs' | 'regulateurs';
export type SoftSkillId =
  | 'communication' | 'leadership' | 'adaptability' | 'problem_solving'
  | 'critical_thinking' | 'collaboration' | 'stress_mgmt' | 'organization'
  | 'learning_speed' | 'emotional_intel';

export interface AssessmentQuestion {
  id: string;
  type: 'energy' | 'soft';
  family?: EnergyFamilyId;
  soft_skill?: SoftSkillId;
  text: string;
  options: { value: number; label: string }[];
}

// Échelle commune pour l'énergie : 1=Pas du tout moi → 5=Exactement moi
const ENERGY_SCALE = [
  { value: 1, label: 'Pas du tout moi' },
  { value: 2, label: 'Rarement' },
  { value: 3, label: 'Parfois' },
  { value: 4, label: 'Souvent' },
  { value: 5, label: 'Exactement moi' },
];

// Échelle soft skills : 1=Jamais → 5=Toujours
const SOFT_SCALE = [
  { value: 1, label: 'Jamais' },
  { value: 2, label: 'Rarement' },
  { value: 3, label: 'Parfois' },
  { value: 4, label: 'Souvent' },
  { value: 5, label: 'Toujours' },
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // ── PILOTES (Leaders, orientés résultats) ────────────────────────────
  { id: 'P1', type: 'energy', family: 'pilotes',
    text: 'J\'aime prendre les décisions rapidement même sans toutes les informations.',
    options: ENERGY_SCALE },
  { id: 'P2', type: 'energy', family: 'pilotes',
    text: 'Je me sens naturellement à ma place quand je dirige un groupe vers un objectif.',
    options: ENERGY_SCALE },
  { id: 'P3', type: 'energy', family: 'pilotes',
    text: 'Face à un obstacle, ma première réaction est de trouver comment le contourner coûte que coûte.',
    options: ENERGY_SCALE },
  { id: 'P4', type: 'energy', family: 'pilotes',
    text: 'Je préfère un environnement où les résultats sont mesurés et récompensés.',
    options: ENERGY_SCALE },
  { id: 'P5', type: 'energy', family: 'pilotes',
    text: 'Je m\'ennuie rapidement quand je n\'ai pas de défi ou d\'objectif ambitieux à atteindre.',
    options: ENERGY_SCALE },

  // ── INITIALISEURS (Créatifs, lanceurs d'idées) ───────────────────────
  { id: 'I1', type: 'energy', family: 'initialiseurs',
    text: 'J\'aime imaginer des solutions qui n\'ont jamais été testées auparavant.',
    options: ENERGY_SCALE },
  { id: 'I2', type: 'energy', family: 'initialiseurs',
    text: 'Je suis souvent celui qui propose une idée nouvelle en réunion, même si elle semble risquée.',
    options: ENERGY_SCALE },
  { id: 'I3', type: 'energy', family: 'initialiseurs',
    text: 'Je m\'enthousiasme vite pour de nouveaux projets et j\'ai du mal à rester sur les anciens.',
    options: ENERGY_SCALE },
  { id: 'I4', type: 'energy', family: 'initialiseurs',
    text: 'Je perçois les problèmes comme des opportunités de créer quelque chose de nouveau.',
    options: ENERGY_SCALE },
  { id: 'I5', type: 'energy', family: 'initialiseurs',
    text: 'J\'aime travailler dans des environnements où les règles peuvent être remises en question.',
    options: ENERGY_SCALE },

  // ── ACCOMPLISSEURS (Exécutants, finisseurs) ──────────────────────────
  { id: 'A1', type: 'energy', family: 'accomplisseurs',
    text: 'Je ressens une grande satisfaction à livrer un travail impeccable dans les délais.',
    options: ENERGY_SCALE },
  { id: 'A2', type: 'energy', family: 'accomplisseurs',
    text: 'Je suis celui qui finalise les projets que les autres ont du mal à terminer.',
    options: ENERGY_SCALE },
  { id: 'A3', type: 'energy', family: 'accomplisseurs',
    text: 'Je préfère me concentrer sur une tâche à la fois et la faire parfaitement.',
    options: ENERGY_SCALE },
  { id: 'A4', type: 'energy', family: 'accomplisseurs',
    text: 'J\'ai du mal à passer à autre chose si le travail en cours n\'est pas terminé correctement.',
    options: ENERGY_SCALE },
  { id: 'A5', type: 'energy', family: 'accomplisseurs',
    text: 'Je suis connu pour ma fiabilité — si je dis que je ferai quelque chose, c\'est fait.',
    options: ENERGY_SCALE },

  // ── DYNAMISEURS (Fédérateurs, communicants) ──────────────────────────
  { id: 'D1', type: 'energy', family: 'dynamiseurs',
    text: 'Je suis naturellement à l\'aise pour motiver et galvaniser les équipes autour d\'une vision.',
    options: ENERGY_SCALE },
  { id: 'D2', type: 'energy', family: 'dynamiseurs',
    text: 'Je suis souvent l\'élément qui remonte le moral du groupe quand l\'ambiance est tendue.',
    options: ENERGY_SCALE },
  { id: 'D3', type: 'energy', family: 'dynamiseurs',
    text: 'Je crée facilement des connexions entre des personnes très différentes.',
    options: ENERGY_SCALE },
  { id: 'D4', type: 'energy', family: 'dynamiseurs',
    text: 'Je m\'épanouis dans les environnements sociaux et les interactions humaines m\'énergisent.',
    options: ENERGY_SCALE },
  { id: 'D5', type: 'energy', family: 'dynamiseurs',
    text: 'Je pense naturellement à comment les décisions vont affecter les personnes concernées.',
    options: ENERGY_SCALE },

  // ── RÉGULATEURS (Garants, stabilisateurs) ───────────────────────────
  { id: 'R1', type: 'energy', family: 'regulateurs',
    text: 'Je veille naturellement au respect des règles, des process et des normes en vigueur.',
    options: ENERGY_SCALE },
  { id: 'R2', type: 'energy', family: 'regulateurs',
    text: 'Je suis souvent celui qui identifie les risques avant qu\'ils ne deviennent des problèmes.',
    options: ENERGY_SCALE },
  { id: 'R3', type: 'energy', family: 'regulateurs',
    text: 'Je préfère avancer prudemment en m\'assurant que chaque étape est solide.',
    options: ENERGY_SCALE },
  { id: 'R4', type: 'energy', family: 'regulateurs',
    text: 'Je ressens un inconfort quand l\'équipe prend des risques non mesurés.',
    options: ENERGY_SCALE },
  { id: 'R5', type: 'energy', family: 'regulateurs',
    text: 'Je suis la mémoire du groupe — je rappelle les engagements passés et les leçons apprises.',
    options: ENERGY_SCALE },

  // ── SOFT SKILLS ──────────────────────────────────────────────────────
  { id: 'SS1', type: 'soft', soft_skill: 'communication',
    text: 'Je m\'exprime clairement à l\'écrit et à l\'oral, en adaptant mon langage à mon interlocuteur.',
    options: SOFT_SCALE },
  { id: 'SS2', type: 'soft', soft_skill: 'leadership',
    text: 'Je prends naturellement l\'initiative de guider un groupe même sans mandat formel.',
    options: SOFT_SCALE },
  { id: 'SS3', type: 'soft', soft_skill: 'adaptability',
    text: 'Je m\'adapte rapidement et sereinement aux changements de priorités ou d\'environnement.',
    options: SOFT_SCALE },
  { id: 'SS4', type: 'soft', soft_skill: 'problem_solving',
    text: 'Face à un problème complexe, je décompose méthodiquement les causes et les solutions.',
    options: SOFT_SCALE },
  { id: 'SS5', type: 'soft', soft_skill: 'critical_thinking',
    text: 'Je remets en question les hypothèses et les solutions évidentes avant de les accepter.',
    options: SOFT_SCALE },
  { id: 'SS6', type: 'soft', soft_skill: 'collaboration',
    text: 'Je contribue activement au succès collectif, même quand ce n\'est pas dans ma fiche de poste.',
    options: SOFT_SCALE },
  { id: 'SS7', type: 'soft', soft_skill: 'stress_mgmt',
    text: 'Je maintiens mon efficacité et ma sérénité même sous forte pression ou délais serrés.',
    options: SOFT_SCALE },
  { id: 'SS8', type: 'soft', soft_skill: 'organization',
    text: 'Je planifie mon travail efficacement et je respecte naturellement mes engagements de temps.',
    options: SOFT_SCALE },
  { id: 'SS9', type: 'soft', soft_skill: 'learning_speed',
    text: 'J\'apprends vite de nouvelles compétences et je m\'approprie rapidement de nouveaux outils.',
    options: SOFT_SCALE },
  { id: 'SS10', type: 'soft', soft_skill: 'emotional_intel',
    text: 'Je perçois les émotions des autres et j\'adapte ma communication à leur état.',
    options: SOFT_SCALE },
];

export const ENERGY_FAMILIES: Record<EnergyFamilyId, { label: string; color: string; description: string }> = {
  pilotes:        { label: 'Pilotes',        color: '#F97316', description: 'Orientés résultats, leadership décisionnel' },
  initialiseurs:  { label: 'Initialiseurs',  color: '#8B5CF6', description: 'Créatifs, lanceurs d\'idées, avant-gardistes' },
  accomplisseurs: { label: 'Accomplisseurs', color: '#10B981', description: 'Fiables, finisseurs, qualité d\'exécution' },
  dynamiseurs:    { label: 'Dynamiseurs',    color: '#0EA5E9', description: 'Fédérateurs, communicants, empathiques' },
  regulateurs:    { label: 'Régulateurs',    color: '#F59E0B', description: 'Garants des process, vigilance et stabilité' },
};

// Calcule le profil énergétique à partir des réponses
export function computeEnergyProfile(responses: Record<string, number>): {
  scores: Record<EnergyFamilyId, number>;
  dominant: EnergyFamilyId;
  energyLevel: string;
  total: number;
} {
  const families: EnergyFamilyId[] = ['pilotes', 'initialiseurs', 'accomplisseurs', 'dynamiseurs', 'regulateurs'];
  const prefixes: Record<EnergyFamilyId, string> = {
    pilotes: 'P', initialiseurs: 'I', accomplisseurs: 'A', dynamiseurs: 'D', regulateurs: 'R',
  };

  const rawScores = {} as Record<EnergyFamilyId, number>;
  let totalRaw = 0;

  for (const family of families) {
    const prefix = prefixes[family];
    const qs = [1, 2, 3, 4, 5].map((n) => responses[`${prefix}${n}`] ?? 3);
    const avg = qs.reduce((a, b) => a + b, 0) / qs.length;
    rawScores[family] = Math.round(avg * 20); // 0-100
    totalRaw += rawScores[family];
  }

  // Normaliser en pourcentages (somme = 100)
  const normalizedScores = {} as Record<EnergyFamilyId, number>;
  for (const family of families) {
    normalizedScores[family] = Math.round(((rawScores[family] ?? 0) / Math.max(1, totalRaw)) * 100);
  }

  const dominant = families.reduce((a, b) =>
    (normalizedScores[a] ?? 0) >= (normalizedScores[b] ?? 0) ? a : b
  );

  const avgRaw = totalRaw / 5;
  const energyLevel =
    avgRaw >= 85 ? 'C5' :
    avgRaw >= 70 ? 'C4' :
    avgRaw >= 55 ? 'C3' :
    avgRaw >= 40 ? 'C2' : 'C1';

  return { scores: normalizedScores, dominant, energyLevel, total: Math.round(avgRaw) };
}

// Calcule les scores soft skills (0-100)
export function computeSoftSkills(responses: Record<string, number>): Record<SoftSkillId, number> {
  const softIds: Array<[string, SoftSkillId]> = [
    ['SS1', 'communication'], ['SS2', 'leadership'],    ['SS3', 'adaptability'],
    ['SS4', 'problem_solving'], ['SS5', 'critical_thinking'], ['SS6', 'collaboration'],
    ['SS7', 'stress_mgmt'], ['SS8', 'organization'],   ['SS9', 'learning_speed'],
    ['SS10', 'emotional_intel'],
  ];

  const result = {} as Record<SoftSkillId, number>;
  for (const [qId, skillId] of softIds) {
    result[skillId] = Math.round(((responses[qId] ?? 3) / 5) * 100);
  }
  return result;
}

// Score global soft skills (moyenne pondérée)
export function computeAvgSoftScore(softScores: Record<SoftSkillId, number>): number {
  const values = Object.values(softScores);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
