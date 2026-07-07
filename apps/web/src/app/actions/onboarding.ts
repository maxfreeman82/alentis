'use server';

import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';

export interface OnboardingData {
  firstName:     string;
  lastName:      string;
  personalEmail: string;
  phone:         string;
  city:          string;
  country:       string;
  currentStatus: 'looking' | 'open' | 'employed' | 'founder';
  sector:        string;
  yearsExp:      number;
  jobTitle:      string;
  employerName:  string;
  targetRoles:   string[];
  targetSectors: string[];
  salaryMin:     number | null;
  locationPref:  'onsite' | 'remote' | 'hybrid';
  mobilityOk:    boolean;
  cvSkills:      string[]; // compétences extraites du CV par Claude
}

export async function submitOnboarding(
  data: OnboardingData
): Promise<{ error: string } | { ok: true }> {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: profile, error: upsertErr } = await admin
    .from('profiles')
    .upsert(
      {
        user_id:              user.id,
        email:                user.email ?? '',
        first_name:           data.firstName,
        last_name:            data.lastName,
        personal_email:       data.personalEmail,
        phone:                data.phone        || null,
        city:                 data.city         || null,
        country:              data.country      || 'SN',
        role:                 'talent_free',
        current_status:       data.currentStatus,
        sector:               data.sector       || null,
        years_experience:     data.yearsExp     || null,
        job_title:            data.jobTitle     || null,
        employer_name:        data.employerName || null,
        target_roles:         data.targetRoles,
        target_sectors:       data.targetSectors,
        salary_min:           data.salaryMin    ?? null,
        location_pref:        data.locationPref,
        mobility_ok:          data.mobilityOk,
        onboarding_completed: true,
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single();

  if (upsertErr || !profile) {
    console.error('[onboarding]', upsertErr);
    return { error: upsertErr?.message ?? 'Erreur lors de la création du profil' };
  }

  // Passport stub (version 0) si pas encore créé
  const { data: existingPassport } = await admin
    .from('talent_passports')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (!existingPassport) {
    const ref = `TP-${data.firstName.slice(0, 2).toUpperCase()}${data.lastName.slice(0, 2).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await admin.from('talent_passports').insert({
      profile_id: profile.id, passport_id: ref, passport_version: 0, verified: false,
    });
  }

  await admin.from('onboarding_progress').upsert(
    {
      profile_id: profile.id,
      step_identity: true, step_situation: true, step_objectives: true,
      last_active_step: 'assessment',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  );

  return { ok: true };
}
