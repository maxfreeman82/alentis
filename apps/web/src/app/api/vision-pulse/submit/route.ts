import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computePulseResult } from '@/lib/vision-pulse/survey';
import { getUserOrg } from '@/lib/supabase/auth';

const SubmitSchema = z.object({
  quarter:   z.number().int().min(1).max(4),
  year:      z.number().int().min(2020).max(2099),
  responses: z.record(z.string(), z.number().int().min(1).max(5)),
});

export async function POST(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId, profileId } = ctx;

  const body = await req.json() as unknown;
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { quarter, year, responses } = parsed.data;
  const result = computePulseResult(responses);
  const { byDimension } = result;

  // Sauvegarder la réponse individuelle (1 par profil par trimestre via UNIQUE)
  const { error: respError } = await supabase
    .from('vision_pulse_responses')
    .upsert({
      organization_id: organizationId,
      profile_id:      profileId,
      quarter,
      year,
      responses:       responses as unknown,
      dim_knowledge:   byDimension.knowledge   ?? null,
      dim_credibility: byDimension.credibility ?? null,
      dim_connection:  byDimension.connection  ?? null,
      dim_capability:  byDimension.capability  ?? null,
      dim_projection:  byDimension.projection  ?? null,
      adhesion_score:  result.adhesionScore,
      submitted_at:    new Date().toISOString(),
    }, { onConflict: 'organization_id,profile_id,quarter,year' });

  if (respError) return NextResponse.json({ error: respError.message }, { status: 500 });

  // Recalculer l'agrégat depuis TOUTES les réponses du trimestre (évite les doublons)
  const { data: allResponses, error: aggFetchError } = await supabase
    .from('vision_pulse_responses')
    .select('dim_knowledge,dim_credibility,dim_connection,dim_capability,dim_projection,adhesion_score')
    .eq('organization_id', organizationId)
    .eq('quarter', quarter)
    .eq('year', year);

  if (aggFetchError) return NextResponse.json({ error: aggFetchError.message }, { status: 500 });

  const count = allResponses?.length ?? 1;

  function avg(key: 'dim_knowledge' | 'dim_credibility' | 'dim_connection' | 'dim_capability' | 'dim_projection' | 'adhesion_score'): number {
    const sum = (allResponses ?? []).reduce((acc, r) => acc + (r[key] ?? 0), 0);
    return Math.round((sum / count) * 100) / 100;
  }

  const { count: employeeCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  const { error: upsertError } = await supabase
    .from('vision_pulses')
    .upsert({
      organization_id: organizationId,
      quarter,
      year,
      avg_knowledge:   avg('dim_knowledge'),
      avg_credibility: avg('dim_credibility'),
      avg_connection:  avg('dim_connection'),
      avg_capability:  avg('dim_capability'),
      avg_projection:  avg('dim_projection'),
      adhesion_score:  avg('adhesion_score'),
      participation:   count,
      total_employees: employeeCount ?? count,
    }, { onConflict: 'organization_id,quarter,year' });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({
    success:       true,
    adhesionScore: result.adhesionScore,
    label:         result.label,
    byDimension:   result.byDimension,
    riskSignals:   result.riskSignals,
  });
}
