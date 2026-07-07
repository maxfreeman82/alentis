import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { SectionHeader, AIInsightCard, ScoreCircle, ScoreBreakdown } from '@/components/shared';
import { GenerateInsightButton } from '@/components/recrutement/GenerateInsightButton';
import { compute6DScore, scoreColor } from '@teranga/scoring';
import type { Score6DResult } from '@teranga/scoring';
import { getUserOrg } from '@/lib/supabase/auth';
import { cn } from '@/lib/utils';

function buildStrengths(r: Score6DResult): string[] {
  const s: string[] = [];
  if (r.breakdown.H >= 75) s.push('Compétences techniques solides');
  if (r.breakdown.S >= 75) s.push('Excellent leadership interpersonnel');
  if (r.breakdown.X >= 75) s.push('Expérience senior confirmée');
  if (r.breakdown.E >= 75) s.push("Haut niveau d'énergie professionnelle");
  if (r.breakdown.R <= 25) s.push('Résistance au stress exceptionnelle');
  if (r.composite >= 80)      s.push('Profil exceptionnel — fort alignement au poste');
  else if (r.composite >= 70) s.push('Bon alignement global avec le profil recherché');
  return s.slice(0, 3).length > 0 ? s.slice(0, 3) : ['Profil à évaluer en entretien'];
}

function buildRisks(r: Score6DResult): string[] {
  const risks: string[] = [];
  if (r.breakdown.H < 60) risks.push('Compétences techniques à renforcer');
  if (r.breakdown.S < 60) risks.push('Compétences soft à développer');
  if (r.breakdown.X < 55) risks.push('Expérience insuffisante pour ce niveau');
  if (r.breakdown.R > 60) risks.push('Risque de stress élevé en environnement exigeant');
  if (r.breakdown.E < 55) risks.push("Niveau d'énergie à surveiller");
  return risks.slice(0, 2).length > 0 ? risks.slice(0, 2) : ['Aucun risque majeur identifié'];
}

export default async function MatchingPage({
  searchParams,
}: { searchParams: Promise<{ job?: string }> }) {
  const [user, params] = await Promise.all([
    requireAuth(),
    searchParams,
  ]);

  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId } = ctx;

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, ias_impact')
    .eq('organization_id', organizationId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false });

  const activeJobs    = jobs ?? [];
  const selectedJobId = params.job ?? activeJobs[0]?.id;
  const selectedJob   = activeJobs.find(j => j.id === selectedJobId);

  const jobSelector = activeJobs.length > 1 ? (
    <div className="flex gap-2 flex-wrap">
      {activeJobs.map(j => (
        <Link key={j.id} href={`/recrutement/matching?job=${j.id}`}
          className={cn('px-3 py-1.5 rounded-lg text-xs border transition-colors',
            j.id === selectedJobId
              ? 'border-violet/40 bg-violet/10 text-violet font-semibold'
              : 'border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-200')}>
          {j.title}
        </Link>
      ))}
    </div>
  ) : null;

  if (!selectedJob || selectedJobId === undefined) {
    return (
      <div className="animate-fade-in space-y-6">
        <SectionHeader tag="RECRUTEMENT · MATCHING IA" tagColor="text-violet"
          title="Matching IA" subtitle="Créez un poste actif pour démarrer le matching 6D." />
        <div className="card text-center py-12">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">Aucun poste actif.</p>
          <Link href="/recrutement/jobs" className="text-sm text-emerald hover:underline">Créer un poste →</Link>
        </div>
      </div>
    );
  }

  const { data: applications } = await supabase
    .from('applications')
    .select('id, passport_id, stage, score_6d, score_breakdown, ai_insight')
    .eq('organization_id', organizationId)
    .eq('job_id', selectedJob.id)
    .neq('stage', 'rejected')
    .order('score_6d', { ascending: false });

  const apps = applications ?? [];

  if (apps.length === 0) {
    return (
      <div className="animate-fade-in space-y-6">
        <SectionHeader tag="RECRUTEMENT · MATCHING IA" tagColor="text-violet"
          title={`Matching — ${selectedJob.title}`}
          subtitle="Aucun candidat dans le pipeline pour ce poste." />
        {jobSelector}
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">
            Ajoutez des candidats depuis le{' '}
            <Link href="/recrutement/pipeline" className="text-sky hover:underline">pipeline</Link>.
          </p>
        </div>
      </div>
    );
  }

  const passportIds = [...new Set(apps.map(a => a.passport_id).filter((id): id is string => id != null))];
  const { data: passports } = passportIds.length > 0 ? await supabase
    .from('talent_passports')
    .select('id, profile_id, score_hard, score_soft, score_exp, score_life, score_energy, score_risk')
    .in('id', passportIds) : { data: [] };

  const passportMap = new Map((passports ?? []).map(p => [p.id, p]));

  const profileIds = [...new Set((passports ?? []).map(p => p.profile_id).filter((id): id is string => id != null))];
  const { data: profiles } = profileIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', profileIds) : { data: [] };

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  const candidates = apps.map(app => {
    const passport = app.passport_id ? passportMap.get(app.passport_id) : undefined;
    const profile  = passport ? profileMap.get(passport.profile_id) : undefined;

    let result: Score6DResult;
    if (app.score_6d != null && app.score_breakdown != null) {
      const bd = app.score_breakdown as { H: number; S: number; X: number; L: number; E: number; R: number };
      result   = { composite: app.score_6d, breakdown: bd, color: scoreColor(app.score_6d) };
    } else {
      result = compute6DScore({
        hardSkills: passport?.score_hard   ?? 0,
        softSkills: passport?.score_soft   ?? 0,
        experience: passport?.score_exp    ?? 0,
        lifeScore:  passport?.score_life   ?? 0,
        energyFit:  passport?.score_energy ?? 0,
        stressRisk: passport?.score_risk   ?? 0,
      });
    }

    const firstName = profile?.first_name ?? '';
    const lastName  = profile?.last_name  ?? '';
    const name   = ([firstName, lastName].filter(Boolean).join(' ') || profile?.email?.split('@')[0]) ?? 'Candidat';
    const avatar = (firstName[0] ?? lastName[0] ?? 'C').toUpperCase();

    return {
      id: app.id, name, avatar, stage: app.stage ?? '', aiInsight: app.ai_insight,
      result, strengths: buildStrengths(result), risks: buildRisks(result),
    };
  }).sort((a, b) => b.result.composite - a.result.composite);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="RECRUTEMENT · MATCHING IA"
        tagColor="text-violet"
        title={`Matching — ${selectedJob.title}`}
        subtitle={`${candidates.length} candidat${candidates.length > 1 ? 's' : ''} · Score 6D · Analyse Teranga Align`}
      />

      {jobSelector}

      <div className="space-y-4">
        {candidates.map((c, rank) => {
          const hex = c.result.color === 'emerald' ? '#10B981'
                    : c.result.color === 'sky'     ? '#0EA5E9'
                    : c.result.color === 'amber'   ? '#F59E0B'
                    :                                '#F43F5E';
          return (
            <div key={c.id} className="card border-l-4" style={{ borderLeftColor: hex }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-7 h-7 rounded-full bg-bg-surface flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="font-mono text-xs font-bold text-slate-400">#{rank + 1}</span>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: `${hex}20`, color: hex, border: `1px solid ${hex}40` }}>
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold">{c.name}</p>
                  <p className="text-slate-400 text-xs capitalize">{selectedJob.title}</p>
                </div>
                <ScoreCircle value={c.result.composite} size="md" label="Score 6D" />
              </div>

              <ScoreBreakdown result={c.result} className="mb-4" />

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="section-tag text-emerald mb-2">FORCES</p>
                  <ul className="space-y-1">
                    {c.strengths.map((s, i) => (
                      <li key={i} className="text-slate-600 text-xs flex gap-1.5">
                        <span className="text-emerald">+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="section-tag text-rose mb-2">RISQUES</p>
                  <ul className="space-y-1">
                    {c.risks.map((r, i) => (
                      <li key={i} className="text-slate-600 text-xs flex gap-1.5">
                        <span className="text-rose">!</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {c.aiInsight ? (
                <AIInsightCard content={c.aiInsight} />
              ) : (
                <GenerateInsightButton applicationId={c.id} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
