import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { QUESTION_STEPS } from '@/lib/talent/assessment';
import AssessmentForm from '@/components/talent/AssessmentForm';

export default async function AssessmentPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, profileId } = ctx;

  // Vérifier si le passport existe déjà
  const { data: existing } = await supabase
    .from('talent_passports')
    .select('id, last_assessment')
    .eq('profile_id', profileId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">QUESTIONNAIRE 6D</p>
        <h1 className="font-display text-white text-2xl">Évaluation Talent Passport</h1>
        <p className="text-slate-400 text-sm mt-1">
          40 questions · ~15 minutes · Votre profil complet : compétences, expérience, énergie et life score
        </p>
      </div>

      {existing && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3 text-sm text-amber-400">
          ⚠ Vous avez déjà un Talent Passport généré le {new Date(existing.last_assessment ?? '').toLocaleDateString('fr-FR')}.
          Relancer l'évaluation mettra à jour votre profil.
        </div>
      )}

      <AssessmentForm steps={QUESTION_STEPS} profileId={profileId} />
    </div>
  );
}
