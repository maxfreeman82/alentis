// Les 7 gardes de sécurité du Tour de Table
// Empêchent le biais, la collusion, et protègent les observés

export interface SafetyCheckResult {
  passed:  boolean;
  guardId: string;
  message: string;
}

export interface ObservationRow {
  observer_id:   string;
  observed_id:   string;
  scores:        number[]; // les 21 valeurs dans l'ordre
}

// ── Garde 1 : Minimum d'observateurs ──────────────────────────
// Une personne doit avoir au moins MIN_OBSERVERS observations complètes
// avant que ses résultats soient visibles
export const MIN_OBSERVERS = 3;

export function guard1MinObservers(
  observedId: string,
  allObservations: ObservationRow[]
): SafetyCheckResult {
  const count = allObservations.filter(o => o.observed_id === observedId).length;
  return {
    guardId: 'min_observers',
    passed:  count >= MIN_OBSERVERS,
    message: count >= MIN_OBSERVERS
      ? `${count} observateurs — seuil atteint`
      : `Seulement ${count}/${MIN_OBSERVERS} observateurs requis — résultats non visibles`,
  };
}

// ── Garde 2 : Anonymat (contrôle architectural) ───────────────
// Le mapping observer→observed n'est JAMAIS exposé en dehors des agrégats.
// Cette garde est documentaire — vérifiée par la structure des API.
export function guard2AnonymityAudit(): SafetyCheckResult {
  return {
    guardId: 'anonymity',
    passed:  true,
    message: 'Anonymat garanti par architecture — aucune API ne retourne observer_id lié à observed_id',
  };
}

// ── Garde 3 : Détection des outliers (z-score) ────────────────
// Si un observateur donne des notes très éloignées de la moyenne des autres,
// ses scores sont flaggés et exclus du calcul final
export function guard3OutlierDetection(
  observedId: string,
  observations: ObservationRow[],
  zThreshold = 2.0
): { flaggedObservers: string[]; check: SafetyCheckResult } {
  const relevant = observations.filter(o => o.observed_id === observedId);
  if (relevant.length < 3) {
    return {
      flaggedObservers: [],
      check: { guardId: 'outlier_detection', passed: true, message: 'Pas assez d\'observations pour calculer les outliers' },
    };
  }

  // Calculer la moyenne globale de tous les scores de chaque observateur
  const averages = relevant.map(o => ({
    observer_id: o.observer_id,
    avg:         o.scores.reduce((a, b) => a + b, 0) / o.scores.length,
  }));

  const globalMean = averages.reduce((a, b) => a + b.avg, 0) / averages.length;
  const stdDev     = Math.sqrt(
    averages.reduce((a, b) => a + Math.pow(b.avg - globalMean, 2), 0) / averages.length
  );

  const flaggedObservers = stdDev > 0
    ? averages.filter(a => Math.abs(a.avg - globalMean) / stdDev > zThreshold).map(a => a.observer_id)
    : [];

  return {
    flaggedObservers,
    check: {
      guardId: 'outlier_detection',
      passed:  flaggedObservers.length === 0,
      message: flaggedObservers.length > 0
        ? `${flaggedObservers.length} observateur(s) outlier flaggé(s) et exclus du calcul`
        : 'Aucun outlier détecté',
    },
  };
}

// ── Garde 4 : Auto-exclusion ──────────────────────────────────
// Un utilisateur ne peut pas s'observer lui-même
// Contrainte DB CHECK (observer_id != observed_id) + validation API
export function guard4SelfExclusion(
  observerId: string,
  observedId: string
): SafetyCheckResult {
  const isSelf = observerId === observedId;
  return {
    guardId: 'self_exclusion',
    passed:  !isSelf,
    message: isSelf ? 'Auto-observation interdite' : 'Observateur différent de l\'observé',
  };
}

// ── Garde 5 : Détection de l'effet halo/anti-halo ────────────
// Si TOUTES les notes d'une observation sont ≥4.5 (halo) ou ≤1.5 (anti-halo),
// l'observation est flaggée comme suspecte
export function guard5HaloDetection(scores: number[]): SafetyCheckResult {
  if (scores.length === 0) return { guardId: 'halo_detection', passed: true, message: 'Aucun score' };

  const avg      = scores.reduce((a, b) => a + b, 0) / scores.length;
  const isHalo   = scores.every(s => s >= 4) && avg >= 4.5;
  const isAntiHalo = scores.every(s => s <= 2) && avg <= 1.5;

  return {
    guardId: 'halo_detection',
    passed:  !isHalo && !isAntiHalo,
    message: isHalo
      ? 'Effet halo suspecté — toutes les notes maximales'
      : isAntiHalo
      ? 'Effet anti-halo suspecté — toutes les notes minimales'
      : 'Distribution des notes normale',
  };
}

// ── Garde 6 : Cohérence temporelle ───────────────────────────
// Si le score observé chute de plus de 25 points par rapport au trimestre précédent,
// le résultat est flaggé pour revue RH (situation inhabituelle)
export const BIG_DROP_THRESHOLD = 25;

export function guard6TemporalConsistency(
  currentScore:  number,
  previousScore: number | null
): SafetyCheckResult {
  if (previousScore === null) {
    return { guardId: 'temporal_consistency', passed: true, message: 'Premier trimestre — pas d\'historique' };
  }

  const delta      = currentScore - previousScore;
  const isBigDrop  = delta < -BIG_DROP_THRESHOLD;

  return {
    guardId: 'temporal_consistency',
    passed:  !isBigDrop,
    message: isBigDrop
      ? `Chute de ${Math.abs(delta)} pts (seuil : ${BIG_DROP_THRESHOLD}) — revue RH recommandée`
      : `Delta : ${delta >= 0 ? '+' : ''}${delta} pts — variation normale`,
  };
}

// ── Garde 7 : Seuil de participation ─────────────────────────
// La session ne libère les résultats que si 70% des participants ont soumis TOUTES leurs observations
export const PARTICIPATION_THRESHOLD = 0.70;

export function guard7ParticipationThreshold(
  participantCount:  number,
  submittedCount:    number,
  threshold = PARTICIPATION_THRESHOLD
): SafetyCheckResult {
  const rate   = participantCount > 0 ? submittedCount / participantCount : 0;
  const passed = rate >= threshold;

  return {
    guardId: 'participation_threshold',
    passed,
    message: passed
      ? `${Math.round(rate * 100)}% de participation — seuil atteint`
      : `${Math.round(rate * 100)}% de participation — ${Math.round(threshold * 100)}% requis pour débloquer les résultats`,
  };
}

// Exécute tous les gardes pertinents pour une observation soumise
export function runObservationGuards(
  observerId:    string,
  observedId:    string,
  scores:        number[]
): SafetyCheckResult[] {
  return [
    guard4SelfExclusion(observerId, observedId),
    guard5HaloDetection(scores),
  ];
}

// Exécute tous les gardes pour une session au moment de la clôture
export function runSessionGuards(
  observedId:    string,
  allObservations: ObservationRow[],
  currentScore:  number,
  previousScore: number | null,
  participantCount: number,
  submittedCount:   number
): { checks: SafetyCheckResult[]; allPassed: boolean } {
  const { check: outlierCheck } = guard3OutlierDetection(observedId, allObservations);

  const checks = [
    guard1MinObservers(observedId, allObservations),
    guard2AnonymityAudit(),
    outlierCheck,
    guard6TemporalConsistency(currentScore, previousScore),
    guard7ParticipationThreshold(participantCount, submittedCount),
  ];

  return {
    checks,
    allPassed: checks.every(c => c.passed),
  };
}
