import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader } from '@/components/shared';
import { AssessmentQuestionnaire } from '@/components/passport/AssessmentQuestionnaire';

export default async function QuestionnairePage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  // En prod : orgId récupéré via profil Supabase lié à user.id
  const orgId     = 'mock-org-id';
  const profileId = user?.id ?? 'mock-profile-id';

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="TALENT PASSPORT"
        tagColor="text-violet"
        title="Questionnaire Energy Skills"
        subtitle="40 questions pour révéler votre profil énergétique et vos soft skills. Durée estimée : 8 minutes."
      />

      <AssessmentQuestionnaire organizationId={orgId} profileId={profileId} />
    </div>
  );
}
