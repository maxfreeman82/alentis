import { type NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeDiagnostic } from '@/lib/matching/diagnostic';

// POST /api/matching/pre-application-diagnostic
// Corps : { jobOfferId: string }
// Auth  : talent authentifié avec permission edit:passport
export async function POST(req: NextRequest) {
  const { ctx, error: authErr } = await checkPermission('edit:passport');
  if (authErr) return authErr;

  let body: { jobOfferId?: string };
  try { body = await req.json() as { jobOfferId?: string }; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const { jobOfferId } = body;
  if (!jobOfferId) return NextResponse.json({ error: 'jobOfferId requis' }, { status: 400 });

  const admin = createAdminClient();

  const [passportRes, jobRes] = await Promise.all([
    admin.from('talent_passports')
      .select('score_hard, score_soft, score_exp, score_life, score_energy, score_risk, dominant_profile, energy_level')
      .eq('profile_id', ctx.profileId)
      .maybeSingle(),
    admin.from('job_offers')
      .select('id, title, company_name, description, min_score_global, min_score_hard, min_score_soft')
      .eq('id', jobOfferId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!passportRes.data) {
    return NextResponse.json(
      { error: 'Talent Passport introuvable — complétez votre évaluation d\'abord' },
      { status: 404 }
    );
  }
  if (!jobRes.data) {
    return NextResponse.json({ error: 'Offre introuvable ou inactive' }, { status: 404 });
  }

  const diagnostic = await computeDiagnostic({
    passport: passportRes.data,
    job:      jobRes.data,
  });

  return NextResponse.json(diagnostic);
}
