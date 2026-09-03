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

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const decision = decideNextStep([]);
  if (decision.action !== 'ask') {
    return NextResponse.json({ error: 'Le moteur ne peut pas démarrer sans question.' }, { status: 500 });
  }

  const generated = await generateEnergyQuestion(
    parsed.data.contextSnapshot, decision.phase, decision.contextTag, decision.energySignals
  );
  if (!generated) return NextResponse.json({ error: 'Échec de génération de la question.' }, { status: 502 });

  const admin = createAdminClient();

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
    return NextResponse.json({ error: assessmentErr?.message ?? 'Création impossible' }, { status: 500 });
  }

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
    })
    .select('id, question_text, question_format')
    .single();
  if (questionErr || !question) {
    return NextResponse.json({ error: questionErr?.message ?? 'Création question impossible' }, { status: 500 });
  }

  // Ne JAMAIS renvoyer energy_signals (mapping option → énergie) au client.
  return NextResponse.json({
    assessmentId: assessment.id,
    question: {
      id: question.id,
      text: question.question_text,
      format: question.question_format,
      options: generated.options.map(o => ({ key: o.key, text: o.text })),
    },
  });
}
