import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  event_type:  z.enum(['reunion','formation','conge','echeance','anniversaire','autre']).default('autre'),
  start_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['org_admin', 'org_hr', 'org_manager'].includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { description, end_date, ...rest } = parsed.data;

  const { error } = await ctx.supabase.from('calendar_events').insert({
    organization_id: ctx.organizationId,
    created_by:      ctx.profileId,
    description:     description ?? null,
    end_date:        end_date || null,
    ...rest,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
