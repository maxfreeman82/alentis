import { requireAuth } from '@/lib/supabase/user';
import { getUserOrg } from '@/lib/supabase/auth';
import { Briefcase, MapPin, Building2, Clock, Star } from 'lucide-react';
import Link from 'next/link';

const FAMILY_COLORS: Record<string, string> = {
  pilotes: '#F97316', initialiseurs: '#8B5CF6', accomplisseurs: '#10B981',
  dynamiseurs: '#0EA5E9', regulateurs: '#F59E0B',
};
const FAMILY_LABELS: Record<string, string> = {
  pilotes: 'Pilotes', initialiseurs: 'Initialiseurs', accomplisseurs: 'Accomplisseurs',
  dynamiseurs: 'Dynamiseurs', regulateurs: 'Régulateurs',
};

export default async function CommunityJobsPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, profileId } = ctx;

  const [jobsRes, passportRes] = await Promise.all([
    supabase
      .from('job_offers')
      .select('id, title, company_name, location, contract_type, salary_min, salary_max, required_family, min_score_global, description, is_premium, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase.from('talent_passports')
      .select('score_global, dominant_family, energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs')
      .eq('profile_id', profileId)
      .maybeSingle(),
  ]);

  const jobs     = jobsRes.data ?? [];
  const passport = passportRes.data;

  const byFamily: Record<string, typeof jobs> = {};
  for (const j of jobs) {
    const f = j.required_family ?? 'autre';
    if (!byFamily[f]) byFamily[f] = [];
    byFamily[f]!.push(j);
  }

  function compatScore(job: { required_family: string; min_score_global: number }) {
    if (!passport) return null;
    const fKey = `energy_${job.required_family}` as keyof typeof passport;
    const energyVal = (passport[fKey] as number | null) ?? 20;
    const gap = Math.max(0, job.min_score_global - (passport.score_global ?? 0)) * 0.5;
    return Math.round(Math.max(0, Math.min(100, energyVal + 30 - gap)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-slate-900 text-xl">Offres d&apos;emploi</h1>
          <p className="text-slate-400 text-xs mt-0.5">{jobs.length} offre{jobs.length > 1 ? 's' : ''} · marché africain</p>
        </div>
        {passport && (
          <Link href="/suggestions"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
            <Star className="w-3.5 h-3.5" /> Matching personnalisé
          </Link>
        )}
      </div>

      {!passport && (
        <div className="border border-violet-500/20 bg-violet-500/5 rounded-xl px-4 py-3 text-sm text-violet-400">
          <Link href="/assessment" className="underline underline-offset-2 font-semibold">Générez votre Talent Passport</Link>{' '}
          pour voir votre score de compatibilité avec chaque offre.
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">Aucune offre disponible pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byFamily).map(([family, familyJobs]) => {
            const color = FAMILY_COLORS[family] ?? '#64748B';
            const label = FAMILY_LABELS[family] ?? family;
            return (
              <div key={family} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-display text-slate-900 text-sm" style={{ color }}>{label}</span>
                  <span className="text-slate-600 text-xs">({familyJobs.length})</span>
                </div>
                <div className="space-y-2">
                  {familyJobs.map(job => {
                    const compat = compatScore({ required_family: job.required_family, min_score_global: job.min_score_global });
                    const compatColor = !compat ? '#64748B' : compat >= 70 ? '#10B981' : compat >= 50 ? '#F59E0B' : '#F43F5E';

                    return (
                      <div key={job.id} className="card hover:border-slate-200 transition-all">
                        <div className="flex items-start gap-4">
                          {compat !== null && (
                            <div className="flex-shrink-0 text-center w-12">
                              <p className="font-mono text-xl font-bold leading-none" style={{ color: compatColor }}>{compat}</p>
                              <p className="text-[9px] text-slate-600 mt-0.5">match</p>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h3 className="text-slate-900 text-sm font-semibold">{job.title}</h3>
                              {job.is_premium && <span className="text-amber-400 text-[10px] font-semibold">★ Premium</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Building2 className="w-3 h-3" />{job.company_name}
                              </span>
                              {job.location && (
                                <span className="text-slate-400 text-xs flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />{job.location}
                                </span>
                              )}
                              {job.contract_type && (
                                <span className="text-slate-600 text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{job.contract_type}
                                </span>
                              )}
                            </div>
                            {job.description && (
                              <p className="text-slate-500 text-xs mt-2 line-clamp-1">{job.description}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right space-y-1">
                            {job.salary_min && (
                              <p className="text-emerald-400 text-xs font-semibold whitespace-nowrap">
                                {job.salary_min.toLocaleString('fr-FR')}+ FCFA
                              </p>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full inline-block"
                              style={{ backgroundColor: `${color}15`, color }}>
                              {label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
