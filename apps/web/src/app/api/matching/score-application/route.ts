import { type NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeDiagnostic } from '@/lib/matching/diagnostic';

// POST /api/matching/score-application
// Corps : { applicationId: string }
// Auth  : org RH/recruteur avec permission manage:jobs
// Déclenche le scoring IA sur une candidature sans score
export async function POST(req: NextRequest) {
  const { ctx, error: authErr } = await checkPermission('manage:jobs');
  if (authErr) return authErr;

  let body: { applicationId?: string };
  try { body = await req.json() as { applicationId?: string }; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const { applicationId } = body;
  if (!applicationId) return NextResponse.json({ error: 'applicationId requis' }, { status: 400 });

  const admin = createAdminClient();

  // Récupérer l'application (vérifier qu'elle appartient à l'org)
  const { data: app } = await admin
    .from('applications')
    .select('id, job_id, passport_id, organization_id')
    .eq('id', applicationId)
    .maybeSingle();

  if (!app) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 });

  // Vérification organisation : l'admin RH doit appartenir à la même org
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', ctx.profileId)
    .maybeSingle();

  if (!callerProfile?.organization_id || callerProfile.organization_id !== app.organization_id) {
    return NextResponse.json({ error: 'Accès refusé — organisation différente' }, { status: 403 });
  }

  if (!app.passport_id || !app.job_id) {
    return NextResponse.json({ error: 'Candidature incomplète (passport_id ou job_id manquant)' }, { status: 422 });
  }

  const [passportRes, jobRes] = await Promise.all([
    admin.from('talent_passports')
      .select('score_hard, score_soft, score_exp, score_life, score_energy, score_risk, dominant_profile, energy_level')
      .eq('id', app.passport_id)
      .maybeSingle(),
    admin.from('jobs')
      .select('id, title, description, requirements')
      .eq('id', app.job_id)
      .maybeSingle(),
  ]);

  if (!passportRes.data) return NextResponse.json({ error: 'Passport introuvable' }, { status: 404 });
  if (!jobRes.data)      return NextResponse.json({ error: 'Poste introuvable'   }, { status: 404 });

  const jobData = jobRes.data;

  // Dériver les seuils depuis requirements JSONB si disponibles
  const thresholds = (jobData.requirements ?? {}) as {
    min_score_global?: number;
    min_score_hard?: number;
    min_score_soft?: number;
  };

  const diagnostic = await computeDiagnostic({
    passport: passportRes.data,
    job: {
      id:               jobData.id,
      title:            jobData.title,
      company_name:     'Teranga Align', // nom org récupéré séparément si besoin
      description:      jobData.description,
      min_score_global: thresholds.min_score_global ?? null,
      min_score_hard:   thresholds.min_score_hard   ?? null,
      min_score_soft:   thresholds.min_score_soft   ?? null,
    },
  });

  // Persister le score et l'analyse IA dans applications
  await admin
    .from('applications')
    .update({
      score_6d:        diagnostic.score6D.composite,
      score_breakdown: diagnostic.score6D.breakdown,
      ai_insight:      `${diagnostic.recommendation}\n\nForces : ${diagnostic.strengths.join(' · ')}\n${diagnostic.gaps.length > 0 ? `Gaps : ${diagnostic.gaps.map(g => `${g.label} (−${g.gap})`).join(' · ')}\n` : ''}${diagnostic.trainingRecommendations.length > 0 ? `Formations : ${diagnostic.trainingRecommendations.join(' · ')}` : ''}`.trim(),
    })
    .eq('id', applicationId);

  return NextResponse.json({ ok: true, score6D: diagnostic.score6D.composite, verdict: diagnostic.verdict });
}
