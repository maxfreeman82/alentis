import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

// Colonnes réelles : id, organization_id, okr_id, title, description,
// requirements (jsonb), soft_thresholds (jsonb), weights_6d (jsonb),
// status, ias_impact, created_at

const createSchema = z.object({
  title:           z.string().min(2),
  description:     z.string().optional(),
  requirements:    z.record(z.string(), z.unknown()).optional(),
  soft_thresholds: z.record(z.string(), z.unknown()).optional(),
  ias_impact:      z.number().optional(),
  weights_6d:      z.record(z.string(), z.number()).optional(),
  okr_id:          z.string().uuid().optional(),
});

const patchSchema = z.object({
  id:              z.string().uuid(),
  status:          z.enum(['active', 'draft', 'closed']).optional(),
  title:           z.string().min(2).optional(),
  description:     z.string().optional(),
  requirements:    z.record(z.string(), z.unknown()).optional(),
  soft_thresholds: z.record(z.string(), z.unknown()).optional(),
  ias_impact:      z.number().optional(),
  weights_6d:      z.record(z.string(), z.number()).optional(),
});

export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, description, status, requirements, soft_thresholds, ias_impact, weights_6d, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      organization_id: organizationId,
      title:           parsed.data.title,
      description:     parsed.data.description          ?? null,
      requirements:    parsed.data.requirements         ?? null,
      soft_thresholds: parsed.data.soft_thresholds      ?? null,
      ias_impact:      parsed.data.ias_impact           ?? null,
      weights_6d:      parsed.data.weights_6d           ?? null,
      okr_id:          parsed.data.okr_id               ?? null,
      status:          'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, ...rest } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (rest.title           !== undefined) updates['title']           = rest.title;
  if (rest.status          !== undefined) updates['status']          = rest.status;
  if (rest.description     !== undefined) updates['description']     = rest.description     ?? null;
  if (rest.requirements    !== undefined) updates['requirements']    = rest.requirements    ?? null;
  if (rest.soft_thresholds !== undefined) updates['soft_thresholds'] = rest.soft_thresholds ?? null;
  if (rest.ias_impact      !== undefined) updates['ias_impact']      = rest.ias_impact      ?? null;
  if (rest.weights_6d      !== undefined) updates['weights_6d']      = rest.weights_6d      ?? null;

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}
