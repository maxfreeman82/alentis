import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';
import { computeAssessment } from '@/lib/talent/assessment';

const schema = z.object({
  responses: z.record(z.string(), z.number().min(1).max(5)),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = computeAssessment(parsed.data.responses);

  const { error } = await ctx.supabase.from('talent_passports').upsert(
    {
      profile_id:            ctx.profileId,
      organization_id:       ctx.organizationId || null,
      score_global:          result.score_global,
      score_hard:            result.scores.H,
      score_soft:            result.scores.S,
      score_exp:             result.scores.X,
      score_life:            result.scores.L,
      score_energy:          result.scores.energy[result.dominant_family],
      score_risk:            result.score_risk,
      growth_potential:      result.growth_potential,
      transfer_score:        result.transfer_score,
      energy_pilotes:        result.scores.energy.pilotes,
      energy_initialiseurs:  result.scores.energy.initialiseurs,
      energy_accomplisseurs: result.scores.energy.accomplisseurs,
      energy_dynamiseurs:    result.scores.energy.dynamiseurs,
      energy_regulateurs:    result.scores.energy.regulateurs,
      dominant_family:       result.dominant_family,
      dominant_profile:      result.dominant_profile,
      energy_level:          result.energy_level,
      last_assessment:       new Date().toISOString(),
      passport_id:           `TP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}-SN`,
    },
    { onConflict: 'profile_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, score_global: result.score_global });
}
