import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Briefcase, Users, Sparkles, Bot } from 'lucide-react';
import { SectionHeader, ScoreCircle, ScoreBreakdown } from '@/components/shared';
import { compute6DScore } from '@teranga/scoring';
import { getUserOrg } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';
import { InviteButton } from '@/components/recrutement/InviteButton';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobReqs = {
  required_family?:  string;
  min_score_global?: number;
};

type PassportRow = {
  id:                      string;
  profile_id:              string;
  organization_id:         string | null;
  score_hard:              number | null;
  score_soft:              number | null;
  score_exp:               number | null;
  score_life:              number | null;
  score_energy:            number | null;
  score_risk:              number | null;
  score_global:            number | null;
  dominant_family:         string | null;
  dominant_profile:        string | null;
  growth_potential:        number | null;
  energy_pilotes:          number | null;
  energy_initialiseurs:    number | null;
  energy_accomplisseurs:   number | null;
  energy_dynamiseurs:      number | null;
  energy_regulateurs:      number | null;
  profiles:                { first_name: string | null; last_name: string | null; email: string } | null;
};

const ENERGY_LABELS: Record<string, string> = {
  pilotes: 'Pilotes', initialiseurs: 'Initialiseurs',
  accomplisseurs: 'Accomplisseurs', dynamiseurs: 'Dynamiseurs', regulateurs: 'Régulateurs',
};

const ENERGY_COLORS: Record<string, string> = {
  pilotes: '#F97316', initialiseurs: '#8B5CF6',
  accomplisseurs: '#10B981', dynamiseurs: '#0EA5E9', regulateurs: '#F59E0B',
};

// ─── Calcul match ─────────────────────────────────────────────────────────────

function scorePassport(passport: PassportRow, reqs: JobReqs) {
  const family = (reqs.required_family ?? '').toLowerCase();
  const eKey   = `energy_${family}` as keyof PassportRow;
  const energyFit = (passport[eKey] as number | null) ?? passport.score_energy ?? 50;

  return compute6DScore({
    hardSkills: passport.score_hard   ?? 0,
    softSkills: passport.score_soft   ?? 0,
    experience: passport.score_exp    ?? 0,
    lifeScore:  passport.score_life   ?? 0,
    energyFit,
    stressRisk: passport.score_risk   ?? 50,
  });
}

function buildStrengths(breakdown: Record<string, number>, composite: number): string[] {
  const s: string[] = [];
  if ((breakdown.H ?? 0) >= 75) s.push('Compétences techniques solides');
  if ((breakdown.S ?? 0) >= 75) s.push('Leadership interpersonnel fort');
  if ((breakdown.X ?? 0) >= 75) s.push('Expérience senior confirmée');
  if ((breakdown.E ?? 0) >= 75) s.push('Niveau d\'énergie élevé');
  if ((breakdown.R ?? 100) <= 25) s.push('Résistance au stress exceptionnelle');
  if (composite >= 80) s.push('Profil exceptionnel — fort alignement');
  else if (composite >= 70) s.push('Bon alignement global');
  return s.slice(0, 3).length > 0 ? s.slice(0, 3) : ['Profil à évaluer en entretien'];
}

function buildRisks(breakdown: Record<string, number>): string[] {
  const r: string[] = [];
  if ((breakdown.H ?? 100) < 55) r.push('Compétences techniques à renforcer');
  if ((breakdown.S ?? 100) < 55) r.push('Compétences soft à développer');
  if ((breakdown.X ?? 100) < 50) r.push('Expérience insuffisante pour ce niveau');
  if ((breakdown.R ?? 0) > 65)  r.push('Risque de stress élevé');
  return r.slice(0, 2).length > 0 ? r.slice(0, 2) : ['Aucun risque majeur identifié'];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MatchingPage({
  searchParams,
}: { searchParams: Promise<{ job?: string }> }) {
  const [user, params] = await Promise.all([requireAuth(), searchParams]);
  const ctx = await getUserOrg(user.id);
  if (!ctx) redirect('/setup-org');

  const { supabase, organizationId } = ctx;
  const admin = createAdminClient();

  // Postes ouverts de l'org
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, requirements, ias_impact')
    .in('status', ['open', 'active'])
    .order('created_at', { ascending: false });

  const openJobs      = jobs ?? [];
  const selectedJobId = params.job ?? openJobs[0]?.id;
  const selectedJob   = openJobs.find(j => j.id === selectedJobId);

  // Aucun poste ouvert
  if (!selectedJob || !selectedJobId) {
    return (
      <div className="animate-fade-in space-y-6">
        <SectionHeader
          tag="RECRUTEMENT · MATCHING IA PROACTIF"
          tagColor="text-violet"
          title="Matching IA"
          subtitle="L'IA scanne tous les talents de la plateforme pour vous. Créez d'abord un poste actif."
        />
        <div className="card text-center py-12 space-y-3">
          <div className="w-12 h-12 bg-violet/10 rounded-xl flex items-center justify-center mx-auto">
            <Bot size={22} className="text-violet" />
          </div>
          <p className="text-slate-400 text-sm">Aucun poste actif.</p>
          <p className="text-slate-600 text-xs">
            Créez un poste et l'IA identifiera automatiquement les meilleurs profils de la plateforme.
          </p>
          <Link href="/recrutement/jobs" className="inline-block text-sm text-violet hover:underline">
            Créer un poste →
          </Link>
        </div>
      </div>
    );
  }

  const reqs = (selectedJob.requirements ?? {}) as JobReqs;

  // Scanner TOUS les passports (talents externes + employés internes)
  const { data: rawPassports } = await admin
    .from('talent_passports')
    .select(`
      id, profile_id, organization_id,
      score_global, score_hard, score_soft, score_exp, score_life, score_energy, score_risk,
      dominant_family, dominant_profile, growth_potential,
      energy_pilotes, energy_initialiseurs, energy_accomplisseurs, energy_dynamiseurs, energy_regulateurs,
      profiles(first_name, last_name, email)
    `)
    .not('score_global', 'is', null)
    .gt('score_global', 0)
    .limit(200);

  const allPassports = (rawPassports ?? []) as unknown as PassportRow[];

  // Candidatures existantes pour ce job (pour marquer "déjà dans pipeline")
  const { data: existingApps } = await supabase
    .from('applications')
    .select('passport_id, stage')
    .eq('job_id', selectedJobId);

  const pipelineMap = new Map<string, string>(
    (existingApps ?? []).map(a => [a.passport_id ?? '', a.stage ?? 'new'])
  );

  // Scorer et trier tous les passports
  const candidates = allPassports
    .map(passport => {
      const result    = scorePassport(passport, reqs);
      const isInternal = passport.organization_id === organizationId;
      const inPipeline = pipelineMap.has(passport.id);
      const pipelineStage = pipelineMap.get(passport.id);
      const profile   = passport.profiles;
      const firstName = profile?.first_name ?? '';
      const lastName  = profile?.last_name  ?? '';
      const name = ([firstName, lastName].filter(Boolean).join(' ') || profile?.email?.split('@')[0]) ?? 'Talent';
      const avatar = (firstName[0] ?? lastName[0] ?? 'T').toUpperCase();
      const family = (passport.dominant_family ?? '').toLowerCase();

      return {
        passport,
        result,
        name,
        avatar,
        family,
        isInternal,
        inPipeline,
        pipelineStage,
        strengths: buildStrengths(result.breakdown as unknown as Record<string, number>, result.composite),
        risks:     buildRisks(result.breakdown as unknown as Record<string, number>),
      };
    })
    .sort((a, b) => b.result.composite - a.result.composite)
    .slice(0, 30);

  const topCandidates  = candidates.filter(c => c.result.composite >= 70);
  const goodCandidates = candidates.filter(c => c.result.composite >= 55 && c.result.composite < 70);

  const requiredFamily = (reqs.required_family ?? '').toLowerCase();

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="RECRUTEMENT · MATCHING IA PROACTIF"
        tagColor="text-violet"
        title={`Matching — ${selectedJob.title}`}
        subtitle={`${candidates.length} talents analysés sur la plateforme · Score 6D automatique · Invitation directe sans candidature`}
      />

      {/* Sélecteur de postes */}
      {openJobs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {openJobs.map(j => (
            <Link
              key={j.id}
              href={`/recrutement/matching?job=${j.id}`}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                j.id === selectedJobId
                  ? 'border-violet/40 bg-violet/10 text-violet font-semibold'
                  : 'border-slate-200 text-slate-400 hover:text-slate-800'
              )}
            >
              {j.title}
            </Link>
          ))}
        </div>
      )}

      {/* Info profil recherché */}
      {requiredFamily && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            backgroundColor: `${ENERGY_COLORS[requiredFamily] ?? '#8B5CF6'}08`,
            borderColor:     `${ENERGY_COLORS[requiredFamily] ?? '#8B5CF6'}25`,
          }}
        >
          <Sparkles size={15} style={{ color: ENERGY_COLORS[requiredFamily] ?? '#8B5CF6' }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: ENERGY_COLORS[requiredFamily] ?? '#8B5CF6' }}>
              Profil énergétique recherché : {ENERGY_LABELS[requiredFamily] ?? requiredFamily}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              L'IA classe automatiquement les talents selon leur affinité énergétique et leur score 6D.
            </p>
          </div>
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucun talent avec un Passport actif sur la plateforme.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top matches */}
          {topCandidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-emerald" />
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                  Meilleurs profils ({topCandidates.length})
                </p>
              </div>
              {topCandidates.map((c, rank) => (
                <CandidateCard key={c.passport.id} c={c} rank={rank} jobId={selectedJobId} />
              ))}
            </div>
          )}

          {/* Profils corrects */}
          {goodCandidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase size={13} className="text-slate-500" />
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                  Autres profils à considérer ({goodCandidates.length})
                </p>
              </div>
              {goodCandidates.map((c, rank) => (
                <CandidateCard key={c.passport.id} c={c} rank={topCandidates.length + rank} jobId={selectedJobId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Carte candidat ────────────────────────────────────────────────────────────

function CandidateCard({ c, rank, jobId }: {
  c: {
    passport:     PassportRow;
    result:       ReturnType<typeof compute6DScore>;
    name:         string;
    avatar:       string;
    family:       string;
    isInternal:   boolean;
    inPipeline:   boolean;
    pipelineStage: string | undefined;
    strengths:    string[];
    risks:        string[];
  };
  rank:  number;
  jobId: string;
}) {
  const color = c.result.color === 'emerald' ? '#10B981'
              : c.result.color === 'sky'     ? '#0EA5E9'
              : c.result.color === 'amber'   ? '#F59E0B'
              :                                '#F43F5E';

  const familyColor = ENERGY_COLORS[c.family] ?? '#8B5CF6';

  return (
    <div className="card border-l-4" style={{ borderLeftColor: color }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-6 h-6 rounded-full bg-bg flex items-center justify-center flex-shrink-0 mt-1">
          <span className="font-mono text-[10px] font-bold text-slate-400">#{rank + 1}</span>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
        >
          {c.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-900 font-semibold">{c.name}</p>
            {c.isInternal && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20 font-semibold">
                Interne
              </span>
            )}
            {c.family && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                style={{ backgroundColor: `${familyColor}12`, color: familyColor }}
              >
                {ENERGY_LABELS[c.family] ?? c.family}
              </span>
            )}
            {c.inPipeline && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet/10 text-violet border border-violet/20 font-semibold capitalize">
                Pipeline · {c.pipelineStage ?? 'new'}
              </span>
            )}
          </div>
          {c.passport.dominant_profile && (
            <p className="text-slate-400 text-xs mt-0.5">{c.passport.dominant_profile}</p>
          )}
        </div>
        <ScoreCircle value={c.result.composite} size="md" label="Score 6D" />
      </div>

      {/* Score breakdown */}
      <ScoreBreakdown result={c.result} className="mb-4" />

      {/* Forces & Risques */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="section-tag text-emerald mb-1.5">FORCES</p>
          <ul className="space-y-1">
            {c.strengths.map((s, i) => (
              <li key={i} className="text-slate-600 text-xs flex gap-1.5">
                <span className="text-emerald font-bold">+</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-tag text-rose mb-1.5">RISQUES</p>
          <ul className="space-y-1">
            {c.risks.map((r, i) => (
              <li key={i} className="text-slate-600 text-xs flex gap-1.5">
                <span className="text-rose font-bold">!</span>{r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action */}
      {!c.inPipeline ? (
        <InviteButton passportId={c.passport.id} jobId={jobId} />
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Déjà dans votre pipeline</span>
          <Link
            href="/recrutement/pipeline"
            className="text-violet text-xs hover:underline"
          >
            Voir pipeline →
          </Link>
        </div>
      )}
    </div>
  );
}
