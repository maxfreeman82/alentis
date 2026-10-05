import { requireAuth } from '@/lib/supabase/user';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideNextStep, resolveStepConfig, STEP_IDS } from '@teranga/talent-assessment';
import { buildContextSnapshot, createQuestion, prepareNextQuestions, readPendingQuestion } from '@/lib/talent-assessment/server';

const schema = z.object({ step: z.enum(STEP_IDS) });

type AdminClient = ReturnType<typeof createAdminClient>;

// Reprise : une passation in_progress existe pour (profil, étape) → on renvoie
// sa question en attente au lieu de rappeler l'IA. null si aucune passation.
async function resume(admin: AdminClient, profileId: string, step: string): Promise<NextResponse | null> {
  const { data: session, error } = await admin
    .from('talent_assessment_sessions')
    .select('id')
    .eq('profile_id', profileId)
    .eq('step', step)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!session) return null;

  const pending = await readPendingQuestion(admin, session.id);
  if (!pending.ok) return NextResponse.json({ error: pending.error }, { status: pending.status });
  if (pending.value) return NextResponse.json({ sessionId: session.id, question: pending.value });
  // Session sans question active = échec IA sur /answer : le client doit rejouer
  // sa dernière réponse (chemin retry de /answer).
  return NextResponse.json({ error: 'Passation en cours sans question active. Réessayez votre dernière réponse.' }, { status: 409 });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Étape invalide.' }, { status: 400 });
  const { step } = parsed.data;

  const admin = createAdminClient();

  const resumed = await resume(admin, ctx.profileId, step);
  if (resumed) return resumed;

  const context = await buildContextSnapshot(admin, ctx.profileId);
  const config = resolveStepConfig(step, context);
  if (config.facets.length === 0) {
    return NextResponse.json({ error: 'Déposez votre CV pour que nous puissions évaluer vos compétences techniques.' }, { status: 400 });
  }
  // Les questions de preuve vérifient le parcours déclaré : il faut au moins le poste.
  if (step === 'exp' && !context.job_title) {
    return NextResponse.json({ error: 'Indiquez votre poste (dans votre CV) pour évaluer votre expérience.' }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await admin
    .from('talent_assessment_sessions')
    .insert({ profile_id: ctx.profileId, step, context_snapshot: context })
    .select('id')
    .single();
  if (sessionErr || !session) {
    // Course concurrente : un autre /start pour ce profil et cette étape a gagné
    // l'insertion (idx_talent_assessment_sessions_one_in_progress) → reprise.
    if (sessionErr?.code === '23505') {
      const resumedAfterRace = await resume(admin, ctx.profileId, step);
      if (resumedAfterRace) return resumedAfterRace;
    }
    return NextResponse.json({ error: sessionErr?.message ?? 'Création impossible' }, { status: 500 });
  }

  const decision = decideNextStep(config, []);
  if (decision.action !== 'ask') {
    await admin.from('talent_assessment_sessions').delete().eq('id', session.id);
    return NextResponse.json({ error: 'Le moteur ne peut pas démarrer sans question.' }, { status: 500 });
  }

  const created = await createQuestion(admin, session.id, config, decision, context);
  if (!created.ok) {
    await admin.from('talent_assessment_sessions').delete().eq('id', session.id);
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  // Après la réponse HTTP : préparer la question suivante pendant la lecture.
  const { asked } = created.value;
  if (asked) after(() => prepareNextQuestions(admin, session.id, config, context, asked));

  // Uniquement le payload client : `asked` contient les valeurs cachées.
  return NextResponse.json({ sessionId: session.id, question: created.value.payload });
}
