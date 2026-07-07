import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Briefcase, MapPin, Building2, Zap, Star, ClipboardList, ChevronRight, Lock } from 'lucide-react';
import { getUserOrg } from '@/lib/supabase/auth';

const ENERGY_COLORS: Record<string, string> = {
  pilotes: '#F97316', initialiseurs: '#8B5CF6',
  accomplisseurs: '#10B981', dynamiseurs: '#0EA5E9', regulateurs: '#F59E0B',
};
const ENERGY_LABELS: Record<string, string> = {
  pilotes: 'Pilotes', initialiseurs: 'Initialiseurs',
  accomplisseurs: 'Accomplisseurs', dynamiseurs: 'Dynamiseurs', regulateurs: 'Régulateurs',
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

// Score de compatibilité simplifié : distance énergétique + écart global
function computeMatch(passport: Record<string, number>, job: {
  required_family: string;
  min_score_global: number;
  min_score_hard: number;
  min_score_soft: number;
}) {
  const energyMatch   = passport[`energy_${job.required_family}`] ?? 20;
  const globalGap     = Math.max(0, job.min_score_global - (passport.score_global ?? 0));
  const hardGap       = Math.max(0, job.min_score_hard   - (passport.score_hard   ?? 0));
  const softGap       = Math.max(0, job.min_score_soft   - (passport.score_soft   ?? 0));
  const totalPenalty  = globalGap * 0.5 + hardGap * 0.3 + softGap * 0.2;
  return Math.round(Math.max(0, Math.min(100, energyMatch + (30 - totalPenalty))));
}

export default async function SuggestionsPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, profileId } = ctx;

  const [passportRes, jobsRes] = await Promise.all([
    supabase.from('talent_passports').select('*').eq('profile_id', profileId).maybeSingle(),
    supabase.from('job_offers')
      .select('id, title, company_name, location, contract_type, salary_min, salary_max, required_family, min_score_global, min_score_hard, min_score_soft, description, is_premium')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const passport = passportRes.data;
  const jobs     = jobsRes.data ?? [];

  if (!passport) {
    return (
      <div className="text-center py-20 space-y-4">
        <Briefcase className="w-12 h-12 text-slate-700 mx-auto" />
        <h2 className="font-display text-slate-900 text-xl">Complétez votre profil d'abord</h2>
        <p className="text-slate-400 text-sm">Pour voir des opportunités personnalisées, vous devez d'abord générer votre Talent Passport.</p>
        <Link href="/assessment" className="inline-flex items-center gap-2 bg-emerald-500 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors mt-2">
          <ClipboardList className="w-4 h-4" /> Commencer l'évaluation
        </Link>
      </div>
    );
  }

  // Calculer et trier par affinité
  const scored = jobs.map(job => ({
    ...job,
    match: computeMatch(passport as unknown as Record<string, number>, job as { required_family: string; min_score_global: number; min_score_hard: number; min_score_soft: number }),
  })).sort((a, b) => b.match - a.match);

  const dominant = (passport.dominant_family as string | null) ?? '';
  const topJobs  = scored.slice(0, 3);
  const restJobs = scored.slice(3);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">MATCHING TALENT</p>
        <h1 className="font-display text-slate-900 text-2xl">Vos opportunités</h1>
        <p className="text-slate-400 text-sm mt-1">
          {scored.length} offres analysées · basées sur votre profil {passport.dominant_profile ?? ''} et votre énergie{' '}
          <span style={{ color: ENERGY_COLORS[dominant] ?? '#10B981' }}>
            {ENERGY_LABELS[dominant] ?? ''}
          </span>
        </p>
      </div>

      {/* Résumé du profil talent */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${ENERGY_COLORS[dominant] ?? '#10B981'}15` }}>
          <span className="font-mono text-xl font-bold" style={{ color: ENERGY_COLORS[dominant] ?? '#10B981' }}>
            {passport.score_global ?? 0}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 text-sm font-semibold">{passport.dominant_profile ?? 'Profil'}</p>
          <p className="text-slate-400 text-xs">{passport.passport_id ?? 'TP-EN-COURS'}</p>
        </div>
        <div className="hidden sm:flex gap-4 text-center">
          {[
            { label: 'Hard', v: passport.score_hard ?? 0 },
            { label: 'Soft', v: passport.score_soft ?? 0 },
            { label: 'Exp', v: passport.score_exp ?? 0 },
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

      {jobs.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">Aucune offre disponible pour le moment.</p>
          <p className="text-slate-600 text-xs">Les entreprises partenaires publient régulièrement de nouvelles opportunités.</p>
        </div>
      ) : (
        <>
          {/* Top 3 matches */}
          {topJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-400" /> Meilleures correspondances
              </p>
              {topJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}

          {/* Reste des offres */}
          {restJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Autres opportunités</p>
              {restJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Carte offre ─────────────────────────────────────────────────────────────
function JobCard({ job }: {
  job: {
    id: string;
    title: string;
    company_name: string;
    location: string | null;
    contract_type: string | null;
    salary_min: number | null;
    salary_max: number | null;
    required_family: string;
    description: string | null;
    is_premium: boolean | null;
    match: number;
  };
}) {
  const color = matchColor(job.match);
  const fc    = ENERGY_COLORS[job.required_family] ?? '#10B981';

  return (
    <div className="card hover:border-slate-200 transition-all relative overflow-hidden">
      {job.is_premium && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-amber-400 text-[10px] font-semibold">
          <Lock className="w-3 h-3" /> Premium
        </div>
      )}
      <div className="flex items-start gap-4">
        {/* Score match */}
        <div className="flex-shrink-0 text-center">
          <p className="font-mono text-2xl font-bold leading-none" style={{ color }}>{job.match}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">affinité</p>
        </div>

        {/* Détails */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="text-slate-900 text-sm font-semibold">{job.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${fc}15`, color: fc }}>
              {ENERGY_LABELS[job.required_family] ?? job.required_family}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {job.company_name}
            </span>
            {job.location && (
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.location}
              </span>
            )}
            {job.contract_type && (
              <span className="text-slate-600 text-xs flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> {job.contract_type}
              </span>
            )}
          </div>
          {job.description && (
            <p className="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-2">{job.description}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            {job.salary_min ? (
              <span className="text-emerald-400 text-xs font-semibold">
                {job.salary_min.toLocaleString('fr-FR')}
                {job.salary_max ? ` – ${job.salary_max.toLocaleString('fr-FR')}` : '+'} FCFA/mois
              </span>
            ) : <span />}
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
        className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <Zap className="w-3.5 h-3.5" /> Voir mon diagnostic IA <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
