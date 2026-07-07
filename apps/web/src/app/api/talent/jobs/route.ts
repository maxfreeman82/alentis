import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const createSchema = z.object({
  title:            z.string().min(3).max(200),
  company_name:     z.string().min(1).max(200),
  description:      z.string().optional(),
  location:         z.string().optional(),
  contract_type:    z.enum(['CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel']).default('CDI'),
  required_family:  z.enum(['pilotes', 'initialiseurs', 'accomplisseurs', 'dynamiseurs', 'regulateurs']).default('accomplisseurs'),
  min_score_global: z.number().int().min(0).max(100).default(60),
  min_score_hard:   z.number().int().min(0).max(100).default(50),
  min_score_soft:   z.number().int().min(0).max(100).default(50),
  salary_min:       z.number().int().min(0).optional(),
  salary_max:       z.number().int().min(0).optional(),
  is_premium:       z.boolean().default(false),
  expires_at:       z.string().datetime().optional(),
});

const ALLOWED_ROLES = ['admin', 'hr', 'manager'];

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const { data, error } = await ctx.supabase.from('job_offers').insert({
    organization_id:  ctx.organizationId,
    title:            d.title,
    company_name:     d.company_name,
    required_family:  d.required_family,
    min_score_global: d.min_score_global,
    min_score_hard:   d.min_score_hard,
    min_score_soft:   d.min_score_soft,
    contract_type:    d.contract_type,
    is_premium:       d.is_premium,
    description:      d.description ?? null,
    location:         d.location ?? null,
    salary_min:       d.salary_min ?? null,
    salary_max:       d.salary_max ?? null,
    expires_at:       d.expires_at ?? null,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function GET(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active') !== 'false';

  const { data, error } = await ctx.supabase
    .from('job_offers')
    .select('*')
    .eq('organization_id', ctx.organizationId)
    .eq('is_active', active)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  type JobOfferUpdate = { title?: string; company_name?: string; description?: string | null; location?: string | null; contract_type?: string | null; required_family?: string; min_score_global?: number; min_score_hard?: number; min_score_soft?: number; salary_min?: number | null; salary_max?: number | null; is_active?: boolean; is_premium?: boolean; expires_at?: string | null };
  const body = await req.json() as { id: string } & Record<string, unknown>;
  const { id, ...rawUpdates } = body;
  const updates = rawUpdates as JobOfferUpdate;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  // Vérifier appartenance org avant de modifier
  const { data: existing } = await ctx.supabase
    .from('job_offers')
    .select('id')
    .eq('id', id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });

  const { error } = await ctx.supabase.from('job_offers').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
