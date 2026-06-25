import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { Briefcase, Users, KanbanSquare, Sparkles, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { SectionHeader } from '@/components/shared';

// Données mock — remplacées par Supabase
const MOCK_STATS = {
  open_jobs:          7,
  total_candidates:  43,
  avg_time_to_hire:  28,
  ias_impact:        '+3.4',
};

const MOCK_JOBS = [
  { id: '1', title: 'Lead Product Manager',  status: 'active', candidates: 12, stage_counts: { new: 4, screening: 3, interview: 2, assessment: 2, offer: 1, hired: 0 }, ias_impact: 2.1 },
  { id: '2', title: 'Data Engineer Senior',   status: 'active', candidates: 8,  stage_counts: { new: 3, screening: 2, interview: 2, assessment: 1, offer: 0, hired: 0 }, ias_impact: 1.8 },
  { id: '3', title: 'Directeur Commercial CI',status: 'active', candidates: 6,  stage_counts: { new: 2, screening: 2, interview: 1, assessment: 1, offer: 0, hired: 0 }, ias_impact: 2.8 },
  { id: '4', title: 'UX Designer',            status: 'active', candidates: 11, stage_counts: { new: 5, screening: 3, interview: 2, assessment: 1, offer: 0, hired: 0 }, ias_impact: 0.9 },
  { id: '5', title: 'DevOps Engineer',        status: 'draft',  candidates: 0,  stage_counts: { new: 0, screening: 0, interview: 0, assessment: 0, offer: 0, hired: 0 }, ias_impact: 1.2 },
];

const STATUS_COLORS = { active: 'text-emerald', draft: 'text-slate-500', closed: 'text-rose' };
const STATUS_LABELS = { active: 'Actif', draft: 'Brouillon', closed: 'Fermé' };

export default async function RecrutementPage() {
  await withAuth({ ensureSignedIn: true });

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="RECRUTEMENT"
        title="Gestion des recrutements"
        subtitle="Postes ouverts, pipeline candidats et matching IA"
        action={
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Briefcase size={14} />
            Nouveau poste
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="font-display text-3xl text-emerald">{MOCK_STATS.open_jobs}</p>
          <p className="text-slate-400 text-xs mt-1">Postes ouverts</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-sky">{MOCK_STATS.total_candidates}</p>
          <p className="text-slate-400 text-xs mt-1">Candidats actifs</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-amber">{MOCK_STATS.avg_time_to_hire}j</p>
          <p className="text-slate-400 text-xs mt-1">Délai moyen recrutement</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-violet">{MOCK_STATS.ias_impact} pts</p>
          <p className="text-slate-400 text-xs mt-1">Impact IAS si pourvus</p>
        </div>
      </div>

      {/* Raccourcis modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/recrutement/pipeline" className="card hover:border-emerald/30 group flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald/10 rounded-xl flex items-center justify-center">
            <KanbanSquare size={18} className="text-emerald" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">Pipeline</p>
            <p className="text-slate-400 text-xs">Vue Kanban globale</p>
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald transition-colors" />
        </Link>

        <Link href="/recrutement/matching" className="card hover:border-violet/30 group flex items-center gap-4">
          <div className="w-10 h-10 bg-violet/10 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">Matching IA</p>
            <p className="text-slate-400 text-xs">Score 6D candidats</p>
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:text-violet transition-colors" />
        </Link>

        <Link href="/recrutement/candidates" className="card hover:border-sky/30 group flex items-center gap-4">
          <div className="w-10 h-10 bg-sky/10 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-sky" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">Candidats</p>
            <p className="text-slate-400 text-xs">Base de talents</p>
          </div>
          <ArrowRight size={14} className="text-slate-600 group-hover:text-sky transition-colors" />
        </Link>
      </div>

      {/* Liste des postes */}
      <div>
        <h2 className="text-white font-semibold text-sm mb-3">Postes ouverts</h2>
        <div className="space-y-2">
          {MOCK_JOBS.map((job) => (
            <Link
              key={job.id}
              href={`/recrutement/pipeline?job=${job.id}`}
              className="card hover:border-white/10 group flex items-center gap-4 cursor-pointer"
            >
              <div className="w-9 h-9 bg-bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Briefcase size={15} className="text-slate-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium text-sm truncate">{job.title}</p>
                  <span className={`text-[10px] font-semibold ${STATUS_COLORS[job.status as keyof typeof STATUS_COLORS]}`}>
                    {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS]}
                  </span>
                </div>
                {/* Mini pipeline */}
                <div className="flex items-center gap-1 mt-1.5">
                  {Object.entries(job.stage_counts).map(([stage, count]) => (
                    <div key={stage} className="flex items-center gap-0.5">
                      <div
                        className="w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center bg-bg text-slate-400"
                        title={stage}
                      >
                        {count}
                      </div>
                    </div>
                  ))}
                  <span className="text-slate-600 text-[10px] ml-1">N·S·I·A·O·E</span>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="font-mono text-xs font-bold text-sky">{job.candidates}</p>
                  <p className="text-slate-500 text-[10px]">candidats</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="font-mono text-xs font-bold text-violet">+{job.ias_impact} IAS</p>
                  <p className="text-slate-500 text-[10px]">si pourvu</p>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
