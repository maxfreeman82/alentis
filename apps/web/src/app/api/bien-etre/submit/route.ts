import { requireAuth } from '@/lib/supabase/user';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeWellbeing } from '@/lib/wellbeing/survey';
import { getUserOrg } from '@/lib/supabase/auth';

const Schema = z.object({
  responses: z.record(z.string(), z.number().int().min(1).max(5)),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = computeWellbeing(parsed.data.responses);
  const now    = new Date();

  const { supabase, organizationId, profileId } = ctx;

  const { error } = await supabase.from('wellbeing_surveys').upsert({
    organization_id: organizationId,
    profile_id:      profileId,
    month:           now.getMonth() + 1,
    year:            now.getFullYear(),
    score_global:    result.globalScore,
    score_stress:    result.byDimension.stress,
    score_balance:   result.byDimension.balance,
    score_relations: result.byDimension.relations,
    score_meaning:   result.byDimension.meaning,
    score_autonomy:  result.byDimension.autonomy,
    burnout_risk:    result.burnoutRisk,
    responses:       parsed.data.responses,
  }, { onConflict: 'profile_id,month,year' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success:     true,
    globalScore: result.globalScore,
    burnoutRisk: result.burnoutRisk,
    label:       result.label,
    alerts:      result.alerts,
  });
}
