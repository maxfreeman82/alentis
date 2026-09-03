import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideNextStep } from '@teranga/energy-assessment';
import { generateEnergyQuestion } from '@/lib/ai';

const schema = z.object({
  assessmentRoute: z.enum(['job_application', 'target_role', 'exploration']).default('exploration'),
  jobReferenceId: z.string().uuid().optional(),
  contextSnapshot: z.record(z.string(), z.unknown()).default({}),
});

type AdminClient = ReturnType<typeof createAdminClient>;

// Anti-abus : une seule passation "in_progress" par candidat. Si une existe
// déjà, on reprend sa question en attente plutôt que de recréer une passation
// et de rappeler l'IA (appel Claude payant à chaque insertion). Appelée à la
// fois en amont (chemin nominal) et en repli après une violation de
// contrainte unique (chemin concurrent, cf. idx_energy_assessments_one_in_progress).
// Retourne null si aucune passation in_progress n'existe pour ce profil.
async function resumeInProgressAssessment(admin: AdminClient, profileId: string): Promise<NextResponse | null> {
  const { data: existingAssessment, error: existingErr } = await admin
    .from('energy_assessments')
    .select('id')
    .eq('profile_id', profileId)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });
  if (!existingAssessment) return null;

  const { data: pendingQuestion, error: pendingErr } = await admin
    .from('energy_assessment_questions')
    .select('id, question_text, question_format, option_labels')
    .eq('assessment_id', existingAssessment.id)
    .is('candidate_answer', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingErr) return NextResponse.json({ error: pendingErr.message }, { status: 500 });

  if (pendingQuestion) {
    return NextResponse.json({
      assessmentId: existingAssessment.id,
      question: {
        id: pendingQuestion.id,
        text: pendingQuestion.question_text,
        format: pendingQuestion.question_format,
        options: pendingQuestion.option_labels,
      },
    });
  }
  // Passation in_progress sans question en attente (état incohérent) :
  // on ne fabrique pas de comportement non spécifié, on remonte une erreur claire.
  return NextResponse.json({ error: 'Passation en cours sans question active.' }, { status: 500 });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  const resumed = await resumeInProgressAssessment(admin, ctx.profileId);
  if (resumed) return resumed;

  const decision = decideNextStep([]);
  if (decision.action !== 'ask') {
    return NextResponse.json({ error: 'Le moteur ne peut pas démarrer sans question.' }, { status: 500 });
  }

  // La ligne d'assessment est créée AVANT l'appel IA (payant) : si l'insertion
  // échoue, on n'a pas gaspillé d'appel Claude pour rien.
  const { data: assessment, error: assessmentErr } = await admin
    .from('energy_assessments')
    .insert({
      profile_id: ctx.profileId,
      assessment_route: parsed.data.assessmentRoute,
      job_reference_id: parsed.data.jobReferenceId ?? null,
      candidate_context_snapshot: parsed.data.contextSnapshot,
    })
    .select('id')
    .single();
  if (assessmentErr || !assessment) {
    // Course concurrente : un autre POST /start pour ce même profil a gagné
    // l'insertion en premier (contrainte unique idx_energy_assessments_one_in_progress,
    // code Postgres 23505). On ne renvoie pas 500 : on retombe sur la reprise.
    if (assessmentErr?.code === '23505') {
      const resumedAfterRace = await resumeInProgressAssessment(admin, ctx.profileId);
      if (resumedAfterRace) return resumedAfterRace;
    }
    return NextResponse.json({ error: assessmentErr?.message ?? 'Création impossible' }, { status: 500 });
  }

  const generated = await generateEnergyQuestion(
    parsed.data.contextSnapshot, decision.phase, decision.contextTag, decision.energySignals
  );
  if (!generated) {
    await admin.from('energy_assessments').delete().eq('id', assessment.id);
    return NextResponse.json({ error: 'Échec de génération de la question.' }, { status: 502 });
  }

  const optionLabels = generated.options.map(o => ({ key: o.key, text: o.text }));

  const { data: question, error: questionErr } = await admin
    .from('energy_assessment_questions')
    .insert({
      assessment_id: assessment.id,
      phase: decision.phase,
      question_text: generated.questionText,
      question_format: generated.questionFormat,
      dimension_tested: decision.dimensionTested,
      hypothesis_tested: decision.hypothesisTested,
      energy_signals: decision.energySignals,
      option_labels: optionLabels,
    })
    .select('id, question_text, question_format')
    .single();
  if (questionErr || !question) {
    await admin.from('energy_assessments').delete().eq('id', assessment.id);
    return NextResponse.json({ error: questionErr?.message ?? 'Création question impossible' }, { status: 500 });
  }

  // Ne JAMAIS renvoyer energy_signals (mapping option → énergie) au client.
  return NextResponse.json({
    assessmentId: assessment.id,
    question: {
      id: question.id,
      text: question.question_text,
      format: question.question_format,
      options: optionLabels,
    },
  });
}
