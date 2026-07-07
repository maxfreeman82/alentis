import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const schema = z.object({
  jobId:       z.string().uuid(),
  firstName:   z.string().min(1).max(80),
  lastName:    z.string().min(1).max(80),
  email:       z.string().email(),
  phone:       z.string().max(30).optional(),
  linkedin:    z.string().max(200).optional(),
  motivation:  z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 });
  }

  const { jobId, firstName, lastName, email, phone, linkedin, motivation } = parsed.data;
  const admin = createAdminClient();

  // Vérifier que le job existe et est ouvert
  const { data: job } = await admin
    .from('jobs')
    .select('id, organization_id, title, status')
    .eq('id', jobId)
    .maybeSingle();

  if (!job || job.status !== 'open') {
    return NextResponse.json({ error: 'Poste non disponible' }, { status: 404 });
  }

  // Créer ou retrouver le profil candidat
  const workosId = `candidate_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', workosId)
    .maybeSingle();

  let profileId: string;

  if (existingProfile) {
    profileId = existingProfile.id;
  } else {
    const { data: newProfile, error: profileErr } = await admin
      .from('profiles')
      .insert({
        user_id: workosId,
        organization_id: job.organization_id,
        role:            'talent_free',
        first_name:      firstName,
        last_name:       lastName,
        email,
      })
      .select('id')
      .single();

    if (profileErr || !newProfile) {
      return NextResponse.json({ error: 'Erreur création profil' }, { status: 500 });
    }
    profileId = newProfile.id;
  }

  // Créer ou retrouver le passport stub
  const { data: existingPassport } = await admin
    .from('talent_passports')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  let passportId: string;

  if (existingPassport) {
    passportId = existingPassport.id;
  } else {
    const passRef = `CAND-${firstName.slice(0, 3).toUpperCase()}-${Date.now()}`;
    const { data: newPassport, error: passErr } = await admin
      .from('talent_passports')
      .insert({
        profile_id:       profileId,
        organization_id:  job.organization_id,
        passport_id:      passRef,
        passport_version: 0,
        verified:         false,
      })
      .select('id')
      .single();

    if (passErr || !newPassport) {
      return NextResponse.json({ error: 'Erreur création passport' }, { status: 500 });
    }
    passportId = newPassport.id;
  }

  // Vérifier doublon de candidature
  const { data: existingApp } = await admin
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('passport_id', passportId)
    .maybeSingle();

  if (existingApp) {
    return NextResponse.json({ error: 'Vous avez déjà postulé à ce poste.' }, { status: 409 });
  }

  // Créer la candidature
  const { error: appErr } = await admin
    .from('applications')
    .insert({
      job_id:          jobId,
      passport_id:     passportId,
      organization_id: job.organization_id,
      stage:           'new',
      ai_insight:      JSON.stringify({
        source:     'candidature_publique',
        phone,
        linkedin,
        motivation,
        submitted_at: new Date().toISOString(),
      }),
    });

  if (appErr) {
    return NextResponse.json({ error: 'Erreur enregistrement candidature' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'Candidature reçue avec succès' });
}
