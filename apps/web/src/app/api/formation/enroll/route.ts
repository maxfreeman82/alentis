import { requireAuth } from '@/lib/supabase/user';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const EnrollSchema = z.object({
  trainingId: z.string().uuid(),
  profileId:  z.string().uuid().optional(), // si absent → s'inscrire soi-même
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = EnrollSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { trainingId, profileId } = parsed.data;
  const targetProfileId = profileId ?? ctx.profileId;

  const { supabase, organizationId } = ctx;

  const { error } = await supabase
    .from('training_enrollments')
    .upsert({
      training_id:     trainingId,
      profile_id:      targetProfileId,
      organization_id: organizationId,
      status:          'enrolled',
      progress:        0,
    }, { onConflict: 'training_id,profile_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
