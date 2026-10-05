import type { createAdminClient } from '@/lib/supabase/admin';
import {
  anticipateNextSteps, buildFallbackQuestion, sameStep, sanitizeSkills,
  type AnsweredItem, type AskDecision, type ClientQuestion, type StepConfig,
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
    .select('job_title, sector, years_experience, cv_extracted_skills')
    .eq('id', profileId)
    .maybeSingle();
  return {
    job_title:        data?.job_title ?? null,
    sector:           data?.sector ?? null,
    years_experience: data?.years_experience ?? null,
    // Compétences testées par l'étape technique (cf. resolveStepConfig)
    skills:           sanitizeSkills(data?.cv_extracted_skills),
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
    .select('facet, option_values, candidate_answer, response_ms, difficulty')
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
      difficulty:      q.difficulty,
    })),
  };
}

// Question prête à insérer : textes + valeurs cachées propres à cette génération.
interface Draft {
  question:     ClientQuestion;
  aiGenerated:  boolean;
  optionValues: Record<string, number>;
}

// Ce qui a été posé, pour préparer la suite (jamais renvoyé au client).
export interface AskedQuestion {
  id:           string;
  facet:        string;
  optionValues: Record<string, number>;
  difficulty:   number | null;
}

export interface CreatedQuestion {
  payload: ClientQuestionPayload;
  // null quand la question vient d'une requête concurrente (rien à préparer)
  asked:   AskedQuestion | null;
}

// Génère (IA, sinon banque de secours) la question décidée par le moteur.
async function generateDraft(
  admin: AdminClient,
  sessionId: string,
  config: StepConfig,
  decision: AskDecision,
  context: Record<string, unknown>,
): Promise<Draft | null> {
  // Situations déjà posées : transmises à l'IA pour qu'elle ne les recycle pas.
  const { data: previous } = await admin
    .from('talent_assessment_questions')
    .select('question_text')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  const previousQuestions = (previous ?? []).map(q => q.question_text as string);

  const generated = await generateAdaptiveQuestion(
    config, decision.facet, decision.contextTag, decision.optionValues, context, decision.difficulty,
    previousQuestions,
  );
  const question = generated ?? buildFallbackQuestion(config, decision.facet, decision.optionValues);
  if (!question) return null;
  return { question, aiGenerated: generated !== null, optionValues: decision.optionValues };
}

// Brouillon préparé pendant la lecture de la question précédente, s'il
// correspond à la décision réelle. Si la table n'existe pas (migration 009 non
// appliquée) ou que rien n'est prêt, on retombe sur la génération synchrone.
async function takePreparedDraft(
  admin: AdminClient,
  sessionId: string,
  afterQuestionId: string,
  decision: AskDecision,
): Promise<Draft | null> {
  const { data } = await admin
    .from('talent_assessment_prepared')
    .select('phase, facet, difficulty, question_text, option_labels, option_values, ai_generated')
    .eq('session_id', sessionId)
    .eq('after_question_id', afterQuestionId);
  // Utilisés ou non, les brouillons de cette question ne serviront plus.
  await admin.from('talent_assessment_prepared').delete().eq('after_question_id', afterQuestionId);

  const match = (data ?? []).find(p => sameStep(p as Pick<AskDecision, 'phase' | 'facet' | 'difficulty'>, decision));
  if (!match) return null;
  return {
    question:     { questionText: match.question_text, options: match.option_labels },
    aiGenerated:  match.ai_generated,
    optionValues: match.option_values as Record<string, number>,
  };
}

// Insère la question décidée par le moteur : brouillon préparé si disponible,
// sinon génération immédiate.
export async function createQuestion(
  admin: AdminClient,
  sessionId: string,
  config: StepConfig,
  decision: AskDecision,
  context: Record<string, unknown>,
  afterQuestionId: string | null = null,
): Promise<Result<CreatedQuestion>> {
  const draft = (afterQuestionId && await takePreparedDraft(admin, sessionId, afterQuestionId, decision))
    || await generateDraft(admin, sessionId, config, decision, context);
  // Pas de banque de secours en technique : le candidat réessaie (chemin retry).
  if (!draft) return { ok: false, error: 'La génération de la question a échoué. Réessayez dans un instant.', status: 502 };

  const { data, error } = await admin
    .from('talent_assessment_questions')
    .insert({
      session_id:    sessionId,
      phase:         decision.phase,
      facet:         decision.facet,
      difficulty:    decision.difficulty,
      question_text: draft.question.questionText,
      option_labels: draft.question.options,
      option_values: draft.optionValues,
      ai_generated:  draft.aiGenerated,
    })
    .select('id')
    .single();

  if (error || !data) {
    // Course concurrente (idx_talent_assessment_questions_one_pending) : une autre
    // requête a déjà créé la question en attente — on la renvoie telle quelle.
    if (error?.code === '23505') {
      const pending = await readPendingQuestion(admin, sessionId);
      if (pending.ok && pending.value) return { ok: true, value: { payload: pending.value, asked: null } };
    }
    return { ok: false, error: error?.message ?? 'Création question impossible', status: 500 };
  }

  return {
    ok: true,
    value: {
      payload: { id: data.id, text: draft.question.questionText, options: draft.question.options },
      asked:   { id: data.id, facet: decision.facet, optionValues: draft.optionValues, difficulty: decision.difficulty },
    },
  };
}

// À lancer après la réponse HTTP (after()) : prépare la question suivante pour
// chaque branche possible du moteur. Ne lève jamais — au pire, la question
// suivante sera générée à la demande, comme sans pré-génération.
export async function prepareNextQuestions(
  admin: AdminClient,
  sessionId: string,
  config: StepConfig,
  context: Record<string, unknown>,
  asked: AskedQuestion,
): Promise<void> {
  try {
    const answered = await loadAnswered(admin, sessionId);
    if (!answered.ok) return;
    const branches = anticipateNextSteps(config, answered.value, asked);
    await Promise.all(branches.map(async decision => {
      const draft = await generateDraft(admin, sessionId, config, decision, context);
      if (!draft) return;
      await admin.from('talent_assessment_prepared').insert({
        session_id:        sessionId,
        after_question_id: asked.id,
        phase:             decision.phase,
        facet:             decision.facet,
        difficulty:        decision.difficulty,
        question_text:     draft.question.questionText,
        option_labels:     draft.question.options,
        option_values:     draft.optionValues,
        ai_generated:      draft.aiGenerated,
      });
    }));
  } catch (err) {
    console.error('[prepareNextQuestions] failed:', err);
  }
}

// Reprise d'une passation : prépare la suite de la question en attente si rien
// n'a encore été préparé pour elle (évite les doublons sur reprises répétées).
export async function preparePendingIfMissing(
  admin: AdminClient,
  sessionId: string,
  config: StepConfig,
  context: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: pending } = await admin
      .from('talent_assessment_questions')
      .select('id, facet, option_values, difficulty')
      .eq('session_id', sessionId)
      .is('candidate_answer', null)
      .maybeSingle();
    if (!pending) return;
    const { count } = await admin
      .from('talent_assessment_prepared')
      .select('id', { count: 'exact', head: true })
      .eq('after_question_id', pending.id);
    if ((count ?? 0) > 0) return;
    await prepareNextQuestions(admin, sessionId, config, context, {
      id:           pending.id,
      facet:        pending.facet,
      optionValues: pending.option_values as Record<string, number>,
      difficulty:   pending.difficulty,
    });
  } catch (err) {
    console.error('[preparePendingIfMissing] failed:', err);
  }
}
