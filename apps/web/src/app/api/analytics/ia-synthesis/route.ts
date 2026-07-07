import { type NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/analytics/ia-synthesis
// Corps : { organizationId: string }
// Auth  : manage:jobs (org_admin / org_manager / org_hr)
// Génère une synthèse narrative IA de l'état de l'organisation
export async function POST(req: NextRequest) {
  const { ctx, error: authErr } = await checkPermission('manage:jobs');
  if (authErr) return authErr;

  const admin = createAdminClient();
  const year  = new Date().getFullYear();

  // Récupérer l'org du caller
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', ctx.profileId)
    .maybeSingle();

  const orgId = callerProfile?.organization_id;
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });

  const { data: org } = await admin
    .from('organizations')
    .select('name, ias_score')
    .eq('id', orgId)
    .maybeSingle();

  // Collecter toutes les données analytiques
  const [
    passportsRes, evalsRes, pulsesRes, okrsRes,
    wellbeingRes, appsRes, profilesRes, enrollRes,
  ] = await Promise.all([
    admin.from('talent_passports')
      .select('score_global, score_hard, score_soft, score_exp, score_life, score_energy, score_risk, dominant_family')
      .eq('organization_id', orgId),
    admin.from('quarterly_evaluations')
      .select('correlation_score, departure_risk, quarter')
      .eq('organization_id', orgId).eq('year', year),
    admin.from('vision_pulses')
      .select('adhesion_score, quarter, year')
      .eq('organization_id', orgId)
      .order('year', { ascending: false }).order('quarter', { ascending: false }).limit(4),
    admin.from('okr_company')
      .select('progress, on_track, title')
      .eq('organization_id', orgId).eq('year', year),
    admin.from('wellbeing_surveys')
      .select('score_global, burnout_risk')
      .eq('organization_id', orgId).eq('year', year),
    admin.from('applications')
      .select('stage, score_6d, created_at')
      .eq('organization_id', orgId),
    admin.from('profiles')
      .select('role')
      .eq('organization_id', orgId),
    admin.from('training_enrollments')
      .select('status')
      .eq('organization_id', orgId),
  ]);

  const passports = passportsRes.data ?? [];
  const evals     = evalsRes.data     ?? [];
  const pulses    = pulsesRes.data    ?? [];
  const okrs      = okrsRes.data      ?? [];
  const wellbeing = wellbeingRes.data ?? [];
  const apps      = appsRes.data      ?? [];
  const profiles  = profilesRes.data  ?? [];
  const enrolls   = enrollRes.data    ?? [];

  // Métriques calculées
  const avgScore    = passports.length > 0 ? Math.round(passports.reduce((s, p) => s + (p.score_global ?? 0), 0) / passports.length) : 0;
  const highRisk    = passports.filter(p => (p.score_risk ?? 0) > 40).length;
  const avgWellbeing = wellbeing.length > 0 ? Math.round(wellbeing.reduce((s, w) => s + (w.score_global ?? 0), 0) / wellbeing.length) : 0;
  const burnoutCount = wellbeing.filter(w => (w.burnout_risk ?? 0) >= 60).length;
  const latestPulse  = pulses[0]?.adhesion_score ?? 0;
  const okrOnTrack   = okrs.length > 0 ? Math.round(okrs.filter(o => o.on_track).length / okrs.length * 100) : 0;
  const avgCorr      = evals.length > 0 ? Math.round(evals.reduce((s, e) => s + (e.correlation_score ?? 0), 0) / evals.length) : 0;
  const formCompletion = enrolls.length > 0 ? Math.round(enrolls.filter(e => e.status === 'completed').length / enrolls.length * 100) : 0;
  const hiredApps    = apps.filter(a => a.stage === 'hired').length;
  const totalApps    = apps.length;
  const avgAppScore  = apps.filter(a => a.score_6d != null).length > 0
    ? Math.round(apps.reduce((s, a) => s + (a.score_6d ?? 0), 0) / apps.filter(a => a.score_6d != null).length)
    : 0;

  // Distribution 6D équipe
  const dim6D = passports.length > 0 ? {
    H: Math.round(passports.reduce((s, p) => s + (p.score_hard   ?? 0), 0) / passports.length),
    S: Math.round(passports.reduce((s, p) => s + (p.score_soft   ?? 0), 0) / passports.length),
    X: Math.round(passports.reduce((s, p) => s + (p.score_exp    ?? 0), 0) / passports.length),
    L: Math.round(passports.reduce((s, p) => s + (p.score_life   ?? 0), 0) / passports.length),
    E: Math.round(passports.reduce((s, p) => s + (p.score_energy ?? 0), 0) / passports.length),
    R: Math.round(passports.reduce((s, p) => s + (p.score_risk   ?? 0), 0) / passports.length),
  } : null;

  // Famille dominante équipe
  const familyDist = passports.reduce<Record<string, number>>((acc, p) => {
    const f = p.dominant_family ?? 'inconnu';
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});
  const topFamily = Object.entries(familyDist).sort(([, a], [, b]) => b - a)[0];

  const prompt = `Tu es l'IA analytique RH de Teranga Align. Génère une synthèse exécutive structurée en français pour le dirigeant de l'entreprise "${org?.name ?? 'Organisation'}".

DONNÉES ORGANISATION (${year}) :
- Effectif : ${profiles.length} personnes · Passports 6D : ${passports.length}
- IAS (Index Alignement Stratégique) : ${org?.ias_score ?? 0}/100
- Score Talent moyen : ${avgScore}/100
- Famille énergétique dominante : ${topFamily ? `${topFamily[0]} (${topFamily[1]}/${passports.length})` : 'N/A'}
- Distribution 6D équipe : ${dim6D ? `H=${dim6D.H} S=${dim6D.S} X=${dim6D.X} L=${dim6D.L} E=${dim6D.E} R=${dim6D.R}` : 'N/A'}
- Score corrélation moyen : ${avgCorr}/100
- Profils à risque de départ (score_risk>40) : ${highRisk}
- Adhésion Vision Pulse : ${latestPulse}/100 (dernier sondage)
- OKR on-track : ${okrOnTrack}% (${okrs.filter(o => o.on_track).length}/${okrs.length})
- Bien-être moyen : ${avgWellbeing}/100 · Alertes burnout : ${burnoutCount}
- Formation : ${formCompletion}% complétion (${enrolls.length} inscriptions)
- Recrutement : ${totalApps} candidatures · ${hiredApps} recrutés · Score 6D moyen candidats : ${avgAppScore}

Génère une synthèse en 4 sections courtes (3-4 phrases chacune) :

## ✅ Points forts
[Forces identifiées dans les données]

## ⚠️ Points d'attention
[Risques prioritaires à adresser]

## 📈 Dynamique
[Tendances positives et momentum]

## 🎯 Recommandations prioritaires
[3 actions concrètes numérotées pour le dirigeant]

Ton style : direct, factuel, orienté action. Pas de généralités. Cite les chiffres clés.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res    = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    });
    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    return NextResponse.json({ ok: true, synthesis: text, generatedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur IA';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
