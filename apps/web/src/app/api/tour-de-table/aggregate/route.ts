import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { getUserOrg } from '@/lib/supabase/auth';
import { TDT_DIMENSIONS, TDT_ALL_ITEM_KEYS, computeDimensionScore, computeGlobalObservedScore } from '@/lib/tour-de-table/dimensions';
import { guard1MinObservers, guard3OutlierDetection, guard6TemporalConsistency, guard7ParticipationThreshold } from '@/lib/tour-de-table/safety-guards';
import type { ObservationRow } from '@/lib/tour-de-table/safety-guards';

const schema = z.object({ sessionId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await requireAuth();

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });
  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId } = parsed.data;

  const { data: session } = await supabase
    .from('tdt_sessions').select('*').eq('id', sessionId).eq('organization_id', organizationId).maybeSingle();
  if (!session || session.status !== 'closed') {
    return NextResponse.json({ error: 'Session non clôturée' }, { status: 400 });
  }

  // Récupérer toutes les observations de la session
  const { data: rawObs } = await supabase
    .from('tdt_observations')
    .select('*')
    .eq('session_id', sessionId);

  if (!rawObs || rawObs.length === 0) {
    return NextResponse.json({ error: 'Aucune observation' }, { status: 400 });
  }

  const participantIds    = (session.participant_ids as string[]) ?? [];
  const submittedObservers = new Set(rawObs.map(o => o.observer_id as string));

  // Garde 7 : participation globale
  const partGuard = guard7ParticipationThreshold(
    participantIds.length,
    submittedObservers.size,
    session.participation_threshold ?? 0.70
  );

  // Transformer rawObs en ObservationRow[]
  const allRows: ObservationRow[] = rawObs.map(o => ({
    observer_id: o.observer_id as string,
    observed_id: o.observed_id as string,
    scores:      TDT_ALL_ITEM_KEYS.map(k => (o as Record<string, unknown>)[k] as number),
  }));

  // Agréger pour chaque personne observée
  const observedIds = [...new Set(allRows.map(r => r.observed_id))];
  const aggregates  = [];

  for (const observedId of observedIds) {
    const obsForPerson = allRows.filter(r => r.observed_id === observedId);

    // Garde 3 : outliers
    const { flaggedObservers, check: outlierCheck } = guard3OutlierDetection(observedId, allRows);

    // Garde 1 : min observers
    const minGuard = guard1MinObservers(observedId, allRows);

    // Filtrer les outliers pour le calcul
    const validObs = obsForPerson.filter(o => !flaggedObservers.includes(o.observer_id));

    if (validObs.length === 0) continue;

    // Calculer les scores par dimension
    const dimensionScores: Record<string, number> = {};
    for (const dim of TDT_DIMENSIONS) {
      const dimScores = validObs.map(o => {
        const resp: Record<string, number> = {};
        TDT_ALL_ITEM_KEYS.forEach((k, i) => { resp[k] = o.scores[i] ?? 0; });
        return computeDimensionScore(dim.id, resp);
      });
      dimensionScores[dim.id] = Math.round(dimScores.reduce((a, b) => a + b, 0) / dimScores.length);
    }

    const globalScore = Math.round(Object.values(dimensionScores).reduce((a, b) => a + b, 0) / TDT_DIMENSIONS.length);

    // Garde 6 : cohérence temporelle (chercher trimestre précédent)
    const prevQ  = session.quarter === 1 ? 4 : session.quarter - 1;
    const prevY  = session.quarter === 1 ? session.year - 1 : session.year;
    const { data: prevAgg } = await supabase
      .from('tdt_aggregates')
      .select('score_global_observed')
      .eq('observed_id', observedId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    const temporalCheck = guard6TemporalConsistency(globalScore, prevAgg?.score_global_observed ?? null);

    const safetyChecks = [minGuard, outlierCheck, temporalCheck, partGuard];

    aggregates.push({
      session_id:             sessionId,
      organization_id:        organizationId as string,
      observed_id:            observedId,
      observer_count:         validObs.length,
      score_fiabilite:        dimensionScores['fiabilite'] ?? null,
      score_collaboration:    dimensionScores['collaboration'] ?? null,
      score_communication:    dimensionScores['communication'] ?? null,
      score_initiative:       dimensionScores['initiative'] ?? null,
      score_adaptabilite:     dimensionScores['adaptabilite'] ?? null,
      score_impact:           dimensionScores['impact'] ?? null,
      score_bien_etre:        dimensionScores['bien_etre'] ?? null,
      score_global_observed:  globalScore,
      has_outlier_flag:       !outlierCheck.passed,
      has_participation_flag: !partGuard.passed,
      has_big_drop_flag:      !temporalCheck.passed,
      delta_vs_previous:      prevAgg ? globalScore - (prevAgg.score_global_observed ?? 0) : null,
      safety_checks:          safetyChecks as unknown,
    });

    // Flaguer les outliers dans la table observations
    if (flaggedObservers.length > 0) {
      await supabase.from('tdt_observations')
        .update({ is_flagged_outlier: true })
        .eq('session_id', sessionId)
        .in('observer_id', flaggedObservers);
    }
  }

  // Upsert tous les agrégats
  if (aggregates.length > 0) {
    await supabase.from('tdt_aggregates').upsert(aggregates, { onConflict: 'session_id,observed_id' });
  }

  return NextResponse.json({ ok: true, aggregated: aggregates.length });
}
