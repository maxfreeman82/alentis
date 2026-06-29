import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeAssessment } from '@/lib/talent/assessment';

const schema = z.object({
  responses: z.record(z.string(), z.number().min(1).max(5)),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable — complétez l\'onboarding d\'abord.' }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = computeAssessment(parsed.data.responses);
  const admin  = createAdminClient();
  const passportRef = `TP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}-SN`;

  const { error } = await admin.from('talent_passports').upsert(
    {
      profile_id:            ctx.profileId,
      score_global:          result.score_global,
      score_hard:            result.scores.H,
      score_soft:            result.scores.S,
      score_exp:             result.scores.X,
      score_life:            result.scores.L,
      score_energy:          result.scores.energy[result.dominant_family],
      score_risk:            result.score_risk,
      growth_potential:      result.growth_potential,
      transfer_score:        result.transfer_score,
      energy_pilotes:        result.scores.energy.pilotes,
      energy_initialiseurs:  result.scores.energy.initialiseurs,
      energy_accomplisseurs: result.scores.energy.accomplisseurs,
      energy_dynamiseurs:    result.scores.energy.dynamiseurs,
      energy_regulateurs:    result.scores.energy.regulateurs,
      dominant_family:       result.dominant_family,
      dominant_profile:      result.dominant_profile,
      energy_level:          result.energy_level,
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
