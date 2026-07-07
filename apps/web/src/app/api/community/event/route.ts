import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  title:         z.string().min(3).max(200),
  description:   z.string().max(2000).optional(),
  event_type:    z.enum(['online', 'in-person', 'hybrid']).default('online'),
  location:      z.string().max(200).optional(),
  meeting_url:   z.string().url().optional().or(z.literal('')),
  start_at:      z.string().datetime(),
  end_at:        z.string().datetime().optional(),
  max_attendees: z.number().int().min(1).optional().nullable(),
  tags:          z.array(z.string()).default([]),
  is_free:       z.boolean().default(true),
  price_fcfa:    z.number().int().min(0).optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const { error } = await ctx.supabase.from('community_events').insert({
    created_by:    ctx.profileId,
    title:         d.title,
    event_type:    d.event_type,
    start_at:      d.start_at,
    tags:          d.tags,
    is_free:       d.is_free,
    meeting_url:   d.meeting_url || null,
    description:   d.description ?? null,
    location:      d.location ?? null,
    end_at:        d.end_at ?? null,
    max_attendees: d.max_attendees ?? null,
    price_fcfa:    d.price_fcfa ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

