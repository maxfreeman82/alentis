import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideNextStep, findEnergySkill, type AnsweredQuestion, type EnergyCode } from '@teranga/energy-assessment';
import { generateEnergyQuestion } from '@/lib/ai';

const schema = z.object({
  assessmentId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerKey: z.string().min(1),
});

function buildInterpretation(dominant: EnergyCode, secondary: EnergyCode[]): string {
  const dominantSkill = findEnergySkill(dominant);
  const parts = [`Dominante : ${dominantSkill.name}. ${dominantSkill.definition}`];
  if (secondary.length > 0) {
    const names = secondary.map(code => findEnergySkill(code).name).join(', ');
    parts.push(`Influence(s) : ${names}.`);
  }
  return parts.join(' ');
}

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  const { data: assessment, error: assessmentErr } = await admin
    .from('energy_assessments')
    .select('id, profile_id, status, candidate_context_snapshot')
    .eq('id', parsed.data.assessmentId)
    .maybeSingle();
  if (assessmentErr || !assessment) return NextResponse.json({ error: 'Passation introuvable.' }, { status: 404 });
  // Défense en profondeur : createAdminClient bypass la RLS, donc cette vérification
  // applicative est la SEULE protection contre l'accès à la passation d'un autre candidat.
  if (assessment.profile_id !== ctx.profileId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  if (assessment.status === 'completed') return NextResponse.json({ error: 'Passation déjà terminée.' }, { status: 409 });

  // Enregistrer la réponse à la question courante
  const { data: currentQuestion, error: currentErr } = await admin
    .from('energy_assessment_questions')
    .select('id, energy_signals, candidate_answer')
    .eq('id', parsed.data.questionId)
    .eq('assessment_id', assessment.id)
    .maybeSingle();
  if (currentErr || !currentQuestion) return NextResponse.json({ error: 'Question introuvable.' }, { status: 404 });
  if (currentQuestion.candidate_answer) return NextResponse.json({ error: 'Question déjà répondue.' }, { status: 409 });
  if (!(parsed.data.answerKey in (currentQuestion.energy_signals as Record<string, string>))) {
    return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from('energy_assessment_questions')
    .update({ candidate_answer: parsed.data.answerKey, response_timestamp: new Date().toISOString() })
    .eq('id', currentQuestion.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Reconstruire l'historique pour le moteur
  const { data: allQuestions, error: allErr } = await admin
    .from('energy_assessment_questions')
    .select('dimension_tested, hypothesis_tested, energy_signals, candidate_answer, phase')
    .eq('assessment_id', assessment.id)
    .order('created_at', { ascending: true });
  if (allErr || !allQuestions) return NextResponse.json({ error: allErr?.message ?? 'Lecture impossible' }, { status: 500 });

  const answered: AnsweredQuestion[] = allQuestions.map(q => ({
    dimensionTested: q.dimension_tested as EnergyCode | null,
    hypothesisTested: q.hypothesis_tested,
    contextTag: q.phase, // approximation acceptable : le contexte réel n'est pas stocké séparément dans cette tranche
    energySignals: q.energy_signals as Record<string, EnergyCode>,
    candidateAnswer: q.candidate_answer,
  }));

  const decision = decideNextStep(answered);

  if (decision.action === 'conclude') {
    const interpretation = buildInterpretation(decision.dominant, decision.secondary);
    const { error: concludeErr } = await admin
      .from('energy_assessments')
      .update({
        status: 'completed',
        dominant_energy: decision.dominant,
        secondary_energies: decision.secondary,
        confidence_state: { share: decision.confidence, forced: decision.forced },
        profile_interpretation: interpretation,
      })
      .eq('id', assessment.id);
    if (concludeErr) return NextResponse.json({ error: concludeErr.message }, { status: 500 });

    return NextResponse.json({
      done: true,
      profile: {
        dominant: findEnergySkill(decision.dominant),
        secondary: decision.secondary.map(findEnergySkill),
        interpretation,
      },
    });
  }

  const generated = await generateEnergyQuestion(
    assessment.candidate_context_snapshot as Record<string, unknown>,
    decision.phase, decision.contextTag, decision.energySignals
  );
  // La réponse du candidat à la question précédente est déjà enregistrée à ce stade.
  // Contrairement à /start, il n'y a ici rien à nettoyer/annuler en cas d'échec IA :
  // cette réponse est une donnée candidat valide et fait partie de l'audit-trail de
  // la passation (aucune policy DELETE candidat sur ces tables, cf. migration 006 —
  // l'annuler pour "faire propre" irait à l'encontre de ce choix). L'échec laisse la
  // passation "in_progress" sans question active : un état incohérent au même titre
  // que celui déjà anticipé dans resumeInProgressAssessment() (/start), mais qu'aucune
  // route actuelle ne sait résorber automatiquement — un nouveau POST /answer sur cette
  // question échouerait sur "Question déjà répondue" (409) plutôt que de relancer la
  // génération. Limitation connue, hors périmètre de cette tâche (cf. rapport).
  if (!generated) return NextResponse.json({ error: 'Échec de génération de la question suivante.' }, { status: 502 });

  const optionLabels = generated.options.map(o => ({ key: o.key, text: o.text }));

  const { data: nextQuestion, error: nextErr } = await admin
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
  if (nextErr || !nextQuestion) return NextResponse.json({ error: nextErr?.message ?? 'Création impossible' }, { status: 500 });

  // Ne JAMAIS renvoyer energy_signals (mapping option → énergie) au client.
  return NextResponse.json({
    done: false,
    question: {
      id: nextQuestion.id,
      text: nextQuestion.question_text,
      format: nextQuestion.question_format,
      options: optionLabels,
    },
  });
}
