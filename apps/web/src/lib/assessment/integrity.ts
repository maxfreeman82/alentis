// Système d'intégrité des évaluations — cohérence des réponses + comportement de passage
// Principe : signaler, jamais bloquer. L'humain décide.

export type AssessmentType = 'energy_skills' | 'vision_pulse' | 'boussole';

// ─── Types paires miroir ───────────────────────────────────────────────────────

type PairType = 'positive' | 'negative_control';

interface MirrorPair {
  id:          string;
  type:        PairType;
  question_a:  string;
  question_b:  string;
  reverse_b?:  boolean;     // question B est inversée (ex: Vision Pulse reverse items)
  family_a?:   string;
  family_b?:   string;
  label:       string;
}

// ─── Paires miroir — Energy Skills (Talent Passport, Q IDs: P1-P5, I1-I5, …) ─

export const ENERGY_SKILLS_PAIRS: MirrorPair[] = [
  // ── Positives (même famille → doivent covarier) ──────────────────────────
  {
    id: 'ES_P1', type: 'positive', family_a: 'pilotes', family_b: 'pilotes',
    question_a: 'P1', question_b: 'P2',
    label: 'Décision rapide + Leadership naturel (Pilotes)',
  },
  {
    id: 'ES_P2', type: 'positive', family_a: 'pilotes', family_b: 'pilotes',
    question_a: 'P3', question_b: 'P5',
    label: 'Contourner obstacles + Besoin de défis (Pilotes)',
  },
  {
    id: 'ES_P3', type: 'positive', family_a: 'regulateurs', family_b: 'regulateurs',
    question_a: 'R2', question_b: 'R5',
    label: 'Identifier risques + Mémoire du groupe (Régulateurs)',
  },
  {
    id: 'ES_P4', type: 'positive', family_a: 'regulateurs', family_b: 'regulateurs',
    question_a: 'R3', question_b: 'R4',
    label: 'Avancer prudemment + Inconfort face aux risques (Régulateurs)',
  },
  {
    id: 'ES_P5', type: 'positive', family_a: 'initialiseurs', family_b: 'initialiseurs',
    question_a: 'I3', question_b: 'I4',
    label: 'Enthousiasme pour le nouveau + Problèmes = opportunités (Initialiseurs)',
  },
  {
    id: 'ES_P6', type: 'positive', family_a: 'initialiseurs', family_b: 'initialiseurs',
    question_a: 'I1', question_b: 'I5',
    label: 'Solutions inédites + Remettre en question les règles (Initialiseurs)',
  },
  {
    id: 'ES_P7', type: 'positive', family_a: 'dynamiseurs', family_b: 'dynamiseurs',
    question_a: 'D1', question_b: 'D2',
    label: 'Galvaniser les équipes + Remonter le moral (Dynamiseurs)',
  },
  {
    id: 'ES_P8', type: 'positive', family_a: 'accomplisseurs', family_b: 'accomplisseurs',
    question_a: 'A1', question_b: 'A2',
    label: 'Livrer impeccable + Finaliser ce que les autres abandonnent (Accomplisseurs)',
  },

  // ── Contrôles négatifs (familles opposées → les DEUX élevés = suspect) ───
  {
    id: 'ES_N1', type: 'negative_control', family_a: 'pilotes', family_b: 'regulateurs',
    question_a: 'P1', question_b: 'R3',
    label: 'Décision rapide vs Avancer prudemment (contrôle négatif Pilotes/Régulateurs)',
  },
  {
    id: 'ES_N2', type: 'negative_control', family_a: 'initialiseurs', family_b: 'accomplisseurs',
    question_a: 'I2', question_b: 'A3',
    label: 'Proposer idées risquées vs Se concentrer sur une tâche (contrôle négatif Init/Accompl)',
  },
];

// ─── Paires miroir — Vision Pulse (Q IDs: K1-K4, C1-C4, N1-N4, A1-A4, P1-P4) ─

export const VISION_PULSE_PAIRS: MirrorPair[] = [
  {
    id: 'VP_1', type: 'positive',
    question_a: 'K1', question_b: 'K4',
    label: 'Comprend la vision + Comprend les priorités 12 mois (Connaissance)',
  },
  {
    id: 'VP_2', type: 'positive',
    question_a: 'C1', question_b: 'C2',
    label: 'Confiance en la direction + Actions cohérentes avec valeurs (Crédibilité)',
  },
  {
    id: 'VP_3', type: 'positive',
    question_a: 'N2', question_b: 'N3', reverse_b: true,
    label: 'Inclus et respecté + Non isolé (Connexion — N3 inversé)',
  },
  {
    id: 'VP_4', type: 'positive',
    question_a: 'A1', question_b: 'A4', reverse_b: true,
    label: 'Ressources disponibles + Pas trop d\'obstacles (Capacité — A4 inversé)',
  },
  {
    id: 'VP_5', type: 'positive',
    question_a: 'P1', question_b: 'P4', reverse_b: true,
    label: 'Se voit ici dans 12 mois + N\'envisage pas de partir (Projection — P4 inversé)',
  },
];

// ─── Score de cohérence ────────────────────────────────────────────────────────

export interface CoherenceResult {
  score:             number;     // 0–100
  positive_total:    number;
  positive_coherent: number;
  incoherent_pairs:  string[];   // IDs des paires positives incohérentes
  negative_triggers: string[];   // IDs des contrôles négatifs déclenchés
  flags:             string[];
}

const POSITIVE_MAX_GAP    = 1;   // |scoreA - scoreB| <= 1 → cohérent (échelle 1-5)
const NEGATIVE_MIN_SCORE  = 4;   // les deux >= 4 → contrôle négatif déclenché
const NEGATIVE_PENALTY_PT = 10;  // pts retirés par contrôle négatif déclenché

export function computeCoherenceScore(
  responses: Record<string, number>,
  pairs: MirrorPair[],
): CoherenceResult {
  const positivePairs  = pairs.filter(p => p.type === 'positive');
  const negativeControls = pairs.filter(p => p.type === 'negative_control');

  const incoherentPairs:  string[] = [];
  const negativeTriggers: string[] = [];
  let coherentCount  = 0;
  let evaluatedCount = 0;

  for (const pair of positivePairs) {
    const rawA = responses[pair.question_a];
    const rawB = responses[pair.question_b];
    if (rawA === undefined || rawB === undefined) continue;
    evaluatedCount++;
    const effA = rawA;
    const effB = pair.reverse_b ? (6 - rawB) : rawB;
    if (Math.abs(effA - effB) <= POSITIVE_MAX_GAP) coherentCount++;
    else incoherentPairs.push(pair.id);
  }

  for (const pair of negativeControls) {
    const rawA = responses[pair.question_a];
    const rawB = responses[pair.question_b];
    if (rawA === undefined || rawB === undefined) continue;
    if (rawA >= NEGATIVE_MIN_SCORE && rawB >= NEGATIVE_MIN_SCORE) {
      negativeTriggers.push(pair.id);
    }
  }

  const baseScore = evaluatedCount > 0
    ? Math.round((coherentCount / evaluatedCount) * 100)
    : 100;
  const score = Math.max(0, baseScore - negativeTriggers.length * NEGATIVE_PENALTY_PT);

  const flags: string[] = [];
  if (incoherentPairs.length >= 3) {
    flags.push(`${incoherentPairs.length} paires miroir incohérentes — réponses possiblement stratégiques`);
  }
  if (negativeTriggers.length > 0) {
    flags.push(`${negativeTriggers.length} contrôle(s) négatif(s) déclenché(s) — profil contradictoire`);
  }

  return { score, positive_total: evaluatedCount, positive_coherent: coherentCount, incoherent_pairs: incoherentPairs, negative_triggers: negativeTriggers, flags };
}

// ─── Détection comportementale ─────────────────────────────────────────────────

export interface TimingRecord {
  question_id: string;
  time_ms:     number;
  focus_lost:  number;
}

export interface BehaviorResult {
  avg_time_ms:        number;
  std_dev_ms:         number;
  total_focus_losses: number;
  flags:              string[];
  is_flagged:         boolean;
}

const MIN_PLAUSIBLE_MS   = 3_000;  // < 3s/question = trop rapide
const ROBOT_MAX_STD_MS   = 600;    // σ < 600ms avec n≥10 = rythme robotique
const MAX_FOCUS_LOSSES   = 3;      // > 3 pertes de focus = suspect

export function detectBehaviorFlags(timing: TimingRecord[]): BehaviorResult {
  if (timing.length === 0) {
    return { avg_time_ms: 0, std_dev_ms: 0, total_focus_losses: 0, flags: [], is_flagged: false };
  }

  const times   = timing.map(t => t.time_ms);
  const avg     = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length;
  const std_dev = Math.sqrt(variance);
  const totalFocus = timing.reduce((s, t) => s + t.focus_lost, 0);

  const flags: string[] = [];
  if (avg < MIN_PLAUSIBLE_MS) {
    flags.push(`Temps moyen trop court (${Math.round(avg / 1000)}s/question — minimum attendu : 3s)`);
  }
  if (std_dev < ROBOT_MAX_STD_MS && timing.length >= 10) {
    flags.push(`Rythme anormalement uniforme — possible passage automatisé (σ = ${Math.round(std_dev)}ms)`);
  }
  if (totalFocus > MAX_FOCUS_LOSSES) {
    flags.push(`${totalFocus} pertes de focus — consultation possible d'une aide extérieure`);
  }

  return { avg_time_ms: Math.round(avg), std_dev_ms: Math.round(std_dev), total_focus_losses: totalFocus, flags, is_flagged: flags.length > 0 };
}

// ─── Détection de réponses uniformes ──────────────────────────────────────────

export function isResponsesUniform(responses: Record<string, number>): boolean {
  const vals = Object.values(responses).filter(v => typeof v === 'number');
  if (vals.length < 10) return false;
  return new Set(vals).size === 1;
}

// ─── Résultat d'intégrité global ──────────────────────────────────────────────

export interface IntegrityResult {
  coherence:    CoherenceResult;
  behavior:     BehaviorResult;
  uniform:      boolean;
  overall_flag: boolean;
  flags:        string[];
}

export function computeIntegrity(
  responses: Record<string, number>,
  timing:    TimingRecord[],
  type:      AssessmentType,
): IntegrityResult {
  const pairs     = type === 'vision_pulse' ? VISION_PULSE_PAIRS : ENERGY_SKILLS_PAIRS;
  const coherence = computeCoherenceScore(responses, pairs);
  const behavior  = detectBehaviorFlags(timing);
  const uniform   = isResponsesUniform(responses);

  const flags = [
    ...coherence.flags,
    ...behavior.flags,
    ...(uniform ? ['Toutes les réponses identiques — profil non différencié'] : []),
  ];

  const overall_flag =
    coherence.score < 60 ||
    behavior.is_flagged ||
    uniform ||
    coherence.negative_triggers.length > 0;

  return { coherence, behavior, uniform, overall_flag, flags };
}
