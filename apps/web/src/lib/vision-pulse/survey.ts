// Vision Pulse — Survey adhésion 5 dimensions
// 20 questions, échelle 1-5, calcul score IAS

export type PulseDimension =
  | 'knowledge'     // Je connais la vision
  | 'credibility'   // Je crois en la vision
  | 'connection'    // Je me sens connecté à la vision
  | 'capability'    // Je me sens capable de contribuer
  | 'projection';   // Je me projette dans cette organisation

export interface PulseQuestion {
  id: string;
  dimension: PulseDimension;
  text: string;
  reverse?: boolean; // score inversé (5 → 1)
}

export const PULSE_QUESTIONS: PulseQuestion[] = [
  // ── CONNAISSANCE (je sais où on va) ─────────────────────────────────────────
  { id: 'K1', dimension: 'knowledge',
    text: 'Je comprends clairement la vision et les objectifs de mon organisation pour cette année.' },
  { id: 'K2', dimension: 'knowledge',
    text: 'Je sais comment mon travail contribue aux OKRs de l\'organisation.' },
  { id: 'K3', dimension: 'knowledge',
    text: 'Je suis informé(e) régulièrement des avancées et des résultats collectifs.' },
  { id: 'K4', dimension: 'knowledge',
    text: 'Je comprends les priorités stratégiques de mon organisation pour les 12 prochains mois.' },

  // ── CRÉDIBILITÉ (je crois en la direction) ───────────────────────────────────
  { id: 'C1', dimension: 'credibility',
    text: 'Je crois que la direction prend les bonnes décisions pour l\'avenir de l\'organisation.' },
  { id: 'C2', dimension: 'credibility',
    text: 'Les actions menées sont cohérentes avec les valeurs et la vision annoncées.' },
  { id: 'C3', dimension: 'credibility',
    text: 'Je fais confiance à mon manager direct pour me guider dans ma mission.' },
  { id: 'C4', dimension: 'credibility',
    text: 'Je pense que l\'organisation est sur la bonne voie pour atteindre ses ambitions.',
    reverse: false },

  // ── CONNEXION (je me sens appartenir) ───────────────────────────────────────
  { id: 'N1', dimension: 'connection',
    text: 'Je me sens fier(e) de faire partie de cette organisation.' },
  { id: 'N2', dimension: 'connection',
    text: 'Je me sens inclus(e) et respecté(e) dans mon équipe au quotidien.' },
  { id: 'N3', dimension: 'connection',
    text: 'Je me sens seul(e) ou isolé(e) dans mon travail.',
    reverse: true },
  { id: 'N4', dimension: 'connection',
    text: 'Je recommanderais cette organisation à quelqu\'un de mon entourage comme bon endroit où travailler.' },

  // ── CAPACITÉ (je me sens équipé) ────────────────────────────────────────────
  { id: 'A1', dimension: 'capability',
    text: 'J\'ai les ressources et outils nécessaires pour bien faire mon travail.' },
  { id: 'A2', dimension: 'capability',
    text: 'Je me sens soutenu(e) pour monter en compétence et progresser dans mon rôle.' },
  { id: 'A3', dimension: 'capability',
    text: 'Mon manager reconnaît et valorise mes contributions.' },
  { id: 'A4', dimension: 'capability',
    text: 'Je rencontre trop d\'obstacles qui m\'empêchent d\'être efficace.',
    reverse: true },

  // ── PROJECTION (je vois mon avenir ici) ─────────────────────────────────────
  { id: 'P1', dimension: 'projection',
    text: 'Je me vois encore dans cette organisation dans 12 mois.' },
  { id: 'P2', dimension: 'projection',
    text: 'Je pense que cette organisation m\'offre des opportunités d\'évolution.' },
  { id: 'P3', dimension: 'projection',
    text: 'Je serais prêt(e) à faire des efforts supplémentaires pour aider l\'organisation à réussir.' },
  { id: 'P4', dimension: 'projection',
    text: 'J\'envisage activement de quitter cette organisation dans les 6 prochains mois.',
    reverse: true },
];

export const DIMENSIONS: Record<PulseDimension, { label: string; color: string; icon: string; weight: number }> = {
  knowledge:   { label: 'Connaissance',  color: '#0EA5E9', icon: '🧭', weight: 0.20 },
  credibility: { label: 'Crédibilité',   color: '#8B5CF6', icon: '🤝', weight: 0.25 },
  connection:  { label: 'Connexion',     color: '#10B981', icon: '💚', weight: 0.20 },
  capability:  { label: 'Capacité',      color: '#F97316', icon: '⚡', weight: 0.20 },
  projection:  { label: 'Projection',    color: '#F59E0B', icon: '🚀', weight: 0.15 },
};

const DIM_ORDER: PulseDimension[] = ['knowledge', 'credibility', 'connection', 'capability', 'projection'];

export interface PulseResult {
  byDimension: Record<PulseDimension, number>;
  adhesionScore: number;
  label: string;
  responseCount: number;
  riskSignals: string[];
}

export function computePulseResult(responses: Record<string, number>): PulseResult {
  const byDim = {} as Record<PulseDimension, number[]>;
  for (const d of DIM_ORDER) byDim[d] = [];

  for (const q of PULSE_QUESTIONS) {
    const raw = responses[q.id];
    if (raw === undefined) continue;
    const score = q.reverse ? (6 - raw) : raw;
    byDim[q.dimension].push(score);
  }

  const dimScores = {} as Record<PulseDimension, number>;
  let weightedSum = 0;

  for (const d of DIM_ORDER) {
    const vals = byDim[d] ?? [];
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
    dimScores[d] = Math.round((avg / 5) * 100);
    weightedSum += dimScores[d] * (DIMENSIONS[d]?.weight ?? 0.2);
  }

  const adhesionScore = Math.round(weightedSum);

  const label =
    adhesionScore >= 85 ? 'Ambassadeur'  :
    adhesionScore >= 70 ? 'Engagé'       :
    adhesionScore >= 55 ? 'Neutre'       :
    adhesionScore >= 40 ? 'Désengagé'   : 'En rupture';

  // Signaux de risque
  const riskSignals: string[] = [];
  if ((dimScores.projection ?? 0) < 50)   riskSignals.push('Risque départ élevé (Projection < 50)');
  if ((dimScores.credibility ?? 0) < 55)  riskSignals.push('Déficit de confiance en la direction');
  if ((dimScores.connection ?? 0) < 50)   riskSignals.push('Sentiment d\'isolement détecté');
  if ((dimScores.capability ?? 0) < 50)   riskSignals.push('Manque de ressources ou de reconnaissance');

  return {
    byDimension:   dimScores,
    adhesionScore,
    label,
    responseCount: Object.keys(responses).length,
    riskSignals,
  };
}
