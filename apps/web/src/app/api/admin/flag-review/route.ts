import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  sessionId: z.string().uuid(),
});

// PATCH — marquer une session signalée comme révisée par l'admin
export async function PATCH(req: NextRequest) {
  const user   = await requireAuth();
  const admin  = createAdminClient();

  // Vérifier super_admin
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

  const { error } = await admin
    .from('assessment_sessions')
    .update({
      is_reviewed: true,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
