import { checkPermission } from '@/lib/api-auth';
import {
  computeEnergyProfile,
  computeSoftSkills,
  computeAvgSoftScore,
  type EnergyFamilyId,
} from '@/lib/passport/assessment';
import { compute6DScore } from '@teranga/scoring';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { generatePassportId } from '@/lib/utils';
import { z } from 'zod';

const BodySchema = z.object({
  organizationId:  z.string().uuid(),
  profileId:       z.string().uuid(),
  responses:       z.record(z.string(), z.number().min(1).max(5)),
  hardSkillsScore: z.number().min(0).max(100).optional(),
  experienceScore: z.number().min(0).max(100).optional(),
  lifeScore:       z.number().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  const { error: authErr } = await checkPermission('edit:passport');
  if (authErr) return authErr;

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
  }

  const { organizationId, profileId, responses, hardSkillsScore = 60, experienceScore = 50, lifeScore = 55 } = parsed.data;

  // 1. Profil énergétique
  const energyProfile = computeEnergyProfile(responses);

  // 2. Soft skills
  const softScores  = computeSoftSkills(responses);
  const avgSoftScore = computeAvgSoftScore(softScores);

  // 3. Score 6D global
  const score6D = compute6DScore({
    hardSkills:  hardSkillsScore,
    softSkills:  avgSoftScore,
    experience:  experienceScore,
    lifeScore,
    energyFit:   energyProfile.total,
    stressRisk:  100 - (softScores.stress_mgmt ?? 60),
  });

  // 4. Upsert Talent Passport
  const supabase = createServerClient();
  await setOrgContext(supabase, organizationId);

  const passportData = {
    profile_id:            profileId,
    organization_id:       organizationId,
    score_global:          score6D.composite,
    score_hard:            hardSkillsScore,
    score_soft:            avgSoftScore,
    score_exp:             experienceScore,
    score_life:            lifeScore,
    score_energy:          energyProfile.total,
    score_risk:            100 - (softScores.stress_mgmt ?? 60),
    energy_pilotes:        energyProfile.scores.pilotes,
    energy_initialiseurs:  energyProfile.scores.initialiseurs,
    energy_accomplisseurs: energyProfile.scores.accomplisseurs,
    energy_dynamiseurs:    energyProfile.scores.dynamiseurs,
    energy_regulateurs:    energyProfile.scores.regulateurs,
    dominant_family:       energyProfile.dominant,
    energy_level:          energyProfile.energyLevel,
    soft_communication:    softScores.communication,
    soft_leadership:       softScores.leadership,
    soft_adaptability:     softScores.adaptability,
    soft_problem_solving:  softScores.problem_solving,
    soft_critical_thinking:softScores.critical_thinking,
    soft_collaboration:    softScores.collaboration,
    soft_stress_mgmt:      softScores.stress_mgmt,
    soft_organization:     softScores.organization,
    soft_learning_speed:   softScores.learning_speed,
    soft_emotional_intel:  softScores.emotional_intel,
    passport_id:           generatePassportId('SN'),
    last_assessment:       new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('talent_passports')
    .upsert(passportData, { onConflict: 'profile_id' })
    .select('id, passport_id')
    .single();

  if (error) {
    return Response.json({ error: 'Erreur base de données', details: error.message }, { status: 500 });
  }

  return Response.json({
    passport_id:    data.passport_id,
    id:             data.id,
    score_global:   score6D.composite,
    color:          score6D.color,
    energy_profile: energyProfile,
    soft_scores:    softScores,
    breakdown:      score6D.breakdown,
  });
}
