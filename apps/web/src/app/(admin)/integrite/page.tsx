import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { SectionHeader } from '@/components/shared';
import { FlagReviewButton } from '@/components/admin/FlagReviewButton';
import { AlertTriangle, CheckCircle2, Clock, Eye, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ASSESSMENT_LABELS: Record<string, string> = {
  energy_skills: 'Energy Skills',
  vision_pulse:  'Vision Pulse',
  boussole:      'Boussole Vision',
};

function CoherenceBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-400 text-xs">—</span>;
  const color =
    score >= 75 ? 'text-emerald bg-emerald/10' :
    score >= 55 ? 'text-amber bg-amber/10'     :
                  'text-rose bg-rose/10';
  return (
    <span className={cn('font-mono text-xs px-2 py-0.5 rounded-full font-semibold', color)}>
      {score}%
    </span>
  );
}

export default async function IntegritePage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'super_admin') redirect('/dashboard');

  // Sessions signalées (is_flagged) ou cohérence basse (< 60)
  const { data: flagged } = await admin
    .from('assessment_sessions')
    .select(`
      id, assessment_type, cycle_key, status,
      coherence_score, behavior_flags, is_flagged, is_reviewed, reviewed_at,
      started_at, completed_at, expires_at,
      profiles(first_name, last_name, email),
      organizations(name)
    `)
    .or('is_flagged.eq.true,coherence_score.lt.60')
    .order('completed_at', { ascending: false })
    .limit(100);

  const sessions = (flagged ?? []) as unknown as Array<{
    id:              string;
    assessment_type: string;
    cycle_key:       string;
    status:          string;
    coherence_score: number | null;
    behavior_flags:  string[];
    is_flagged:      boolean;
    is_reviewed:     boolean;
    reviewed_at:     string | null;
    started_at:      string;
    completed_at:    string | null;
    expires_at:      string;
    profiles:        { first_name: string | null; last_name: string | null; email: string } | null;
    organizations:   { name: string } | null;
  }>;

  const pending  = sessions.filter(s => !s.is_reviewed);
  const reviewed = sessions.filter(s => s.is_reviewed);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="SUPER ADMIN · INTÉGRITÉ"
        tagColor="text-violet"
        title="Revue des évaluations suspectes"
        subtitle="Sessions signalées automatiquement. Revue humaine uniquement — aucun résultat n'est bloqué automatiquement."
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="font-display text-3xl text-rose">{pending.length}</p>
          <p className="text-slate-400 text-xs mt-1">En attente de revue</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-emerald">{reviewed.length}</p>
          <p className="text-slate-400 text-xs mt-1">Révisées</p>
        </div>
        <div className="card text-center">
          <p className="font-display text-3xl text-slate-900">{sessions.length}</p>
          <p className="text-slate-400 text-xs mt-1">Total signalées</p>
        </div>
      </div>

      {/* Lien vers la validation statistique */}
      <Link
        href="/admin/integrite/validation"
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet/5 border border-violet/15 hover:bg-violet/10 transition-colors"
      >
        <FlaskConical size={15} className="text-violet flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-violet">Validation statistique du groupe pilote</p>
          <p className="text-xs text-slate-400 mt-0.5">Corrélations de Pearson · Calibration des seuils · Export CSV</p>
        </div>
        <span className="text-violet text-xs">→</span>
      </Link>

      {/* Rappel éthique */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber/5 border border-amber/20">
        <AlertTriangle size={14} className="text-amber flex-shrink-0 mt-0.5" />
        <p className="text-slate-600 text-xs leading-relaxed">
          <strong className="text-amber">Important :</strong> Ces signalements sont des indices pour un humain, pas des décisions automatiques.
          Un candidat peut avoir hésité sincèrement entre deux tendances proches. La revue humaine est obligatoire avant toute action.
        </p>
      </div>

      {/* Sessions en attente */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-rose" />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
              À réviser ({pending.length})
            </p>
          </div>
          {pending.map(s => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {/* Sessions révisées */}
      {reviewed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald" />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
              Révisées ({reviewed.length})
            </p>
          </div>
          {reviewed.map(s => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-emerald mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucune session suspecte détectée.</p>
        </div>
      )}
    </div>
  );
}

// ─── Carte de session ──────────────────────────────────────────────────────────

function SessionCard({ session: s }: {
  session: {
    id:              string;
    assessment_type: string;
    cycle_key:       string;
    status:          string;
    coherence_score: number | null;
    behavior_flags:  string[];
    is_flagged:      boolean;
    is_reviewed:     boolean;
    reviewed_at:     string | null;
    completed_at:    string | null;
    expires_at:      string;
    profiles:        { first_name: string | null; last_name: string | null; email: string } | null;
    organizations:   { name: string } | null;
  };
}) {
  const profile = s.profiles;
  const name    = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
                  || profile?.email?.split('@')[0]
                  || 'Inconnu';
  const flags = Array.isArray(s.behavior_flags) ? s.behavior_flags : [];
  const isExpired = s.status === 'expired' || (!s.completed_at && new Date(s.expires_at) < new Date());

  return (
    <div className={cn('card border-l-4', s.is_reviewed ? 'border-l-emerald/40' : 'border-l-rose')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Identité + type */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-900 font-semibold text-sm">{name}</p>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-slate-500 text-xs">{profile?.email}</span>
            {s.organizations?.name && (
              <>
                <span className="text-[10px] text-slate-400">·</span>
                <span className="text-slate-400 text-xs">{s.organizations.name}</span>
              </>
            )}
          </div>

          {/* Type + cycle + statut */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-violet/10 text-violet text-[10px] font-semibold">
              {ASSESSMENT_LABELS[s.assessment_type] ?? s.assessment_type}
            </span>
            <span className="text-slate-400 text-[10px]">Cycle {s.cycle_key}</span>
            {isExpired && !s.completed_at && (
              <span className="flex items-center gap-1 text-[10px] text-amber font-medium">
                <Clock size={9} /> Expirée sans complétion
              </span>
            )}
            {s.completed_at && (
              <span className="text-slate-400 text-[10px]">
                Soumis le {new Date(s.completed_at).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>

          {/* Flags comportementaux */}
          {flags.length > 0 && (
            <div className="space-y-1">
              {flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle size={10} className="text-rose flex-shrink-0 mt-0.5" />
                  <p className="text-slate-600 text-xs">{flag}</p>
                </div>
              ))}
            </div>
          )}

          {/* Date de revue */}
          {s.is_reviewed && s.reviewed_at && (
            <div className="flex items-center gap-1 text-emerald text-[10px]">
              <Eye size={9} />
              Révisé le {new Date(s.reviewed_at).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>

        {/* Score cohérence + bouton revue */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 mb-1">Cohérence</p>
            <CoherenceBadge score={s.coherence_score} />
          </div>
          <FlagReviewButton sessionId={s.id} isReviewed={s.is_reviewed} />
        </div>
      </div>
    </div>
  );
}
