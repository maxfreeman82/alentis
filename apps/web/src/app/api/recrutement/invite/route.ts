import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/user';
import { getUserOrg } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { compute6DScore } from '@teranga/scoring';
import { z } from 'zod';

const schema = z.object({
  passportId: z.string().uuid(),
  jobId:      z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const ctx  = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

  const { passportId, jobId } = parsed.data;
  const { organizationId }    = ctx;
  const admin                 = createAdminClient();

  // Vérifier que le job appartient à l'org
  const { data: job } = await admin
    .from('jobs')
    .select('id, organization_id, requirements')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 });

  // Vérifier que le passport existe et calculer le score 6D
  const { data: passport } = await admin
    .from('talent_passports')
    .select('id, score_hard, score_soft, score_exp, score_life, score_energy, score_risk, energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs')
    .eq('id', passportId)
    .maybeSingle();

  if (!passport) return NextResponse.json({ error: 'Passport introuvable' }, { status: 404 });

  // Calculer le score 6D (energy fit selon la famille requise)
  const reqs   = (job.requirements ?? {}) as Record<string, unknown>;
  const family = ((reqs.required_family as string) ?? '').toLowerCase();
  const eKey   = `energy_${family}` as keyof typeof passport;
  const energyFit = (passport[eKey] as number | null) ?? passport.score_energy ?? 50;

  const result = compute6DScore({
    hardSkills: passport.score_hard   ?? 0,
    softSkills: passport.score_soft   ?? 0,
    experience: passport.score_exp    ?? 0,
    lifeScore:  passport.score_life   ?? 0,
    energyFit,
    stressRisk: passport.score_risk   ?? 50,
  });

  // Créer ou mettre à jour la candidature (invitation de l'org)
  const { data: existing } = await admin
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('passport_id', passportId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyInvited: true, id: existing.id });
  }

  const { data: application, error } = await admin
    .from('applications')
    .insert({
      job_id:          jobId,
      passport_id:     passportId,
      organization_id: organizationId,
      stage:           'new',
      score_6d:        result.composite,
      score_breakdown: result.breakdown,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: application.id, score_6d: result.composite }, { status: 201 });
}
