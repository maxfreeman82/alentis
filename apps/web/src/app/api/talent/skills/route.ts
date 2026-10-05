import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeSkills } from '@teranga/talent-assessment';

// Saisie manuelle des compétences quand l'analyse du CV n'en a détecté aucune.
// Ces compétences seront ensuite vérifiées par le quiz technique adaptatif.
const schema = z.object({ skills: z.array(z.string()).min(1).max(10) });

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Indiquez au moins une compétence.' }, { status: 400 });

  const skills = sanitizeSkills(parsed.data.skills);
  if (skills.length === 0) return NextResponse.json({ error: 'Compétences invalides.' }, { status: 400 });

  const { error } = await createAdminClient()
    .from('profiles')
    .update({ cv_extracted_skills: skills })
    .eq('id', ctx.profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, skills });
}
