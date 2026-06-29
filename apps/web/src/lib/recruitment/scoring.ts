// Moteur de matching 6D pour le pipeline recrutement
// Compare le Talent Passport d'un candidat avec les critères d'un poste

export interface JobRequirements {
  min_score_global:  number;    // seuil minimum global (défaut 60)
  weights_6d?:       Partial<Weights6D>;
  soft_thresholds?:  Partial<SoftThresholds>;
  required_family?:  string;    // famille énergétique souhaitée
}

export interface Weights6D {
  H: number; S: number; X: number; L: number; E: number; R: number;
}

export interface SoftThresholds {
  communication:    number;
  leadership:       number;
  adaptability:     number;
  collaboration:    number;
  stress_mgmt:      number;
  organization:     number;
  learning_speed:   number;
  emotional_intel:  number;
}

export interface PassportData {
  score_hard:       number;
  score_soft:       number;
  score_exp:        number;
  score_life:       number;
  score_energy:     number;
  score_risk:       number;
  score_global:     number;
  dominant_family:  string | null;
  energy_pilotes:         number;
  energy_initialiseurs:   number;
  energy_accomplisseurs:  number;
  energy_dynamiseurs:     number;
  energy_regulateurs:     number;
  soft_communication:    number;
  soft_leadership:       number;
  soft_adaptability:     number;
  soft_collaboration:    number;
  soft_stress_mgmt:      number;
  soft_organization:     number;
  soft_learning_speed:   number;
  soft_emotional_intel:  number;
}

const DEFAULT_WEIGHTS: Weights6D = { H: 0.25, S: 0.20, X: 0.15, L: 0.10, E: 0.20, R: 0.10 };

export interface MatchResult {
  scoreComposite:  number;    // 0-100 score de matching
  score6D:         number;    // score 6D pur
  scoreSoft:       number;    // conformité soft skills
  scoreEnergy:     number;    // adéquation énergie
  gaps:            Gap[];
  strengths:       string[];
  recommendation:  'fort' | 'moyen' | 'faible' | 'eliminatoire';
  aiPromptContext: string;    // contexte pour générer l'analyse IA
}

export interface Gap {
  dimension: string;
  required:  number;
  actual:    number;
  delta:     number;
}

export function computeMatch(passport: PassportData, job: JobRequirements): MatchResult {
  const w = { ...DEFAULT_WEIGHTS, ...job.weights_6d };

  // Score 6D pondéré (R = risque, soustrait)
  const riskPenalty = passport.score_risk > 70
    ? w.R * Math.pow(passport.score_risk / 100, 2)
    : w.R * (passport.score_risk / 100);

  const score6D = Math.round(Math.max(0, Math.min(100,
    w.H * (passport.score_hard / 100) +
    w.S * (passport.score_soft / 100) +
    w.X * (passport.score_exp / 100) +
    w.L * (passport.score_life / 100) +
    w.E * (passport.score_energy / 100) -
    riskPenalty
  ) * 100));

  // Conformité soft skills
  let softPenalty = 0;
  const gaps: Gap[] = [];
  if (job.soft_thresholds) {
    const thresholds = job.soft_thresholds;
    const softMap: Record<string, number> = {
      communication:   passport.soft_communication,
      leadership:      passport.soft_leadership,
      adaptability:    passport.soft_adaptability,
      collaboration:   passport.soft_collaboration,
      stress_mgmt:     passport.soft_stress_mgmt,
      organization:    passport.soft_organization,
      learning_speed:  passport.soft_learning_speed,
      emotional_intel: passport.soft_emotional_intel,
    };

    for (const [key, threshold] of Object.entries(thresholds)) {
      if (threshold === undefined) continue;
      const actual = softMap[key] ?? 0;
      const delta  = actual - threshold;
      if (delta < 0) {
        softPenalty += Math.abs(delta) * 0.3;
        gaps.push({ dimension: key, required: threshold, actual, delta });
      }
    }
  }

  const scoreSoft = Math.max(0, 100 - softPenalty);

  // Adéquation énergétique
  let scoreEnergy = 50; // neutre par défaut
  if (job.required_family) {
    const energyMap: Record<string, number> = {
      pilotes:        passport.energy_pilotes,
      initialiseurs:  passport.energy_initialiseurs,
      accomplisseurs: passport.energy_accomplisseurs,
      dynamiseurs:    passport.energy_dynamiseurs,
      regulateurs:    passport.energy_regulateurs,
    };
    scoreEnergy = energyMap[job.required_family] ?? 50;
    if (passport.dominant_family === job.required_family) scoreEnergy = Math.min(100, scoreEnergy + 10);
  }

  // Score composite : 6D(50%) + soft(30%) + énergie(20%)
  const scoreComposite = Math.round(
    0.50 * score6D +
    0.30 * scoreSoft +
    0.20 * scoreEnergy
  );

  // Forces
  const strengths: string[] = [];
  if (passport.score_hard >= 75)  strengths.push('Hard skills solides');
  if (passport.score_soft >= 75)  strengths.push('Soft skills développés');
  if (passport.score_exp >= 70)   strengths.push('Expérience pertinente');
  if (passport.score_energy >= 70) strengths.push('Énergie alignée');
  if (passport.score_risk < 30)   strengths.push('Risque stress faible');

  const recommendation: MatchResult['recommendation'] =
    scoreComposite >= 80 && gaps.length === 0 ? 'fort'         :
    scoreComposite >= 65                       ? 'moyen'        :
    scoreComposite >= 50                       ? 'faible'       : 'eliminatoire';

  const aiPromptContext = `Score composite ${scoreComposite}/100. 6D: ${score6D}. Énergie: ${scoreEnergy}. Gaps: ${gaps.map(g => `${g.dimension} (requis ${g.required}, actuel ${Math.round(g.actual)})`).join(', ') || 'aucun'}. Forces: ${strengths.join(', ')}.`;

  return { scoreComposite, score6D, scoreSoft, scoreEnergy, gaps, strengths, recommendation, aiPromptContext };
}

// Couleur selon le score de matching
export function matchColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 65) return '#0EA5E9';
  if (score >= 50) return '#F59E0B';
  return '#F43F5E';
}

export const KANBAN_STAGES = [
  { id: 'new',        label: 'Nouveau',       color: '#8B5CF6', colorBg: 'rgba(139,92,246,0.08)' },
  { id: 'screening',  label: 'Présélection',  color: '#0EA5E9', colorBg: 'rgba(14,165,233,0.08)' },
  { id: 'interview',  label: 'Entretien',     color: '#F97316', colorBg: 'rgba(249,115,22,0.08)' },
  { id: 'assessment', label: 'Évaluation',    color: '#F59E0B', colorBg: 'rgba(245,158,11,0.08)' },
  { id: 'offer',      label: 'Offre',         color: '#10B981', colorBg: 'rgba(16,185,129,0.08)' },
  { id: 'hired',      label: 'Recruté',       color: '#84CC16', colorBg: 'rgba(132,204,22,0.08)'  },
] as const;

export type KanbanStage = typeof KANBAN_STAGES[number]['id'];
export const KANBAN_STAGE_IDS = KANBAN_STAGES.map(s => s.id);
