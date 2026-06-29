import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const TrainingSchema = z.object({
  title:            z.string().min(2),
  description:      z.string().optional(),
  category:         z.enum(['technique','management','soft_skills','reglementaire','metier']).optional(),
  format:           z.enum(['presentiel','distanciel','blended','e_learning']).optional(),
  duration_hours:   z.number().positive().optional().nullable(),
  instructor:       z.string().optional().nullable(),
  max_participants: z.number().int().positive().optional().nullable(),
  start_date:       z.string().optional().nullable(),
  end_date:         z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });

  if (!['org_admin','org_hr','org_manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const body = await req.json() as unknown;
  const parsed = TrainingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { supabase, organizationId } = ctx;

  const d = parsed.data;

  const { data, error } = await supabase
    .from('trainings')
    .insert({
      organization_id:  organizationId,
      status:           'active',
      title:            d.title,
      description:      d.description ?? null,
      category:         d.category ?? null,
      format:           d.format ?? null,
      duration_hours:   d.duration_hours ?? null,
      instructor:       d.instructor ?? null,
      max_participants: d.max_participants ?? null,
      start_date:       d.start_date ?? null,
      end_date:         d.end_date ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, id: data.id });
}
