import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const postSchema = z.object({
  category_id: z.string().uuid(),
  title:       z.string().min(5).max(300),
  content:     z.string().min(10).max(10000),
  tags:        z.array(z.string()).max(5).default([]),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json() as unknown;
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from('forum_posts')
    .insert({ author_id: ctx.profileId, ...parsed.data })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Incrémenter posts_count sur la catégorie
  await ctx.supabase.rpc('increment_forum_posts_count' as never, { cat_id: parsed.data.category_id } as never);

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
