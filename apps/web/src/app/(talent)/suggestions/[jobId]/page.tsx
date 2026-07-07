import { requireAuth } from '@/lib/supabase/user';
import { getTalentProfile } from '@/lib/supabase/auth';
import { computeDiagnostic } from '@/lib/matching/diagnostic';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, BookOpen, Zap, TrendingUp } from 'lucide-react';
import { ScoreCircle, ScoreBreakdown } from '@/components/shared';
import { scoreColor } from '@teranga/scoring';

const VERDICT_CONFIG = {
  apply_now: {
    icon: CheckCircle2,
    color: '#10B981',
    label: 'Postulez maintenant',
    description: 'Votre profil est aligné avec ce poste.',
    cta: 'Postuler maintenant',
    ctaStyle: 'bg-emerald-500 hover:bg-emerald-600 text-slate-900',
  },
  train_first: {
    icon: BookOpen,
    color: '#F59E0B',
    label: 'Formation recommandée',
    description: 'Quelques formations cibleront vos gaps avant de candidater.',
    cta: 'Voir les formations',
    ctaStyle: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30',
  },
  improve_profile: {
    icon: TrendingUp,
    color: '#F43F5E',
    label: 'Renforcez votre profil',
    description: 'Des gaps importants méritent d\'être comblés pour maximiser vos chances.',
    cta: 'Améliorer mon profil',
    ctaStyle: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30',
  },
};

export default async function JobDiagnosticPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [user, { jobId }] = await Promise.all([requireAuth(), params]);

  const ctx = await getTalentProfile(user.id);
  if (!ctx) { redirect('/onboarding'); return null; }

  const admin = createAdminClient();

  const [passportRes, jobRes] = await Promise.all([
    admin.from('talent_passports')
      .select('score_hard, score_soft, score_exp, score_life, score_energy, score_risk, dominant_profile, energy_level')
      .eq('profile_id', ctx.profileId)
      .maybeSingle(),
    admin.from('job_offers')
      .select('id, title, company_name, description, location, contract_type, salary_min, salary_max, min_score_global, min_score_hard, min_score_soft, is_premium')
      .eq('id', jobId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  if (!passportRes.data) {
    return (
      <div className="text-center py-20 space-y-4">
        <Zap className="w-12 h-12 text-slate-700 mx-auto" />
        <h2 className="font-display text-slate-900 text-xl">Passport requis</h2>
        <p className="text-slate-400 text-sm">Complétez votre évaluation pour accéder au diagnostic.</p>
        <Link href="/assessment" className="inline-flex items-center gap-2 bg-emerald-500 text-slate-900 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors mt-2">
          Commencer l'évaluation
        </Link>
      </div>
    );
  }

  if (!jobRes.data) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-400">Offre introuvable ou expirée.</p>
        <Link href="/suggestions" className="text-emerald-400 hover:underline text-sm">← Retour aux opportunités</Link>
      </div>
    );
  }

  const job     = jobRes.data;
  const passport = passportRes.data;

  // Appel Claude côté serveur — résultat mis en cache implicitement par Next.js fetch dedup
  const diag = await computeDiagnostic({ passport, job });

  const verdict  = VERDICT_CONFIG[diag.verdict];
  const VerdictIcon = verdict.icon;
  const hexColor = scoreColor(diag.score6D.composite) === 'emerald' ? '#10B981'
                 : scoreColor(diag.score6D.composite) === 'sky'     ? '#0EA5E9'
                 : scoreColor(diag.score6D.composite) === 'amber'   ? '#F59E0B'
                 :                                                     '#F43F5E';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Navigation retour */}
      <Link href="/suggestions" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-600 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux opportunités
      </Link>

      {/* En-tête poste */}
      <div className="card border-l-4" style={{ borderLeftColor: hexColor }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1">DIAGNOSTIC PRÉ-CANDIDATURE</p>
            <h1 className="font-display text-slate-900 text-xl">{job.title}</h1>
            <p className="text-slate-400 text-sm">{job.company_name}{job.location ? ` · ${job.location}` : ''}</p>
            {job.salary_min && (
              <p className="text-emerald-400 text-xs font-semibold mt-1">
                {job.salary_min.toLocaleString('fr-FR')}{job.salary_max ? ` – ${job.salary_max.toLocaleString('fr-FR')}` : '+'} FCFA/mois
              </p>
            )}
          </div>
          <ScoreCircle value={diag.score6D.composite} size="lg" label="Score 6D" />
        </div>
      </div>

      {/* Recommandation IA */}
      <div className="card" style={{ borderColor: `${verdict.color}30`, background: `${verdict.color}08` }}>
        <div className="flex items-start gap-3">
          <VerdictIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: verdict.color }} />
          <div>
            <p className="font-semibold text-slate-900 text-sm">{verdict.label}</p>
            <p className="text-slate-400 text-xs mt-1">{verdict.description}</p>
            <p className="mt-2 text-sm font-medium" style={{ color: verdict.color }}>{diag.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Score 6D détaillé */}
      <div className="card space-y-4">
        <h2 className="font-display text-slate-900 text-sm">Analyse 6D vs exigences du poste</h2>
        <ScoreBreakdown result={diag.score6D} />
      </div>

      {/* Forces */}
      {diag.strengths.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Vos atouts pour ce poste
          </h2>
          <ul className="space-y-2">
            {diag.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-emerald-400 font-bold mt-0.5">+</span>
                <span className="text-slate-600">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {diag.gaps.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Gaps identifiés
          </h2>
          <div className="space-y-3">
            {diag.gaps.map((g, i) => (
              <div key={i} className="bg-bg rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-900 text-xs font-semibold">{g.label}</span>
                  <span className="font-mono text-xs text-amber-400">−{g.gap} pts</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                  <span>Vous : <span className="text-slate-600 font-mono">{g.talentScore}</span></span>
                  <span>·</span>
                  <span>Requis : <span className="text-slate-600 font-mono">{g.requiredScore}</span></span>
                </div>
                {/* Barre comparative */}
                <div className="space-y-1">
                  <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-slate-600 transition-all" style={{ width: `${g.talentScore}%` }} />
                  </div>
                  <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500/40 transition-all" style={{ width: `${g.requiredScore}%` }} />
                  </div>
                </div>
                {g.trainingHint && (
                  <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {g.trainingHint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formations recommandées */}
      {diag.trainingRecommendations.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" /> Formations prioritaires
          </h2>
          <ul className="space-y-2">
            {diag.trainingRecommendations.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-sky-400 font-bold mt-0.5">→</span>
                <span className="text-slate-600">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA triple */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <Link
          href={`/candidats/${job.id}`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors bg-emerald-500 hover:bg-emerald-600 text-slate-900"
        >
          <CheckCircle2 className="w-4 h-4" />
          Postuler maintenant
        </Link>
        <Link
          href="/formation"
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25"
        >
          <BookOpen className="w-4 h-4" />
          Voir les formations
        </Link>
        <Link
          href="/passport"
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors bg-slate-50 hover:bg-slate-50 text-slate-600 border border-slate-200"
        >
          <TrendingUp className="w-4 h-4" />
          Mon Passport
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="text-slate-600 text-xs text-center pb-4">
        Analyse générée par Teranga Align IA · Score 6D basé sur votre Talent Passport · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
