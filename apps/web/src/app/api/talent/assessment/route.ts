import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeAssessment, FAMILY_PROFILES, type EnergyFamily } from '@/lib/talent/assessment';

const schema = z.object({
  responses: z.record(z.string(), z.number().min(1).max(5)),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  // Profil énergie déjà posé par la conclusion de l'Energy Assessment adaptatif
  // (cf. /api/energy-assessment/answer). Si le candidat a sauté cette étape,
  // on retombe sur un défaut neutre — même esprit que l'ancien défaut "3/Neutre"
  // pour une question Likert non répondue.
  // Note (race acceptée) : rien ne verrouille cette ligne entre ce SELECT et
  // l'upsert plus bas. Si le candidat termine l'Energy Assessment adaptatif
  // dans un autre onglet/session pile dans cette fenêtre, score_global et
  // dominant_profile calculés ici peuvent se baser sur une énergie pré-conclusion
  // périmée, même si dominant_family/score_energy en base finissent post-conclusion.
  // L'UI actuelle (état `energyProfile` dans AssessmentForm.tsx, qui gate
  // stepComplete/sDone pour l'onglet E) rend ce cas très difficile à atteindre
  // en parcours mono-onglet — accepté tel quel, pas de transaction/RPC pour ce
  // cas limite.
  const { data: existingPassport, error: existingErr } = await admin
    .from('talent_passports')
    .select('dominant_family, score_energy')
    .eq('profile_id', ctx.profileId)
    .maybeSingle();
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

  const dominantFamily = (existingPassport?.dominant_family as EnergyFamily | undefined) ?? 'pilotes';
  const scoreEnergy    = existingPassport?.score_energy ?? 20;

  // Étapes adaptatives : on retient la passation terminée la plus récente par étape.
  const { data: sessions, error: sessionsErr } = await admin
    .from('talent_assessment_sessions')
    .select('step, result')
    .eq('profile_id', ctx.profileId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false });
  if (sessionsErr) return NextResponse.json({ error: sessionsErr.message }, { status: 500 });

  type StepResult = { facetScores: Record<string, number>; stepScore: number };
  const latest = new Map<string, StepResult>();
  for (const s of sessions ?? []) if (!latest.has(s.step) && s.result) latest.set(s.step, s.result as StepResult);

  const STEP_LABELS: Record<string, string> = {
    hard: 'Compétences techniques', soft: 'Soft Skills', life: 'Life Score', risk: 'Risques & bien-être',
  };
  const missing = Object.keys(STEP_LABELS).filter(step => !latest.has(step));
  if (missing.length > 0) {
    const names = missing.map(step => STEP_LABELS[step]).join(', ');
    return NextResponse.json({ error: `Terminez ces étapes avant de générer votre Passport : ${names}.` }, { status: 400 });
  }
  const hard = latest.get('hard')!;
  const soft = latest.get('soft')!;
  const life = latest.get('life')!;
  const risk = latest.get('risk')!;

  const result = computeAssessment(parsed.data.responses, scoreEnergy, {
    H: hard.stepScore,
    S: soft.stepScore,
    L: life.stepScore,
    // Étape Risques : 100 = aucun signal ; score_risk : 100 = risque max.
    R: 100 - risk.stepScore,
  });
  const passportRef = `TP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}-SN`;

  const profileIdx = Math.min(Math.floor(result.score_global / 34), 2);
  const dominantProfileList = FAMILY_PROFILES[dominantFamily] ?? ['Profil Unique'];
  const dominant_profile = dominantProfileList[profileIdx] ?? (dominantProfileList[0] ?? 'Profil Unique');

  const { data: passport, error } = await admin.from('talent_passports').upsert(
    {
      profile_id:            ctx.profileId,
      score_global:          result.score_global,
      score_hard:            result.scores.H,
      score_soft:            result.scores.S,
      score_exp:             result.scores.X,
      score_life:            result.scores.L,
      score_risk:            result.score_risk,
      growth_potential:      result.growth_potential,
      transfer_score:        result.transfer_score,
      dominant_profile,
      last_assessment:       new Date().toISOString(),
      passport_version:      1,
      passport_id:           passportRef,
      verified:              false,
      soft_communication:     soft.facetScores.communication ?? null,
      soft_leadership:        soft.facetScores.leadership ?? null,
      soft_adaptability:      soft.facetScores.adaptability ?? null,
      soft_problem_solving:   soft.facetScores.problem_solving ?? null,
      soft_critical_thinking: soft.facetScores.critical_thinking ?? null,
      soft_collaboration:     soft.facetScores.collaboration ?? null,
      soft_stress_mgmt:       soft.facetScores.stress_mgmt ?? null,
      soft_organization:      soft.facetScores.organization ?? null,
      soft_learning_speed:    soft.facetScores.learning_speed ?? null,
      soft_emotional_intel:   soft.facetScores.emotional_intel ?? null,
    },
    { onConflict: 'profile_id' }
  ).select('id').single();

  if (error || !passport) return NextResponse.json({ error: error?.message ?? 'Enregistrement impossible' }, { status: 500 });

  // Compétences vérifiées par le quiz : on remplace les précédentes lignes validées.
  // Niveau 1–5 = plus haut niveau réussi (facetScore / 20), au minimum 1.
  const { error: delErr } = await admin.from('hard_skills').delete()
    .eq('passport_id', passport.id).eq('validated', true);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  const skillRows = Object.entries(hard.facetScores).map(([name, score]) => ({
    passport_id: passport.id,
    name,
    level:       Math.max(1, Math.round(score / 20)),
    validated:   true,
  }));
  if (skillRows.length > 0) {
    const { error: skillsErr } = await admin.from('hard_skills').insert(skillRows);
    if (skillsErr) return NextResponse.json({ error: skillsErr.message }, { status: 500 });
  }

  // Marquer passport généré dans onboarding_progress
  await admin.from('onboarding_progress').upsert({
    profile_id:         ctx.profileId,
    passport_generated: true,
    step_energy_skills: true,
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'profile_id' });

  return NextResponse.json({ ok: true, score_global: result.score_global });
}
