import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  title:         z.string().min(3).max(200),
  description:   z.string().max(2000).optional(),
  category:      z.string().default('autre'),
  price_fcfa:    z.number().int().min(0).optional().nullable(),
  price_type:    z.enum(['fixed', 'hourly', 'negotiable']).default('negotiable'),
  delivery_days: z.number().int().min(1).optional().nullable(),
  skills:        z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const { error } = await ctx.supabase.from('marketplace_listings').insert({
    author_id:     ctx.profileId,
    title:         d.title,
    category:      d.category,
    price_type:    d.price_type,
    skills:        d.skills,
    description:   d.description ?? null,
    price_fcfa:    d.price_fcfa ?? null,
    delivery_days: d.delivery_days ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json() as { id: string };

  const { error } = await ctx.supabase
    .from('marketplace_listings')
    .update({ is_active: false })
    .eq('id', id)
    .eq('author_id', ctx.profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
