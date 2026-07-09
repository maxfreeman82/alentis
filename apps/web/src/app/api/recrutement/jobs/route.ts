import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';
import { checkPermission } from '@/lib/api-auth';

// Colonnes réelles : id, organization_id, okr_id, title, description,
// requirements (jsonb), soft_thresholds (jsonb), weights_6d (jsonb),
// status, ias_impact, created_at

const createSchema = z.object({
  title:            z.string().min(2),
  description:      z.string().optional(),
  required_family:  z.string().optional(),
  min_score_global: z.number().min(0).max(100).default(60),
  requirements:     z.record(z.string(), z.unknown()).optional(),
  soft_thresholds:  z.record(z.string(), z.unknown()).optional(),
  ias_impact:       z.number().optional(),
  weights_6d:       z.record(z.string(), z.number()).optional(),
  okr_id:           z.string().uuid().optional(),
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
  const { ctx: auth, error: authErr } = await checkPermission('view:jobs');
  if (authErr) return authErr;

  const ctx = await getUserOrg(auth.userId);
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
  const { ctx: auth, error: authErr } = await checkPermission('manage:jobs');
  if (authErr) return authErr;

  const ctx = await getUserOrg(auth.userId);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Fusionner required_family et min_score_global dans requirements JSONB
  const requirements = {
    ...(parsed.data.requirements ?? {}),
    ...(parsed.data.required_family  !== undefined && { required_family:  parsed.data.required_family }),
    ...(parsed.data.min_score_global !== undefined && { min_score_global: parsed.data.min_score_global }),
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      organization_id: organizationId,
      title:           parsed.data.title,
      description:     parsed.data.description   ?? null,
      requirements,
      soft_thresholds: parsed.data.soft_thresholds ?? null,
      ias_impact:      parsed.data.ias_impact      ?? null,
      weights_6d:      parsed.data.weights_6d      ?? null,
      okr_id:          parsed.data.okr_id          ?? null,
      status:          'open',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { ctx: auth, error: authErr } = await checkPermission('manage:jobs');
  if (authErr) return authErr;

  const ctx = await getUserOrg(auth.userId);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, title, status, description, requirements, soft_thresholds, ias_impact, weights_6d } = parsed.data;

  const updates = {
    ...(title           !== undefined && { title }),
    ...(status          !== undefined && { status }),
    ...(description     !== undefined && { description:     description     ?? null }),
    ...(requirements    !== undefined && { requirements:    requirements    ?? null }),
    ...(soft_thresholds !== undefined && { soft_thresholds: soft_thresholds ?? null }),
    ...(ias_impact      !== undefined && { ias_impact:      ias_impact      ?? null }),
    ...(weights_6d      !== undefined && { weights_6d:      weights_6d      ?? null }),
  };

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
