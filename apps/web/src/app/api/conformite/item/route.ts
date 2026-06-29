import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const patchSchema = z.object({
  itemId:         z.string().uuid(),
  status:         z.enum(['completed', 'pending', 'overdue', 'not_applicable']),
  last_completed: z.string().optional(),
  notes:          z.string().max(500).optional(),
});

const postSchema = z.object({
  category:    z.enum(['social','fiscal','securite','emploi','formation','autre']),
  title:       z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  frequency:   z.enum(['mensuel','trimestriel','semestriel','annuel','unique']).optional(),
  due_date:    z.string().optional(),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['org_admin', 'org_hr'].includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { description, frequency, due_date, ...rest } = parsed.data;

  const { error } = await ctx.supabase.from('compliance_items').insert({
    organization_id: ctx.organizationId,
    description:     description ?? null,
    frequency:       frequency ?? null,
    due_date:        due_date ?? null,
    ...rest,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { itemId, status, last_completed, notes } = parsed.data;

  // Vérifier appartenance org
  const { data: item } = await ctx.supabase.from('compliance_items').select('organization_id').eq('id', itemId).maybeSingle();
  if (!item || item.organization_id !== ctx.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await ctx.supabase.from('compliance_items').update({ status, last_completed: last_completed ?? null, notes: notes ?? null }).eq('id', itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
