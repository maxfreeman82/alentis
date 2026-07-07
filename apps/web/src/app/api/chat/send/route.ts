import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const schema = z.object({
  recipientId: z.string().uuid(),
  content:     z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { recipientId, content } = parsed.data;

  // Vérifier que le destinataire appartient à la même org
  const { data: recipient } = await ctx.supabase.from('profiles')
    .select('id')
    .eq('id', recipientId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();

  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  const { data, error } = await ctx.supabase.from('messages').insert({
    organization_id: ctx.organizationId,
    author_id:       ctx.profileId,
    recipient_id:    recipientId,
    content,
  }).select('id, author_id, content, created_at, read_at').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    message: {
      id:        data.id,
      authorId:  data.author_id,
      content:   data.content,
      createdAt: data.created_at,
      isRead:    data.read_at != null,
    },
  });
}
