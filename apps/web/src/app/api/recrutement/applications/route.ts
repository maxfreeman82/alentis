import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const createSchema = z.object({
  job_id:      z.string().uuid(),
  passport_id: z.string().uuid(),
  score_6d:    z.number().optional(),
  ai_insight:  z.string().optional(),
});

export async function GET(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('job_id');

  let appsQuery = supabase
    .from('applications')
    .select('id, job_id, passport_id, stage, score_6d, score_breakdown, ai_insight, candidate_rating, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (jobId) appsQuery = appsQuery.eq('job_id', jobId);

  const { data: applications, error } = await appsQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!applications || applications.length === 0) {
    return NextResponse.json({ applications: [] });
  }

  // Requêtes parallèles — pas de JOIN (Relationships: [])
  const jobIds = [...new Set(applications.map(a => a.job_id))];
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title')
    .in('id', jobIds);

  const jobMap = new Map((jobs ?? []).map(j => [j.id, j]));

  const enriched = applications.map(app => ({
    ...app,
    job_title: jobMap.get(app.job_id)?.title ?? null,
  }));

  return NextResponse.json({ applications: enriched });
}

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Vérifier que le job appartient à l'organisation
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', parsed.data.job_id)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 });

  // Score breakdown depuis le passport
  const { data: passport } = await supabase
    .from('talent_passports')
    .select('score_global, score_hard, score_soft, score_energy')
    .eq('id', parsed.data.passport_id)
    .maybeSingle();

  const scoreBreakdown = passport
    ? { score_global: passport.score_global, score_hard: passport.score_hard, score_soft: passport.score_soft, score_energy: passport.score_energy }
    : null;

  const { data, error } = await supabase
    .from('applications')
    .insert({
      job_id:          parsed.data.job_id,
      passport_id:     parsed.data.passport_id,
      organization_id: organizationId,
      stage:           'new',
      score_6d:        parsed.data.score_6d ?? null,
      score_breakdown: scoreBreakdown as unknown,
      ai_insight:      parsed.data.ai_insight ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data }, { status: 201 });
}
