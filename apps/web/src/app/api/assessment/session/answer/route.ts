import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSessionExpired } from '@/lib/assessment/session-manager';

const schema = z.object({
  sessionId:   z.string().uuid(),
  question_id: z.string().min(1),
  time_ms:     z.number().int().min(0),
  focus_lost:  z.number().int().min(0),
  response:    z.union([z.number(), z.string()]).optional(),
  nextIndex:   z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const user   = await requireAuth();
  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });

  const { sessionId, question_id, time_ms, focus_lost, response, nextIndex } = parsed.data;
  const admin = createAdminClient();

  // Vérifier que la session appartient à cet utilisateur
  const { data: session } = await admin
    .from('assessment_sessions')
    .select('id, profile_id, status, expires_at, current_index, responses')
    .eq('id', sessionId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.status !== 'started') return NextResponse.json({ error: 'Session non active' }, { status: 409 });
  if (isSessionExpired(session as { status: string; expires_at: string })) {
    await admin.from('assessment_sessions').update({ status: 'expired' }).eq('id', sessionId);
    return NextResponse.json({ error: 'Session expirée' }, { status: 410 });
  }

  // Upsert timing (ignorer si déjà enregistré — le premier enregistrement fait foi)
  await admin
    .from('assessment_timing')
    .upsert(
      { session_id: sessionId, question_id, time_ms, focus_lost },
      { onConflict: 'session_id,question_id', ignoreDuplicates: true },
    );

  // Sauvegarder la réponse et avancer l'index uniquement vers l'avant
  const updates: Record<string, unknown> = {};

  if (response !== undefined) {
    const current = (session.responses as Record<string, unknown>) ?? {};
    updates.responses = { ...current, [question_id]: response };
  }

  // current_index ne peut qu'augmenter (verrouillage retour arrière)
  if (nextIndex !== undefined && nextIndex > (session.current_index ?? 0)) {
    updates.current_index = nextIndex;
  }

  if (Object.keys(updates).length > 0) {
    await admin.from('assessment_sessions').update(updates).eq('id', sessionId);
  }

  return NextResponse.json({ ok: true });
}
