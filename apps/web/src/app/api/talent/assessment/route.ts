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
  // L'UI actuelle (gate `energyStepDone` dans AssessmentForm.tsx) rend ce cas
  // très difficile à atteindre en parcours mono-onglet — accepté tel quel,
  // pas de transaction/RPC pour ce cas limite.
  const { data: existingPassport, error: existingErr } = await admin
    .from('talent_passports')
    .select('dominant_family, score_energy')
    .eq('profile_id', ctx.profileId)
    .maybeSingle();
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

  const dominantFamily = (existingPassport?.dominant_family as EnergyFamily | undefined) ?? 'pilotes';
  const scoreEnergy    = existingPassport?.score_energy ?? 20;

  const result = computeAssessment(parsed.data.responses, scoreEnergy);
  const passportRef = `TP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}-SN`;

  const profileIdx = Math.min(Math.floor(result.score_global / 34), 2);
  const dominantProfileList = FAMILY_PROFILES[dominantFamily] ?? ['Profil Unique'];
  const dominant_profile = dominantProfileList[profileIdx] ?? (dominantProfileList[0] ?? 'Profil Unique');

  const { error } = await admin.from('talent_passports').upsert(
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
      soft_communication:    Math.round((parsed.data.responses['S1'] ?? 3) * 20),
      soft_leadership:       Math.round((parsed.data.responses['S2'] ?? 3) * 20),
      soft_adaptability:     Math.round((parsed.data.responses['S3'] ?? 3) * 20),
      soft_problem_solving:  Math.round((parsed.data.responses['S4'] ?? 3) * 20),
      soft_critical_thinking: Math.round((parsed.data.responses['S5'] ?? 3) * 20),
      soft_collaboration:    Math.round((parsed.data.responses['S6'] ?? 3) * 20),
      soft_stress_mgmt:      Math.round((parsed.data.responses['S7'] ?? 3) * 20),
      soft_organization:     Math.round((parsed.data.responses['S8'] ?? 3) * 20),
      soft_learning_speed:   Math.round((parsed.data.responses['S9'] ?? 3) * 20),
      soft_emotional_intel:  Math.round((parsed.data.responses['S10'] ?? 3) * 20),
    },
    { onConflict: 'profile_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Marquer passport généré dans onboarding_progress
  await admin.from('onboarding_progress').upsert({
    profile_id:         ctx.profileId,
    passport_generated: true,
    step_energy_skills: true,
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'profile_id' });

  return NextResponse.json({ ok: true, score_global: result.score_global });
}
