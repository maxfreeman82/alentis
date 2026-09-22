import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import CvUploadCard from '@/components/talent/CvUploadCard';

export default async function ParametresPage() {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);
  if (!ctx) redirect('/onboarding');

  // `cv_extracted_skills` (migration 007) n'existe pas encore dans le type
  // `Database` strict de lib/supabase/server.ts (maintenu à la main, pas
  // régénéré depuis la base live) — `ctx.supabase` refuse donc de la sélectionner
  // au typecheck. On lit via le client admin non typé, comme POST /api/talent/cv
  // le fait déjà en écriture pour cette même colonne.
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('cv_url, cv_extracted_skills')
    .eq('id', ctx.profileId)
    .maybeSingle();

  if (profileError) {
    console.error('[parametres] failed to load CV profile data:', profileError);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">PARAMÈTRES</p>
        <h1 className="font-display text-slate-900 text-2xl">Mon compte</h1>
      </div>

      <CvUploadCard
        hasExistingCv={!!profile?.cv_url}
        existingSkills={(profile?.cv_extracted_skills as string[] | null) ?? []}
      />
    </div>
  );
}
