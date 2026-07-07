import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Briefcase, KanbanSquare, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { CreateJobButton } from '@/components/recrutement/CreateJobButton';
import { getUserOrg } from '@/lib/supabase/auth';

export default async function RecrutementPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, organizationId } = ctx;
  const year = new Date().getFullYear();

  const [jobsRes, appsRes] = await Promise.all([
    supabase.from('jobs')
      .select('id, title, status, ias_impact')
      .eq('organization_id', organizationId)
      .neq('status', 'closed'),
    supabase.from('applications')
      .select('id, stage')
      .eq('organization_id', organizationId)
      .neq('stage', 'hired')
      .neq('stage', 'rejected'),
  ]);

  const jobs = jobsRes.data ?? [];
  const apps = appsRes.data ?? [];

  const openJobs       = jobs.filter(j => j.status === 'active').length;
  const totalCandidats = apps.length;
  const iasImpact      = jobs
    .filter(j => j.status === 'active')
    .reduce((s, j) => s + (j.ias_impact ?? 0), 0);

  // Nombre de candidats dans chaque étape finale (offer + interview)
  const pipeline = {
    offer:     apps.filter(a => a.stage === 'offer').length,
    interview: apps.filter(a => a.stage === 'interview').length,
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="RECRUTEMENT"
        title="Gestion des recrutements"
        subtitle="Postes ouverts, pipeline candidats et matching IA"
        action={<CreateJobButton />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="font-display text-3xl text-emerald">{openJobs}</p>
          <p className="text-slate-400 text-xs mt-1">Postes actifs</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-sky">{totalCandidats}</p>
          <p className="text-slate-400 text-xs mt-1">Candidats en cours</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-amber">{pipeline.interview}</p>
          <p className="text-slate-400 text-xs mt-1">En entretien</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-violet">
            {iasImpact > 0 ? `+${iasImpact.toFixed(1)}` : '—'}
          </p>
          <p className="text-slate-400 text-xs mt-1">Impact IAS si pourvus</p>
        </div>
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/recrutement/jobs" className="card hover:border-emerald/30 group flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase size={18} className="text-emerald" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 font-medium text-sm">Postes</p>
            <p className="text-slate-400 text-xs">{openJobs} actif{openJobs !== 1 ? 's' : ''} · Créer &amp; gérer</p>
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald transition-colors" />
        </Link>

        <Link href="/recrutement/pipeline" className="card hover:border-sky/30 group flex items-center gap-4">
          <div className="w-10 h-10 bg-sky/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <KanbanSquare size={18} className="text-sky" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 font-medium text-sm">Pipeline</p>
            <p className="text-slate-400 text-xs">{totalCandidats} candidat{totalCandidats !== 1 ? 's' : ''} · Vue Kanban</p>
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:text-sky transition-colors" />
        </Link>

        <Link href="/recrutement/matching" className="card hover:border-violet/30 group flex items-center gap-4">
          <div className="w-10 h-10 bg-violet/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 font-medium text-sm">Matching IA</p>
            <p className="text-slate-400 text-xs">Score 6D · Recommandations</p>
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:text-violet transition-colors" />
        </Link>
      </div>

      {/* Postes actifs — aperçu */}
      {jobs.filter(j => j.status === 'active').length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald" />
              <h2 className="text-slate-900 font-semibold text-sm">Postes actifs</h2>
            </div>
            <Link href="/recrutement/jobs" className="text-slate-500 text-xs hover:text-slate-800 transition-colors">
              Voir tous →
            </Link>
          </div>
          <div className="space-y-2">
            {jobs.filter(j => j.status === 'active').slice(0, 5).map(job => (
              <Link
                key={job.id}
                href={`/recrutement/pipeline?job=${job.id}`}
                className="card hover:border-slate-200 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-8 h-8 bg-bg rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase size={13} className="text-slate-400" />
                </div>
                <p className="flex-1 text-slate-600 text-sm truncate">{job.title}</p>
                {job.ias_impact && (
                  <span className="font-mono text-xs text-violet flex-shrink-0">+{job.ias_impact} IAS</span>
                )}
                <ArrowRight size={12} className="text-slate-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
