// Gestion de session d'évaluation — unicité, reprise, randomisation
// Logique pure (sans appels Supabase)

export type AssessmentType = 'energy_skills' | 'vision_pulse' | 'boussole';
export type SessionStatus  = 'started' | 'completed' | 'expired';

export interface AssessmentSession {
  id:              string;
  profile_id:      string;
  organization_id: string | null;
  assessment_type: AssessmentType;
  cycle_key:       string;
  status:          SessionStatus;
  current_index:   number;
  question_order:  string[];
  option_shuffles: Record<string, number[]> | null;
  responses:       Record<string, number | string>;
  started_at:      string;
  updated_at:      string;
  expires_at:      string;
  completed_at:    string | null;
  coherence_score: number | null;
  behavior_flags:  string[];
  is_flagged:      boolean;
  is_reviewed:     boolean;
}

// ─── Clé de cycle ──────────────────────────────────────────────────────────────

// energy_skills et boussole : annuel ('2025')
// vision_pulse : trimestriel ('2025-Q2')
export function getCycleKey(type: AssessmentType, now = new Date()): string {
  const year    = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return type === 'vision_pulse' ? `${year}-Q${quarter}` : `${year}`;
}

// ─── Durée de validité de session ─────────────────────────────────────────────

const EXPIRY_MS: Record<AssessmentType, number> = {
  energy_skills: 2 * 60 * 60 * 1000,   // 2 heures  (40 questions)
  vision_pulse:  45 * 60 * 1000,        // 45 minutes (20 questions)
  boussole:      60 * 60 * 1000,        // 1 heure   (30 questions)
};

export function getExpiresAt(type: AssessmentType, startedAt = new Date()): Date {
  return new Date(startedAt.getTime() + EXPIRY_MS[type]);
}

export function isSessionExpired(
  session: { status: string; expires_at: string },
): boolean {
  if (session.status === 'expired') return true;
  return new Date(session.expires_at) < new Date();
}

// ─── Randomisation ─────────────────────────────────────────────────────────────

// Fisher-Yates shuffle (côté serveur uniquement — pas de seed partagé avec le client)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function buildQuestionOrder(questionIds: string[]): string[] {
  return shuffle(questionIds);
}

// Pour le Boussole : mélange l'ordre des options (indices 0..n-1) par question
export function buildOptionShuffles(
  questionIds: string[],
  optionCount: number,
): Record<string, number[]> {
  const base = Array.from({ length: optionCount }, (_, i) => i);
  return Object.fromEntries(questionIds.map(id => [id, shuffle(base)]));
}

// ─── IDs de questions par type ────────────────────────────────────────────────

export const QUESTION_IDS: Record<AssessmentType, string[]> = {
  energy_skills: [
    'P1','P2','P3','P4','P5',
    'I1','I2','I3','I4','I5',
    'A1','A2','A3','A4','A5',
    'D1','D2','D3','D4','D5',
    'R1','R2','R3','R4','R5',
    'SS1','SS2','SS3','SS4','SS5','SS6','SS7','SS8','SS9','SS10',
  ],
  vision_pulse: ['K1','K2','K3','K4','C1','C2','C3','C4','N1','N2','N3','N4','A1','A2','A3','A4','P1','P2','P3','P4'],
  // Boussole : 5 catégories × 5 questions (Ambition, Croissance, Culture, Risque, Horizon)
  boussole: [
    'A1','A2','A3','A4','A5',
    'C1','C2','C3','C4','C5',
    'CU1','CU2','CU3','CU4','CU5',
    'R1','R2','R3','R4','R5',
    'H1','H2','H3','H4','H5',
  ],
};

// ─── Vérification de complétude ────────────────────────────────────────────────

export function isSessionComplete(
  responses: Record<string, number | string>,
  type: AssessmentType,
): boolean {
  const ids = QUESTION_IDS[type];
  // Soft check : toutes les questions énergétiques et soft doivent être répondues
  // On accepte un maximum de 2 oublis (questions de contrôle optionnelles)
  const answered = ids.filter(id => responses[id] !== undefined).length;
  return answered >= ids.length - 2;
}
