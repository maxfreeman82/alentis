import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Briefcase, Building2, MapPin, Star, ChevronRight, Zap, ClipboardList } from 'lucide-react';

const ENERGY_COLORS: Record<string, string> = {
  pilotes:       '#F97316',
  initialiseurs: '#8B5CF6',
  accomplisseurs:'#10B981',
  dynamiseurs:   '#0EA5E9',
  regulateurs:   '#F59E0B',
};

const ENERGY_LABELS: Record<string, string> = {
  pilotes:       'Pilotes',
  initialiseurs: 'Initialiseurs',
  accomplisseurs:'Accomplisseurs',
  dynamiseurs:   'Dynamiseurs',
  regulateurs:   'Régulateurs',
};

function matchColor(v: number) {
  if (v >= 80) return '#10B981';
  if (v >= 70) return '#0EA5E9';
  if (v >= 60) return '#F59E0B';
  return '#F43F5E';
}

function matchLabel(v: number) {
  if (v >= 80) return 'Excellente affinité';
  if (v >= 70) return 'Bonne affinité';
  if (v >= 60) return 'Affinité modérée';
  return 'Faible affinité';
}

type PassportData = {
  score_global: number | null;
  score_hard: number | null;
  score_soft: number | null;
  score_energy: number | null;
  dominant_family: string | null;
  dominant_profile: string | null;
  energy_pilotes: number | null;
  energy_initialiseurs: number | null;
  energy_accomplisseurs: number | null;
  energy_dynamiseurs: number | null;
  energy_regulateurs: number | null;
};

type JobReqs = {
  required_family?: string;
  min_score_global?: number;
  min_score_hard?: number;
  min_score_soft?: number;
};

function computeMatch(passport: PassportData, requirements: JobReqs): number {
  const family = (requirements.required_family ?? '').toLowerCase();
  const energyKey = `energy_${family}` as keyof PassportData;
  const energyMatch = (passport[energyKey] as number | null) ?? 30;

  const globalGap = Math.max(0, (requirements.min_score_global ?? 60) - (passport.score_global ?? 0));
  const hardGap   = Math.max(0, (requirements.min_score_hard   ?? 50) - (passport.score_hard   ?? 0));
  const softGap   = Math.max(0, (requirements.min_score_soft   ?? 50) - (passport.score_soft   ?? 0));

  const penalty = globalGap * 0.5 + hardGap * 0.3 + softGap * 0.2;
  return Math.round(Math.max(0, Math.min(100, energyMatch + 30 - penalty)));
}

type JobRow = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  requirements: Record<string, unknown> | null;
  ias_impact: number | null;
  organizations: { name: string } | null;
};

export default async function SuggestionsPage() {
  const user = await requireAuth();
  const ctx  = await getTalentProfile(user.id);

  if (!ctx)                 redirect('/onboarding');
  if (!ctx.onboardingDone)  redirect('/onboarding');

  const admin = createAdminClient();

  const [passportRes, jobsRes] = await Promise.all([
    admin
      .from('talent_passports')
      .select('id, score_global, score_hard, score_soft, score_energy, dominant_family, dominant_profile, energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs')
      .eq('profile_id', ctx.profileId)
      .maybeSingle(),
    admin
      .from('jobs')
      .select('id, organization_id, title, description, requirements, ias_impact, organizations(name)')
      .in('status', ['open', 'active'])
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const passport = passportRes.data as PassportData | null;
  const rawJobs  = (jobsRes.data ?? []) as unknown as JobRow[];

  if (!passport) {
    return (
      <div className="text-center py-20 space-y-4">
        <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="font-display text-slate-900 text-xl">Complétez votre profil d'abord</h2>
        <p className="text-slate-400 text-sm">
          Pour voir des opportunités personnalisées, générez d'abord votre Talent Passport.
        </p>
        <Link
          href="/assessment"
          className="inline-flex items-center gap-2 bg-emerald text-bg px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald/90 transition-colors mt-2"
        >
          <ClipboardList className="w-4 h-4" /> Commencer l'évaluation
        </Link>
      </div>
    );
  }

  const scored = rawJobs.map(job => {
    const reqs = (job.requirements ?? {}) as JobReqs;
    return { ...job, match: computeMatch(passport, reqs) };
  }).sort((a, b) => b.match - a.match);

  const dominant = (passport.dominant_family ?? '').toLowerCase();
  const topJobs  = scored.slice(0, 3);
  const restJobs = scored.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-tag text-emerald mb-2">MATCHING TALENT</p>
        <h1 className="font-display text-slate-900 text-2xl">Vos opportunités</h1>
        <p className="text-slate-400 text-sm mt-1">
          {scored.length} offres analysées · basées sur votre profil{' '}
          <span className="text-slate-600 font-medium">{passport.dominant_profile ?? ''}</span>
          {dominant && (
            <>
              {' '}et votre énergie{' '}
              <span style={{ color: ENERGY_COLORS[dominant] ?? '#10B981' }}>
                {ENERGY_LABELS[dominant] ?? ''}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Résumé du profil talent */}
      <div className="card flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${ENERGY_COLORS[dominant] ?? '#10B981'}15` }}
        >
          <span
            className="font-mono text-xl font-bold"
            style={{ color: ENERGY_COLORS[dominant] ?? '#10B981' }}
          >
            {passport.score_global ?? 0}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 text-sm font-semibold">{passport.dominant_profile ?? 'Profil'}</p>
          <p className="text-slate-400 text-xs capitalize">{ENERGY_LABELS[dominant] ?? 'Énergie non calculée'}</p>
        </div>
        <div className="hidden sm:flex gap-4 text-center">
          {[
            { label: 'Hard', v: passport.score_hard   ?? 0 },
            { label: 'Soft', v: passport.score_soft   ?? 0 },
            { label: 'Énergie', v: passport.score_energy ?? 0 },
          ].map(x => (
            <div key={x.label}>
              <p className="font-mono text-base font-bold text-slate-900">{x.v}</p>
              <p className="text-slate-600 text-[10px]">{x.label}</p>
            </div>
          ))}
        </div>
        <Link href="/passport" className="text-slate-500 hover:text-slate-600 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {scored.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">Aucune offre disponible pour le moment.</p>
          <p className="text-slate-600 text-xs">
            Les organisations publient régulièrement de nouvelles opportunités.
          </p>
        </div>
      ) : (
        <>
          {topJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3 text-amber" /> Meilleures correspondances
              </p>
              {topJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
          {restJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                Autres opportunités
              </p>
              {restJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JobCard({ job }: {
  job: JobRow & { match: number };
}) {
  const reqs    = (job.requirements ?? {}) as JobReqs;
  const family  = (reqs.required_family ?? '').toLowerCase();
  const color   = matchColor(job.match);
  const fc      = ENERGY_COLORS[family] ?? '#10B981';
  const orgName = job.organizations?.name ?? 'Organisation';

  return (
    <div className="card hover:border-slate-200 transition-all relative overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Score match */}
        <div className="flex-shrink-0 text-center min-w-[48px]">
          <p className="font-mono text-2xl font-bold leading-none" style={{ color }}>{job.match}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">affinité</p>
        </div>

        {/* Détails */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-slate-900 text-sm font-semibold">{job.title}</h3>
            {family && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${fc}15`, color: fc }}
              >
                {ENERGY_LABELS[family] ?? family}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {orgName}
            </span>
            {job.ias_impact != null && job.ias_impact > 0 && (
              <span className="text-emerald text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> +{job.ias_impact} pts IAS
              </span>
            )}
          </div>

          {job.description && (
            <p className="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-2">
              {job.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-semibold" style={{ color }}>{matchLabel(job.match)}</span>
          </div>
        </div>
      </div>

      {/* Barre de match */}
      <div className="mt-4 h-1 bg-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${job.match}%`, backgroundColor: color }} />
      </div>

      <Link
        href={`/suggestions/${job.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald hover:text-emerald/80 transition-colors"
      >
        <Zap className="w-3.5 h-3.5" /> Voir mon diagnostic IA <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
