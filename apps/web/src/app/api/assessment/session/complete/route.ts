import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSessionExpired, isSessionComplete, type AssessmentType } from '@/lib/assessment/session-manager';
import { computeIntegrity, type TimingRecord } from '@/lib/assessment/integrity';

const schema = z.object({
  sessionId: z.string().uuid(),
  responses: z.record(z.union([z.number(), z.string()])),
});

export async function POST(req: NextRequest) {
  const user   = await requireAuth();
  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

  const { sessionId, responses } = parsed.data;
  const admin = createAdminClient();

  // Vérifier la session
  const { data: session } = await admin
    .from('assessment_sessions')
    .select('id, profile_id, status, expires_at, assessment_type, responses')
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.status === 'completed') return NextResponse.json({ error: 'Déjà soumis' }, { status: 409 });
  if (session.status === 'expired' || isSessionExpired(session as { status: string; expires_at: string })) {
    return NextResponse.json({ error: 'Session expirée' }, { status: 410 });
  }

  const assessmentType = session.assessment_type as AssessmentType;

  // Fusionner les réponses sauvegardées + celles de la soumission finale
  const merged = {
    ...((session.responses as Record<string, unknown>) ?? {}),
    ...responses,
  } as Record<string, number>;

  if (!isSessionComplete(merged, assessmentType)) {
    return NextResponse.json({ error: 'Questionnaire incomplet' }, { status: 422 });
  }

  // Récupérer le timing comportemental
  const { data: rawTiming } = await admin
    .from('assessment_timing')
    .select('question_id, time_ms, focus_lost')
    .eq('session_id', sessionId);

  const timing: TimingRecord[] = (rawTiming ?? []).map(t => ({
    question_id: t.question_id,
    time_ms:     t.time_ms,
    focus_lost:  t.focus_lost,
  }));

  // Calcul d'intégrité
  const integrity = computeIntegrity(merged, timing, assessmentType);

  // Finaliser la session
  await admin
    .from('assessment_sessions')
    .update({
      status:          'completed',
      responses:       merged,
      completed_at:    new Date().toISOString(),
      coherence_score: integrity.coherence.score,
      behavior_flags:  integrity.flags,
      is_flagged:      integrity.overall_flag,
    })
    .eq('id', sessionId);

  return NextResponse.json({
    ok:              true,
    coherence_score: integrity.coherence.score,
    is_flagged:      integrity.overall_flag,
    // Ne PAS retourner le détail des flags au candidat
  });
}
