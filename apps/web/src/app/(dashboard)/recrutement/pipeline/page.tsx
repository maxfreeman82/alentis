import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { PipelineBoard, type PipelineStage } from '@/components/recrutement/PipelineBoard';
import { getUserOrg } from '@/lib/supabase/auth';

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, organizationId } = ctx;
  const params = await searchParams;
  const jobId  = params.job;

  // Requête applications (filtrée par poste si param présent)
  let appsQuery = supabase
    .from('applications')
    .select('id, job_id, passport_id, stage, score_6d')
    .eq('organization_id', organizationId);
  if (jobId) appsQuery = appsQuery.eq('job_id', jobId);
  const { data: applications } = await appsQuery;

  const apps = applications ?? [];

  if (apps.length === 0) {
    const jobTitle = jobId ? (await supabase.from('jobs').select('title').eq('id', jobId).maybeSingle()).data?.title : null;
    return (
      <div className="animate-fade-in space-y-6">
        <SectionHeader
          tag="RECRUTEMENT · PIPELINE"
          title={jobTitle ? `Pipeline — ${jobTitle}` : 'Pipeline candidats'}
          subtitle="Glissez les candidats d'une étape à l'autre"
          action={<Link href="/recrutement/jobs" className="btn-secondary flex items-center gap-2 text-sm"><ArrowLeft size={14} /> Postes</Link>}
        />
        <div className="card text-center py-16 space-y-2">
          <p className="text-white font-display text-xl">Aucun candidat</p>
          <p className="text-slate-500 text-sm">Ajoutez des candidatures depuis le matching IA.</p>
        </div>
      </div>
    );
  }

  // Requêtes parallèles — pas de JOIN, pattern Map
  const jobIds      = [...new Set(apps.map(a => a.job_id))];
  const passportIds = [...new Set(apps.map(a => a.passport_id))];

  const [jobsRes, passportsRes] = await Promise.all([
    supabase.from('jobs').select('id, title').in('id', jobIds),
    supabase.from('talent_passports')
      .select('id, profile_id, score_global, dominant_profile, score_risk')
      .in('id', passportIds),
  ]);

  const profileIds = [...new Set((passportsRes.data ?? []).map(p => p.profile_id))];
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', profileIds);

  const jobMap      = new Map((jobsRes.data    ?? []).map(j => [j.id, j]));
  const passportMap = new Map((passportsRes.data ?? []).map(p => [p.id, p]));
  const profileMap  = new Map((profilesData    ?? []).map(p => [p.id, p]));

  const candidates = apps.map(app => {
    const passport = passportMap.get(app.passport_id);
    const profile  = passport ? profileMap.get(passport.profile_id) : undefined;
    const job      = jobMap.get(app.job_id);
    const name     = [profile?.first_name, profile?.last_name]
      .filter((v): v is string => !!v)
      .join(' ') || 'Candidat';

    return {
      id:             app.id,
      name,
      role:           job?.title ?? '—',
      score:          app.score_6d ?? passport?.score_global ?? 0,
      stage:          app.stage as PipelineStage,
      avatar_letter:  name[0]?.toUpperCase() ?? '?',
      energy:         passport?.dominant_profile ?? 'Initialiseurs',
      departure_risk: Math.round(passport?.score_risk ?? 0),
    };
  });

  const jobTitle = jobId ? jobMap.get(jobId)?.title : null;

  return (
    <div className="animate-fade-in">
      <SectionHeader
        tag="RECRUTEMENT · PIPELINE"
        title={jobTitle ? `Pipeline — ${jobTitle}` : 'Pipeline candidats'}
        subtitle={`${candidates.length} candidat${candidates.length !== 1 ? 's' : ''} · Glissez pour changer d'étape`}
        action={
          <Link href="/recrutement/jobs" className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft size={14} /> Postes
          </Link>
        }
      />
      <div className="mt-6">
        <PipelineBoard candidates={candidates} />
      </div>
    </div>
  );
}
