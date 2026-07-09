import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { ENERGY_SKILLS_PAIRS, VISION_PULSE_PAIRS } from '@/lib/assessment/integrity';
import {
  pearsonCorrelation,
  percentile,
  stdDev,
  median,
  qualifyCorrelation,
  suggestCoherenceThreshold,
  suggestSpeedThreshold,
  type PairStats,
  type ValidationReport,
} from '@/lib/assessment/statistics';

const TARGET_SESSIONS = 30;

export async function GET(req: Request) {
  const user  = await requireAuth();
  const admin = createAdminClient();

  // Super admin uniquement
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const url  = new URL(req.url);
  const type = (url.searchParams.get('type') ?? 'energy_skills') as 'energy_skills' | 'vision_pulse';

  // Toutes les sessions complètes du type demandé
  const { data: sessions } = await admin
    .from('assessment_sessions')
    .select('id, responses, coherence_score, behavior_flags, is_flagged')
    .eq('assessment_type', type)
    .eq('status', 'completed')
    .not('responses', 'eq', '{}');

  const rows = (sessions ?? []) as Array<{
    id:              string;
    responses:       Record<string, number>;
    coherence_score: number | null;
    behavior_flags:  string[];
    is_flagged:      boolean;
  }>;

  // Timing moyen par session
  const { data: timingRows } = await admin
    .from('assessment_timing')
    .select('session_id, time_ms')
    .in('session_id', rows.map(r => r.id));

  const timingBySession: Record<string, number[]> = {};
  for (const t of timingRows ?? []) {
    if (!timingBySession[t.session_id]) timingBySession[t.session_id] = [];
    timingBySession[t.session_id]!.push(t.time_ms);
  }

  const avgTimesMs = rows.map(r => {
    const times = timingBySession[r.id] ?? [];
    if (times.length === 0) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }).filter((v): v is number => v !== null);

  // ─── Analyse par paire ────────────────────────────────────────────────────

  const pairs = type === 'vision_pulse' ? VISION_PULSE_PAIRS : ENERGY_SKILLS_PAIRS;

  const pairStats: PairStats[] = pairs.map(pair => {
    const xys = rows
      .map(s => {
        const rawA = s.responses[pair.question_a];
        const rawB = s.responses[pair.question_b];
        if (rawA === undefined || rawB === undefined) return null;
        const effA = rawA;
        const effB = (pair as { reverse_b?: boolean }).reverse_b ? (6 - rawB) : rawB;
        return { a: effA, b: effB, rawA, rawB };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const n = xys.length;
    const xs = xys.map(v => v.a);
    const ys = xys.map(v => v.b);

    if (pair.type === 'positive') {
      const r             = pearsonCorrelation(xs, ys);
      const coherentCount = xys.filter(v => Math.abs(v.a - v.b) <= 1).length;
      const coherent_pct  = n > 0 ? Math.round((coherentCount / n) * 100) : 0;
      const strength      = qualifyCorrelation(r, n);

      const recommendation =
        strength === 'strong'       ? 'Paire validée — corrélation forte. Conserver telle quelle.' :
        strength === 'moderate'     ? 'Paire acceptable — surveiller avec davantage de données.' :
        strength === 'weak'         ? 'Paire faible — reformuler l\'une des deux questions.' :
        /* insufficient */            `Données insuffisantes (${n}/${TARGET_SESSIONS} sessions).`;

      return {
        pairId: pair.id, label: pair.label, type: 'positive',
        question_a: pair.question_a, question_b: pair.question_b,
        n, r: Math.round(r * 100) / 100, strength,
        coherent_pct, trigger_pct: 0,
        recommendation,
      };
    } else {
      // Contrôle négatif — % déclenchés
      const triggered    = xys.filter(v => v.rawA >= 4 && v.rawB >= 4).length;
      const trigger_pct  = n > 0 ? Math.round((triggered / n) * 100) : 0;
      const recommendation =
        n < 10          ? `Données insuffisantes (${n}/${TARGET_SESSIONS} sessions).` :
        trigger_pct > 30 ? 'Contrôle trop souvent déclenché — ce profil combiné peut être réel, pas une fraude.' :
        trigger_pct < 5  ? 'Excellent — contrôle rarement déclenché sans raison légitime.' :
                           'Contrôle fonctionnel — taux cohérent avec une population normale.';

      return {
        pairId: pair.id, label: pair.label, type: 'negative_control',
        question_a: pair.question_a, question_b: pair.question_b,
        n, r: 0, strength: 'insufficient',
        coherent_pct: 0, trigger_pct,
        recommendation,
      };
    }
  });

  // ─── Distributions globales ───────────────────────────────────────────────

  const coherenceScores = rows
    .map(r => r.coherence_score)
    .filter((v): v is number => v !== null);

  const flaggedCount = rows.filter(r => r.is_flagged).length;

  const report: ValidationReport = {
    session_count:          rows.length,
    target:                 TARGET_SESSIONS,
    progress_pct:           Math.min(100, Math.round((rows.length / TARGET_SESSIONS) * 100)),
    pairs:                  pairStats,
    coherence_distribution: coherenceScores,
    current_threshold:      60,
    suggested_threshold:    suggestCoherenceThreshold(coherenceScores),
    timing_p5_ms:           suggestSpeedThreshold(avgTimesMs),
    avg_coherence:          coherenceScores.length > 0
      ? Math.round(coherenceScores.reduce((a, b) => a + b, 0) / coherenceScores.length)
      : 0,
    avg_time_ms:            avgTimesMs.length > 0
      ? Math.round(avgTimesMs.reduce((a, b) => a + b, 0) / avgTimesMs.length)
      : 0,
    flagged_pct:            rows.length > 0
      ? Math.round((flaggedCount / rows.length) * 100)
      : 0,
  };

  return NextResponse.json(report);
}
