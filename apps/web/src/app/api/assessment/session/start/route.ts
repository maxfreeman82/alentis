import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getCycleKey,
  getExpiresAt,
  isSessionExpired,
  buildQuestionOrder,
  buildOptionShuffles,
  QUESTION_IDS,
  type AssessmentType,
} from '@/lib/assessment/session-manager';

const schema = z.object({
  assessmentType:  z.enum(['energy_skills', 'vision_pulse', 'boussole']),
  organizationId:  z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const user   = await requireAuth();
  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

  const { assessmentType, organizationId } = parsed.data;
  const cycleKey = getCycleKey(assessmentType as AssessmentType);
  const admin    = createAdminClient();

  // Chercher une session existante pour ce cycle
  const { data: existing } = await admin
    .from('assessment_sessions')
    .select('*')
    .eq('profile_id', user.id)
    .eq('assessment_type', assessmentType)
    .eq('cycle_key', cycleKey)
    .maybeSingle();

  // Session terminée → impossible de recommencer dans ce cycle
  if (existing?.status === 'completed') {
    return NextResponse.json({
      status:       'completed',
      cannotRetake: true,
      session:      existing,
    });
  }

  // Session en cours mais expirée → marquer expirée, créer nouvelle
  if (existing && isSessionExpired(existing as { status: string; expires_at: string })) {
    await admin
      .from('assessment_sessions')
      .update({ status: 'expired' })
      .eq('id', existing.id);
    // Tomber dans la création ci-dessous
  } else if (existing?.status === 'started') {
    // Reprise : renvoyer la session telle quelle
    return NextResponse.json({ status: 'resumed', session: existing });
  }

  // Nouvelle session
  const questionIds    = QUESTION_IDS[assessmentType as AssessmentType];
  const questionOrder  = buildQuestionOrder(questionIds);
  const optionShuffles = assessmentType === 'boussole'
    ? buildOptionShuffles(questionIds, 5)
    : null;

  const expiresAt = getExpiresAt(assessmentType as AssessmentType);

  const { data: session, error } = await admin
    .from('assessment_sessions')
    .insert({
      profile_id:      user.id,
      organization_id: organizationId ?? null,
      assessment_type: assessmentType,
      cycle_key:       cycleKey,
      status:          'started',
      current_index:   0,
      question_order:  questionOrder,
      option_shuffles: optionShuffles,
      responses:       {},
      expires_at:      expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: 'created', session }, { status: 201 });
}
