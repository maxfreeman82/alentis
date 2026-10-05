import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { QUESTION_STEPS } from '@/lib/talent/assessment';
import { sanitizeSkills } from '@teranga/talent-assessment';
import AssessmentForm from '@/components/talent/AssessmentForm';

export default async function AssessmentPage() {
  const user = await requireAuth();
  const ctx = await getTalentProfile(user.id);

  // Rediriger vers l'onboarding si le profil n'existe pas encore
  if (!ctx) redirect('/onboarding');

  const { supabase, profileId } = ctx;

  // Vérifier si le passport existe déjà
  const { data: existing } = await supabase
    .from('talent_passports')
    .select('id, last_assessment')
    .eq('profile_id', profileId)
    .maybeSingle();

  // Étapes adaptatives déjà terminées. Client admin (non typé) : la table n'est
  // pas encore dans les types générés ; filtrée sur le profil authentifié.
  const { data: adaptiveDone } = await createAdminClient()
    .from('talent_assessment_sessions')
    .select('step')
    .eq('profile_id', profileId)
    .eq('status', 'completed');
  const completedAdaptiveSteps = (adaptiveDone ?? []).map(r => r.step as string);

  // CV obligatoire : sans compétences extraites, l'étape technique n'a rien à tester.
  const { data: cvProfile } = await createAdminClient()
    .from('profiles')
    .select('cv_extracted_skills')
    .eq('id', profileId)
    .maybeSingle();
  const hasCvSkills = sanitizeSkills(cvProfile?.cv_extracted_skills).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">QUESTIONNAIRE 6D</p>
        <h1 className="font-display text-slate-900 text-2xl">Évaluation Talent Passport</h1>
        <p className="text-slate-400 text-sm mt-1">
          Questionnaire adaptatif · ~30 minutes · Les questions s'ajustent à vos réponses : compétences, expérience, énergie et life score
        </p>
      </div>

      {existing && (
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3 text-sm text-amber-400">
          ⚠ Vous avez déjà un Talent Passport généré le {new Date(existing.last_assessment ?? '').toLocaleDateString('fr-FR')}.
          Relancer l'évaluation mettra à jour votre profil.
        </div>
      )}

      <AssessmentForm steps={QUESTION_STEPS} profileId={profileId} completedAdaptiveSteps={completedAdaptiveSteps} hasCvSkills={hasCvSkills} />
    </div>
  );
}
