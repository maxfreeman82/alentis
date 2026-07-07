import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  title:    z.string().min(1).max(100),
  url:      z.string().url(),
  category: z.enum(['outil','doc','rh','finance','autre']).default('autre'),
  icon:     z.string().max(50).optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['org_admin', 'org_hr', 'org_manager'].includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { icon, ...rest } = parsed.data;

  const { error } = await ctx.supabase.from('workspace_links').insert({
    organization_id: ctx.organizationId,
    icon:            icon ?? null,
    ...rest,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
