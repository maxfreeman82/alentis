import { requireAuth } from '@/lib/supabase/user';
import { compute6DScore } from '@teranga/scoring';
import { recommendCandidate } from '@/lib/ai';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { z } from 'zod';

const BodySchema = z.object({
  organizationId: z.string().uuid(),
  jobId:          z.string().uuid(),
  passportId:     z.string().uuid(),
  scoreInput: z.object({
    hardSkills:  z.number().min(0).max(100),
    softSkills:  z.number().min(0).max(100),
    experience:  z.number().min(0).max(100),
    lifeScore:   z.number().min(0).max(100),
    energyFit:   z.number().min(0).max(100),
    stressRisk:  z.number().min(0).max(100),
    weights:     z.record(z.number()).optional(),
  }),
  jobContext:      z.record(z.unknown()).optional(),
  teamContext:     z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
  }

  const { organizationId, jobId, passportId, scoreInput, jobContext, teamContext } = parsed.data;

  // Calcul score 6D — on omet weights si absent pour respecter exactOptionalPropertyTypes
  const { weights, ...baseInput } = scoreInput;
  const result = compute6DScore(weights !== undefined ? { ...baseInput, weights } : baseInput);

  // Analyse IA (recommandation recrutement)
  const aiRec = await recommendCandidate(
    { id: jobId, ...jobContext },
    { id: passportId, score_6d: result.composite, ...scoreInput },
    teamContext ?? {}
  );

  // Sauvegarde dans applications
  const supabase = createServerClient();
  await setOrgContext(supabase, organizationId);

  const { data, error } = await supabase
    .from('applications')
    .upsert({
      job_id:          jobId,
      passport_id:     passportId,
      organization_id: organizationId,
      score_6d:        result.composite,
      score_breakdown: result.breakdown,
      ai_insight:      aiRec.recommendation,
    }, { onConflict: 'job_id,passport_id' })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: 'Erreur base de données', details: error.message }, { status: 500 });
  }

  return Response.json({
    application_id: data.id,
    score_6d:       result.composite,
    breakdown:      result.breakdown,
    color:          result.color,
    fit_score:      aiRec.fit_score,
    strengths:      aiRec.strengths,
    risks:          aiRec.risks,
    recommendation: aiRec.recommendation,
  });
}
