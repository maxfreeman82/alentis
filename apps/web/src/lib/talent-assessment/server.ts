import type { createAdminClient } from '@/lib/supabase/admin';
import {
  buildFallbackQuestion, type AnsweredItem, type AskDecision, type StepConfig,
} from '@teranga/talent-assessment';
import { generateAdaptiveQuestion } from '@/lib/ai';

type AdminClient = ReturnType<typeof createAdminClient>;

// Forme renvoyée au client : JAMAIS option_values.
export interface ClientQuestionPayload {
  id:      string;
  text:    string;
  options: { key: string; text: string }[];
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

// Contexte métier injecté dans la génération — jamais nom/âge/sexe/origine.
// Colonnes présentes en base réelle (cf. design talent-cv-replace), absentes
// des migrations trackées : lecture défensive.
export async function buildContextSnapshot(admin: AdminClient, profileId: string): Promise<Record<string, unknown>> {
  const { data } = await admin
    .from('profiles')
    .select('job_title, sector, years_experience')
    .eq('id', profileId)
    .maybeSingle();
  return {
    job_title:        data?.job_title ?? null,
    sector:           data?.sector ?? null,
    years_experience: data?.years_experience ?? null,
  };
}

export async function readPendingQuestion(admin: AdminClient, sessionId: string): Promise<Result<ClientQuestionPayload | null>> {
  const { data, error } = await admin
    .from('talent_assessment_questions')
    .select('id, question_text, option_labels')
    .eq('session_id', sessionId)
    .is('candidate_answer', null)
    .maybeSingle();
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!data) return { ok: true, value: null };
  return { ok: true, value: { id: data.id, text: data.question_text, options: data.option_labels } };
}

export async function loadAnswered(admin: AdminClient, sessionId: string): Promise<Result<AnsweredItem[]>> {
  const { data, error } = await admin
    .from('talent_assessment_questions')
    .select('facet, option_values, candidate_answer, response_ms')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error || !data) return { ok: false, error: error?.message ?? 'Lecture impossible', status: 500 };
  return {
    ok: true,
    value: data.map(q => ({
      facet:           q.facet,
      optionValues:    q.option_values as Record<string, number>,
      candidateAnswer: q.candidate_answer,
      responseMs:      q.response_ms,
    })),
  };
}

// Génère (IA, sinon banque de secours) et insère la question décidée par le moteur.
export async function createQuestion(
  admin: AdminClient,
  sessionId: string,
  config: StepConfig,
  decision: AskDecision,
  context: Record<string, unknown>,
): Promise<Result<ClientQuestionPayload>> {
  const generated = await generateAdaptiveQuestion(
    config, decision.facet, decision.contextTag, decision.optionValues, context,
  );
  const question = generated ?? buildFallbackQuestion(config, decision.facet, decision.optionValues);
  if (!question) return { ok: false, error: 'Aucune question disponible pour cette facette.', status: 500 };

  const { data, error } = await admin
    .from('talent_assessment_questions')
    .insert({
      session_id:    sessionId,
      phase:         decision.phase,
      facet:         decision.facet,
      question_text: question.questionText,
      option_labels: question.options,
      option_values: decision.optionValues,
      ai_generated:  generated !== null,
    })
    .select('id')
    .single();

  if (error || !data) {
    // Course concurrente (idx_talent_assessment_questions_one_pending) : une autre
    // requête a déjà créé la question en attente — on la renvoie telle quelle.
    if (error?.code === '23505') {
      const pending = await readPendingQuestion(admin, sessionId);
      if (pending.ok && pending.value) return { ok: true, value: pending.value };
    }
    return { ok: false, error: error?.message ?? 'Création question impossible', status: 500 };
  }

  return { ok: true, value: { id: data.id, text: question.questionText, options: question.options } };
}
