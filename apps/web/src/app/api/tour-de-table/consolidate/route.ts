import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';
import { consolidatePassport } from '@/lib/tour-de-table/consolidation';
import type { TdtAggregateData, PassportSoftScores } from '@/lib/tour-de-table/consolidation';

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

  // Récupérer les agrégats non encore consolidés
  const { data: aggregates } = await supabase
    .from('tdt_aggregates')
    .select('*')
    .eq('session_id', sessionId)
    .eq('organization_id', organizationId)
    .eq('passport_updated', false);

  if (!aggregates || aggregates.length === 0) {
    return NextResponse.json({ error: 'Aucun agrégat ou déjà consolidé' }, { status: 400 });
  }

  let updatedCount = 0;

  for (const agg of aggregates) {
    // Récupérer le passport actuel
    const { data: passport } = await supabase
      .from('talent_passports')
      .select('soft_communication,soft_leadership,soft_adaptability,soft_problem_solving,soft_critical_thinking,soft_collaboration,soft_stress_mgmt,soft_organization,soft_learning_speed,soft_emotional_intel,score_hard,score_energy')
      .eq('profile_id', agg.observed_id)
      .maybeSingle();

    if (!passport) continue;

    // Compter le nombre de sessions précédentes (pour le poids pair)
    const { count: sessionCount } = await supabase
      .from('tdt_aggregates')
      .select('*', { count: 'exact', head: true })
      .eq('observed_id', agg.observed_id)
      .eq('passport_updated', true);

    const aggregateData: TdtAggregateData = {
      observed_id:         agg.observed_id as string,
      score_fiabilite:     agg.score_fiabilite ?? 50,
      score_collaboration: agg.score_collaboration ?? 50,
      score_communication: agg.score_communication ?? 50,
      score_initiative:    agg.score_initiative ?? 50,
      score_adaptabilite:  agg.score_adaptabilite ?? 50,
      score_impact:        agg.score_impact ?? 50,
      score_bien_etre:     agg.score_bien_etre ?? 50,
      score_global_observed: agg.score_global_observed ?? 50,
      observer_count:      agg.observer_count ?? 0,
    };

    const updates = consolidatePassport(
      passport as PassportSoftScores,
      aggregateData,
      (sessionCount ?? 0) + 1
    );

    // Mettre à jour le passport
    await supabase.from('talent_passports').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('profile_id', agg.observed_id);

    // Marquer l'agrégat comme consolidé
    await supabase.from('tdt_aggregates').update({
      passport_updated:    true,
      passport_updated_at: new Date().toISOString(),
    }).eq('id', agg.id);

    updatedCount++;
  }

  // Marquer la session comme consolidée
  await supabase.from('tdt_sessions').update({
    status:          'consolidated',
    consolidated_at: new Date().toISOString(),
  }).eq('id', sessionId);

  return NextResponse.json({ ok: true, updated: updatedCount });
}
