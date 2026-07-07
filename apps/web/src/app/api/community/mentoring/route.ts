import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const profileSchema = z.object({
  mentor_type:     z.enum(['mentor', 'mentee', 'both']).default('mentor'),
  expertise_areas: z.array(z.string()).default([]),
  bio:             z.string().max(500).optional(),
  available_hours: z.number().int().min(1).max(20).default(2),
  languages:       z.array(z.string()).default(['Français']),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json() as unknown;
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pd = parsed.data;

  const { error } = await ctx.supabase.from('mentoring_profiles').upsert(
    { profile_id: ctx.profileId, mentor_type: pd.mentor_type, expertise_areas: pd.expertise_areas, available_hours: pd.available_hours, languages: pd.languages, bio: pd.bio ?? null },
    { onConflict: 'profile_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

const sessionSchema = z.object({
  mentor_id:    z.string().uuid(),
  topic:        z.string().min(3).max(200),
  scheduled_at: z.string().datetime().optional(),
  duration_min: z.number().int().min(15).max(180).default(60),
});

export async function PUT(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body   = await req.json() as unknown;
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.mentor_id === ctx.profileId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous mentorer vous-même' }, { status: 400 });
  }

  const sd = parsed.data;

  const { error } = await ctx.supabase.from('mentoring_sessions').insert({
    mentee_id:    ctx.profileId,
    mentor_id:    sd.mentor_id,
    topic:        sd.topic,
    duration_min: sd.duration_min,
    scheduled_at: sd.scheduled_at ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
