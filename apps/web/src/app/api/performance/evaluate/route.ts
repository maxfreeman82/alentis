import { withAuth } from '@workos-inc/authkit-nextjs';
import {
  computeCorrelationScore,
  computeDepartureRisk,
  type EvalResponse,
  type EvalDimension,
} from '@/lib/performance/evaluation';
import { analyzeEvaluation } from '@/lib/ai';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { z } from 'zod';

const ResponseSchema = z.object({
  questionId: z.string(),
  score:      z.number().min(1).max(5),
  comment:    z.string().optional(),
});

const BodySchema = z.object({
  organizationId: z.string().uuid(),
  profileId:      z.string().uuid(),
  evaluatorId:    z.string().uuid(),
  evaluatorRole:  z.enum(['manager', 'peer', 'self']),
  quarter:        z.number().min(1).max(4),
  year:           z.number().min(2024).max(2030),
  responses:      z.array(ResponseSchema).min(1),
});

const DIM_KEYS: EvalDimension[] = ['results', 'collaboration', 'growth', 'alignment', 'energy'];

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
  }

  const { organizationId, profileId, evaluatorId, evaluatorRole, quarter, year, responses } = parsed.data;

  // 1. Calcul score de corrélation
  const evalResult    = computeCorrelationScore(responses as EvalResponse[]);
  const departureRisk = computeDepartureRisk(evalResult.global, evalResult.byDimension.energy ?? 60);

  // 2. Construction de l'objet évaluation sans spread (évite noUncheckedIndexedAccess)
  const evalInput: Record<string, number> = { departure_risk: departureRisk };
  for (const d of DIM_KEYS) {
    evalInput[d] = evalResult.byDimension[d] ?? 0;
  }

  // 3. Analyse IA
  const aiAnalysis = await analyzeEvaluation(evalInput, { correlation_score: evalResult.global }, []);

  // 4. Sauvegarde Supabase
  const supabase = createServerClient();
  await setOrgContext(supabase, organizationId);

  const { data, error } = await supabase
    .from('quarterly_evaluations')
    .upsert({
      organization_id:   organizationId,
      profile_id:        profileId,
      evaluator_id:      evaluatorId,
      quarter,
      year,
      correlation_score: evalResult.global,
      departure_risk:    departureRisk,
      ai_analysis:       aiAnalysis.ai_analysis,
      alerts:            aiAnalysis.alerts,
    }, { onConflict: 'organization_id,profile_id,evaluator_id,quarter,year' })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: 'Erreur base de données', details: error.message }, { status: 500 });
  }

  return Response.json({
    evaluation_id:  data.id,
    correlation:    evalResult.global,
    by_dimension:   evalResult.byDimension,
    departure_risk: departureRisk,
    ai_summary:     aiAnalysis.ai_analysis,
    ai_alerts:      aiAnalysis.alerts,
    evaluator_role: evaluatorRole,
  });
}
