import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const schema = z.object({
  jobId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const ctx  = await getTalentProfile(user.id);

  if (!ctx) return NextResponse.json({ error: 'Profil talent introuvable' }, { status: 401 });

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'jobId invalide' }, { status: 400 });

  const { jobId } = parsed.data;
  const admin     = createAdminClient();

  // Récupérer le passport du talent
  const { data: passport } = await admin
    .from('talent_passports')
    .select('id')
    .eq('profile_id', ctx.profileId)
    .maybeSingle();

  if (!passport) {
    return NextResponse.json({ error: 'Talent Passport requis pour postuler' }, { status: 400 });
  }

  // Récupérer le job pour avoir l'organization_id
  const { data: job } = await admin
    .from('jobs')
    .select('id, organization_id, status')
    .eq('id', jobId)
    .in('status', ['open', 'active'])
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: 'Offre introuvable ou fermée' }, { status: 404 });
  }

  // Vérifier si déjà candidaté
  const { data: existing } = await admin
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('passport_id', passport.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyApplied: true, id: existing.id });
  }

  // Créer la candidature
  const { data: application, error } = await admin
    .from('applications')
    .insert({
      job_id:          jobId,
      passport_id:     passport.id,
      organization_id: job.organization_id,
      stage:           'new',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: application.id }, { status: 201 });
}
