import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideNextStep, resolveStepConfig, STEP_IDS, type StepId } from '@teranga/talent-assessment';
import { createQuestion, loadAnswered } from '@/lib/talent-assessment/server';

const schema = z.object({
  sessionId:  z.string().uuid(),
  questionId: z.string().uuid(),
  answerKey:  z.string().min(1).max(10),
  responseMs: z.number().int().min(0).max(3_600_000).optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { sessionId, questionId, answerKey, responseMs } = parsed.data;

  const admin = createAdminClient();

  const { data: session, error: sessionErr } = await admin
    .from('talent_assessment_sessions')
    .select('id, profile_id, step, status, context_snapshot')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionErr || !session) return NextResponse.json({ error: 'Passation introuvable.' }, { status: 404 });
  // Admin client = bypass RLS : cette vérification est la SEULE protection
  // contre l'accès à la passation d'un autre candidat.
  if (session.profile_id !== ctx.profileId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  if (session.status === 'completed') return NextResponse.json({ error: 'Étape déjà terminée.' }, { status: 409 });
  if (!(STEP_IDS as readonly string[]).includes(session.step)) {
    return NextResponse.json({ error: 'Étape non prise en charge.' }, { status: 400 });
  }
  // Config figée au démarrage : les compétences testées viennent du snapshot de session.
  const config = resolveStepConfig(session.step as StepId, session.context_snapshot as Record<string, unknown>);

  const { data: current, error: currentErr } = await admin
    .from('talent_assessment_questions')
    .select('id, created_at, option_values, candidate_answer')
    .eq('id', questionId)
    .eq('session_id', session.id)
    .maybeSingle();
  if (currentErr || !current) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 });
  if (!(answerKey in (current.option_values as Record<string, number>))) {
    return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400 });
  }

  // Retry après échec de génération : même réponse rejouée, aucune question
  // créée depuis → on saute l'UPDATE et on relance la décision/génération.
  // Toute autre re-soumission (autre réponse, ou question suivante existante) = 409.
  if (current.candidate_answer) {
    const { data: later, error: laterErr } = await admin
      .from('talent_assessment_questions')
      .select('id')
      .eq('session_id', session.id)
      .gt('created_at', current.created_at)
      .limit(1)
      .maybeSingle();
    if (laterErr) return NextResponse.json({ error: laterErr.message }, { status: 500 });
    if (current.candidate_answer !== answerKey || later) {
      return NextResponse.json({ error: 'Question déjà répondue.' }, { status: 409 });
    }
  } else {
    // Garde .is('candidate_answer', null) : un double-clic concurrent ne doit
    // enregistrer qu'une réponse et ne générer qu'une question suivante.
    const { data: updated, error: updateErr } = await admin
      .from('talent_assessment_questions')
      .update({ candidate_answer: answerKey, response_ms: responseMs ?? null, answered_at: new Date().toISOString() })
      .eq('id', current.id)
      .is('candidate_answer', null)
      .select('id');
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Réponse déjà enregistrée par une requête concurrente.' }, { status: 409 });
    }
  }

  const answered = await loadAnswered(admin, session.id);
  if (!answered.ok) return NextResponse.json({ error: answered.error }, { status: answered.status });

  const decision = decideNextStep(config, answered.value);

  if (decision.action === 'conclude') {
    const { error: concludeErr } = await admin
      .from('talent_assessment_sessions')
      .update({
        status: 'completed',
        result: { facetScores: decision.facetScores, stepScore: decision.stepScore, forced: decision.forced },
        integrity_flags: decision.integrityFlags,
      })
      .eq('id', session.id);
    if (concludeErr) return NextResponse.json({ error: concludeErr.message }, { status: 500 });
    // Aucun score renvoyé au candidat pendant la passation.
    return NextResponse.json({ done: true });
  }

  const created = await createQuestion(
    admin, session.id, config, decision, session.context_snapshot as Record<string, unknown>,
  );
  // La réponse reste enregistrée (audit-trail) ; le client rejouera la même
  // réponse, ce qui emprunte le chemin retry ci-dessus.
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  return NextResponse.json({ done: false, question: created.value });
}
