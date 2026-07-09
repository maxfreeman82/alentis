// Fonctions statistiques pour la validation des paires miroir
// Principe : calibration empirique sur groupe pilote (cible 30-50 sessions)

// ─── Corrélation de Pearson ────────────────────────────────────────────────────

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    const dy = (ys[i] ?? 0) - meanY;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

// ─── Percentile ───────────────────────────────────────────────────────────────

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx    = Math.max(0, Math.floor((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

// ─── Médiane ──────────────────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0
    ? ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2
    : (s[m] ?? 0);
}

// ─── Écart-type ───────────────────────────────────────────────────────────────

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const v   = values.reduce((s, x) => s + (x - avg) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

// ─── Seuil de cohérence suggéré ───────────────────────────────────────────────
// Retourne le 15e percentile des scores de cohérence observés.
// Si < 30 sessions : retourner null (pas assez de données).

export function suggestCoherenceThreshold(scores: number[]): number | null {
  if (scores.length < 15) return null;
  return Math.round(percentile(scores, 15));
}

// ─── Seuil de temps suggéré ───────────────────────────────────────────────────
// Retourne le 5e percentile du temps moyen par question.
// Les sessions sous ce seuil sont anormalement rapides.

export function suggestSpeedThreshold(avgTimesMs: number[]): number | null {
  if (avgTimesMs.length < 15) return null;
  return Math.round(percentile(avgTimesMs, 5));
}

// ─── Qualification de la corrélation ──────────────────────────────────────────

export type CorrelationStrength = 'strong' | 'moderate' | 'weak' | 'insufficient';

export function qualifyCorrelation(r: number, n: number): CorrelationStrength {
  if (n < 10) return 'insufficient';
  if (r >= 0.50) return 'strong';
  if (r >= 0.30) return 'moderate';
  return 'weak';
}

// ─── Résultat par paire ───────────────────────────────────────────────────────

export interface PairStats {
  pairId:         string;
  label:          string;
  type:           'positive' | 'negative_control';
  question_a:     string;
  question_b:     string;
  n:              number;         // nombre de sessions évaluées
  r:              number;         // corrélation de Pearson (paires positives)
  strength:       CorrelationStrength;
  coherent_pct:   number;         // % de sessions où la paire est cohérente (paires positives)
  trigger_pct:    number;         // % de sessions où le contrôle négatif est déclenché
  recommendation: string;
}

// ─── Résultat global ─────────────────────────────────────────────────────────

export interface ValidationReport {
  session_count:          number;
  target:                 number;    // 30 sessions minimum recommandées
  progress_pct:           number;
  pairs:                  PairStats[];
  coherence_distribution: number[];  // scores de cohérence de toutes les sessions
  current_threshold:      number;    // seuil actuellement en usage (60)
  suggested_threshold:    number | null;
  timing_p5_ms:           number | null;  // 5e percentile des temps moyens
  avg_coherence:          number;
  avg_time_ms:            number;
  flagged_pct:            number;    // % de sessions flaggées
}
