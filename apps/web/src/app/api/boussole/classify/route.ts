import { withAuth } from '@workos-inc/authkit-nextjs';
import { classifyVision } from '@/lib/ai';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { scoreResponsesByArchetype } from '@/lib/boussole/questions';
import { ARCHETYPE_LABELS } from '@teranga/scoring';
import type { Archetype } from '@teranga/types';
import { z } from 'zod';

const BodySchema = z.object({
  responses:      z.record(z.string(), z.string()),
  organizationId: z.string().uuid(),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
  }

  const { responses, organizationId } = parsed.data;

  // Calcul scores locaux pour la divergence
  const localScores = scoreResponsesByArchetype(responses);
  const totalResponses = Object.keys(responses).length;
  const topArchetype = (Object.entries(localScores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'CONQUERANTE') as Archetype;
  const topScore = localScores[topArchetype] ?? 0;
  const divergenceScore = Math.round((topScore / Math.max(1, totalResponses)) * 100);

  // Classification par Claude
  const aiResult = await classifyVision({ responses, local_scores: localScores });
  const archetype = (aiResult.archetype as Archetype | undefined) ?? topArchetype;
  const visionStatement = aiResult.vision_statement ?? `Organisation de type ${ARCHETYPE_LABELS[archetype]}`;

  // Sauvegarde Supabase
  const supabase = createServerClient();
  await setOrgContext(supabase, organizationId);

  const { data, error } = await supabase
    .from('vision_assessments')
    .insert({
      organization_id:  organizationId,
      responses,
      archetype,
      divergence_score: divergenceScore,
      vision_statement: visionStatement,
    })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: 'Erreur base de données', details: error.message }, { status: 500 });
  }

  // Mettre à jour l'archétype de l'organisation
  await supabase
    .from('organizations')
    .update({ archetype })
    .eq('id', organizationId);

  return Response.json({
    id:               data.id,
    archetype,
    divergence_score: divergenceScore,
    vision_statement: visionStatement,
    key_insights:     aiResult.key_insights ?? [],
    confidence:       aiResult.confidence ?? divergenceScore,
    local_scores:     localScores,
  });
}
