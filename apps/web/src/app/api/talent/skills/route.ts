import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeSkills } from '@teranga/talent-assessment';

// Saisie manuelle quand l'analyse du CV n'a pas extrait compétences ou poste.
// Ces déclarations sont ensuite vérifiées par le quiz technique et les questions
// de preuve ; l'expérience reste « déclarée » tant qu'elle n'est pas corroborée.
const schema = z.object({
  skills:   z.array(z.string()).min(1).max(10),
  jobTitle: z.string().trim().min(2).max(120).optional(),
  yearsExp: z.number().int().min(0).max(60).optional(),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Indiquez au moins une compétence et votre poste.' }, { status: 400 });

  const skills = sanitizeSkills(parsed.data.skills);
  if (skills.length === 0) return NextResponse.json({ error: 'Compétences invalides.' }, { status: 400 });

  const update: Record<string, unknown> = { cv_extracted_skills: skills };
  if (parsed.data.jobTitle) update.job_title = parsed.data.jobTitle;
  if (parsed.data.yearsExp != null) update.years_experience = parsed.data.yearsExp;

  const { error } = await createAdminClient()
    .from('profiles')
    .update(update)
    .eq('id', ctx.profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, skills });
}
