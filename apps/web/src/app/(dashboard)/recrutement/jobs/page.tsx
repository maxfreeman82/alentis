import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import Link from 'next/link';
import { Briefcase, ArrowRight, Plus, KanbanSquare } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { CreateJobButton } from '@/components/recrutement/CreateJobButton';

const STATUS_COLORS  = { active: 'text-emerald', draft: 'text-slate-500', closed: 'text-rose-400' };
const STATUS_LABELS  = { active: 'Actif', draft: 'Brouillon', closed: 'Fermé' };
const STAGE_SHORT    = ['N', 'S', 'I', 'A', 'O', 'E'];

export default async function JobsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;
  const { supabase, organizationId } = ctx;

  const [jobsRes, appsRes] = await Promise.all([
    supabase.from('jobs').select('id, title, status, ias_impact, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    supabase.from('applications').select('job_id, stage').eq('organization_id', organizationId),
  ]);

  const appsByJob = new Map<string, string[]>();
  for (const a of appsRes.data ?? []) {
    if (!appsByJob.has(a.job_id)) appsByJob.set(a.job_id, []);
    appsByJob.get(a.job_id)!.push(a.stage);
  }

  const enriched = (jobsRes.data ?? []).map(job => {
    const stages = appsByJob.get(job.id) ?? [];
    const stageCounts = { new: 0, screening: 0, interview: 0, assessment: 0, offer: 0, hired: 0 } as Record<string, number>;
    for (const s of stages) if (s in stageCounts) stageCounts[s] = (stageCounts[s] ?? 0) + 1;
    return { ...job, stageCounts, total: stages.length };
  });

  const activeCount = enriched.filter(j => j.status === 'active').length;
  const totalCands  = enriched.reduce((s, j) => s + j.total, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="RECRUTEMENT · POSTES"
        title="Postes ouverts"
        subtitle={`${activeCount} actif${activeCount !== 1 ? 's' : ''} · ${totalCands} candidats`}
        action={<CreateJobButton />}
      />

      {enriched.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-white font-display text-xl">Aucun poste créé</p>
          <p className="text-slate-500 text-sm">Commencez par créer votre premier poste de recrutement.</p>
          <CreateJobButton />
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map(job => (
            <div key={job.id} className="card group hover:border-white/10 flex items-center gap-4">
              <div className="w-9 h-9 bg-bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase size={15} className="text-slate-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium text-sm truncate">{job.title}</p>
                  <span className={`text-[10px] font-bold ${STATUS_COLORS[job.status as keyof typeof STATUS_COLORS] ?? 'text-slate-500'}`}>
                    {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] ?? job.status}
                  </span>
                  {job.required_family && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet/10 text-violet">
                      {job.required_family}
                    </span>
                  )}
                </div>
                {/* Mini Kanban */}
                <div className="flex items-center gap-1">
                  {Object.values(job.stageCounts).map((count, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center bg-bg text-slate-400"
                      title={['Nouveau','Screening','Entretien','Assessment','Offre','Embauché'][i]}
                    >
                      {count}
                    </div>
                  ))}
                  <span className="text-slate-600 text-[10px] ml-1">N·S·I·A·O·E</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {job.ias_impact && (
                  <div className="text-right hidden md:block">
                    <p className="font-mono text-xs font-bold text-violet">+{job.ias_impact} IAS</p>
                    <p className="text-slate-500 text-[10px]">si pourvu</p>
                  </div>
                )}
                <div className="text-right hidden sm:block">
                  <p className="font-mono text-xs font-bold text-sky">{job.total}</p>
                  <p className="text-slate-500 text-[10px]">candidats</p>
                </div>
                <Link
                  href={`/recrutement/pipeline?job=${job.id}`}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-emerald transition-colors"
                  title="Voir pipeline"
                >
                  <KanbanSquare size={14} />
                </Link>
                <Link
                  href={`/recrutement/matching?job=${job.id}`}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-violet transition-colors"
                  title="Matching IA"
                >
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
