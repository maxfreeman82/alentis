import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const LeaveSchema = z.object({
  type:       z.enum(['conge_annuel','maladie','maternite','paternite','sans_solde','autre']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days:       z.number().int().min(1),
  reason:     z.string().optional(),
  profile_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });

  const body = await req.json() as unknown;
  const parsed = LeaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, start_date, end_date, days, reason, profile_id } = parsed.data;
  const { supabase, organizationId, profileId } = ctx;

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      organization_id: organizationId,
      profile_id:      profile_id ?? profileId,
      type,
      start_date,
      end_date,
      days,
      reason:          reason ?? null,
      status:          'pending',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, id: data.id });
}

const ApproveSchema = z.object({
  id:     z.string().uuid(),
  action: z.enum(['approved','rejected']),
});

export async function PATCH(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });

  if (!['org_admin', 'org_hr', 'org_manager'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const body = await req.json() as unknown;
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, action } = parsed.data;
  const { supabase } = ctx;

  const { error } = await supabase
    .from('leave_requests')
    .update({ status: action, approved_by: ctx.profileId })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
