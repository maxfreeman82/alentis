export type WellbeingDimension = 'stress' | 'balance' | 'relations' | 'meaning' | 'autonomy';

export interface WellbeingQuestion {
  id:        string;
  dimension: WellbeingDimension;
  text:      string;
  reverse?:  boolean;
}

export const WELLBEING_DIMENSIONS: Record<WellbeingDimension, { label: string; color: string; icon: string; weight: number }> = {
  stress:    { label: 'Gestion du stress',       color: '#F43F5E', icon: '⚡', weight: 0.25 },
  balance:   { label: 'Équilibre vie pro/perso',  color: '#F97316', icon: '⚖️', weight: 0.25 },
  relations: { label: 'Relations au travail',      color: '#10B981', icon: '🤝', weight: 0.20 },
  meaning:   { label: 'Sens & engagement',         color: '#8B5CF6', icon: '💡', weight: 0.15 },
  autonomy:  { label: 'Autonomie & développement', color: '#0EA5E9', icon: '🚀', weight: 0.15 },
};

export const WELLBEING_QUESTIONS: WellbeingQuestion[] = [
  // ── STRESS ──────────────────────────────────────────────────────────────────
  { id: 'S1', dimension: 'stress', text: 'Je me sens dépassé(e) par la charge de travail ce mois-ci.', reverse: true },
  { id: 'S2', dimension: 'stress', text: 'Je parviens à récupérer correctement après les journées intenses.' },
  { id: 'S3', dimension: 'stress', text: 'Je ressens des tensions physiques liées au travail (fatigue, maux de tête…).', reverse: true },
  { id: 'S4', dimension: 'stress', text: 'Je me sens serein(e) et en contrôle de mon environnement de travail.' },

  // ── ÉQUILIBRE ────────────────────────────────────────────────────────────────
  { id: 'B1', dimension: 'balance', text: 'Mon travail empiète régulièrement sur ma vie personnelle et familiale.', reverse: true },
  { id: 'B2', dimension: 'balance', text: 'Je parviens à déconnecter en dehors de mes heures de travail.' },
  { id: 'B3', dimension: 'balance', text: 'Mon emploi du temps me permet de maintenir des activités personnelles importantes.' },
  { id: 'B4', dimension: 'balance', text: 'Je me sens souvent épuisé(e) à la fin de la semaine.', reverse: true },

  // ── RELATIONS ────────────────────────────────────────────────────────────────
  { id: 'R1', dimension: 'relations', text: 'Je me sens bien entouré(e) et soutenu(e) par mes collègues.' },
  { id: 'R2', dimension: 'relations', text: 'Il m\'arrive de vivre des tensions ou conflits difficiles au travail.', reverse: true },
  { id: 'R3', dimension: 'relations', text: 'Mon manager se soucie réellement de mon bien-être.' },
  { id: 'R4', dimension: 'relations', text: 'Je me sens reconnu(e) et valorisé(e) dans mon équipe.' },

  // ── SENS ─────────────────────────────────────────────────────────────────────
  { id: 'M1', dimension: 'meaning', text: 'Mon travail a du sens et contribue à quelque chose d\'important.' },
  { id: 'M2', dimension: 'meaning', text: 'Je me sens fier(e) de l\'impact que j\'ai dans mon organisation.' },
  { id: 'M3', dimension: 'meaning', text: 'Certains jours, j\'ai du mal à trouver de la motivation pour travailler.', reverse: true },
  { id: 'M4', dimension: 'meaning', text: 'Mes valeurs personnelles sont en alignement avec celles de mon organisation.' },

  // ── AUTONOMIE ────────────────────────────────────────────────────────────────
  { id: 'A1', dimension: 'autonomy', text: 'J\'ai suffisamment d\'autonomie pour faire mon travail à ma façon.' },
  { id: 'A2', dimension: 'autonomy', text: 'Je sens que je progresse et développe mes compétences dans mon rôle.' },
  { id: 'A3', dimension: 'autonomy', text: 'Je me sens bloqué(e) dans ma progression professionnelle.', reverse: true },
  { id: 'A4', dimension: 'autonomy', text: 'Je dispose du temps et des ressources pour me former et progresser.' },
];

export interface WellbeingResult {
  byDimension:  Record<WellbeingDimension, number>;
  globalScore:  number;
  burnoutRisk:  number;
  label:        string;
  alerts:       string[];
}

const DIM_KEYS: WellbeingDimension[] = ['stress', 'balance', 'relations', 'meaning', 'autonomy'];

export function computeWellbeing(responses: Record<string, number>): WellbeingResult {
  const byDim: Record<WellbeingDimension, number[]> = {
    stress: [], balance: [], relations: [], meaning: [], autonomy: [],
  };

  for (const q of WELLBEING_QUESTIONS) {
    const raw = responses[q.id];
    if (raw === undefined) continue;
    const val = q.reverse ? (6 - raw) : raw;
    byDim[q.dimension].push(val);
  }

  const dimScores = {} as Record<WellbeingDimension, number>;
  let weighted = 0;

  for (const d of DIM_KEYS) {
    const vals = byDim[d];
    const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
    dimScores[d] = Math.round((avg / 5) * 100);
    weighted += dimScores[d] * (WELLBEING_DIMENSIONS[d]?.weight ?? 0.2);
  }

  const globalScore = Math.round(weighted);

  // Burnout risk : surtout stress + balance inversés
  const stressRaw  = 100 - (dimScores.stress  ?? 50);
  const balanceRaw = 100 - (dimScores.balance ?? 50);
  const burnoutRisk = Math.round(stressRaw * 0.5 + balanceRaw * 0.3 + Math.max(0, 60 - (dimScores.meaning ?? 60)) * 0.2);

  const label =
    globalScore >= 80 ? 'Épanoui'     :
    globalScore >= 65 ? 'Satisfait'   :
    globalScore >= 50 ? 'Neutre'      :
    globalScore >= 35 ? 'En tension'  : 'En détresse';

  const alerts: string[] = [];
  if (burnoutRisk > 65)              alerts.push('Risque de burnout élevé — accompagnement recommandé');
  if ((dimScores.stress  ?? 0) < 45) alerts.push('Score stress très bas — charge de travail à revoir');
  if ((dimScores.balance ?? 0) < 45) alerts.push('Déséquilibre vie pro/perso détecté');
  if ((dimScores.meaning ?? 0) < 45) alerts.push('Perte de sens ou désengagement — entretien conseillé');

  return { byDimension: dimScores, globalScore, burnoutRisk, label, alerts };
}
