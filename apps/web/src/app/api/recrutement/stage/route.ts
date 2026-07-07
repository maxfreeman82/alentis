import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  applicationId: z.string().uuid(),
  stage: z.enum(['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected']),
});

// PATCH — déplacer une candidature d'une étape à l'autre (via drag Kanban)
export async function PATCH(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { applicationId, stage } = parsed.data;

  const { data, error } = await supabase
    .from('applications')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .eq('organization_id', organizationId)
    .select('id, stage')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, application: data });
}
