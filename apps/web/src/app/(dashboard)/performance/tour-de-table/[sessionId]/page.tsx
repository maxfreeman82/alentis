import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Play, Lock, Sparkles, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { getUserOrg } from '@/lib/supabase/auth';
import SessionActions from '@/components/tour-de-table/SessionActions';

interface Props { params: Promise<{ sessionId: string }> }

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });

  const ctx = await getUserOrg(user.id);
  if (!ctx) return notFound();
  const { supabase, organizationId } = ctx;

  const { data: session } = await supabase
    .from('tdt_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!session) return notFound();

  // Récupérer les profils participants
  const participantIds = (session.participant_ids as string[]) ?? [];
  const { data: participants } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .in('id', participantIds.length > 0 ? participantIds : ['00000000-0000-0000-0000-000000000000']);

  // Observations soumises
  const { data: observations } = await supabase
    .from('tdt_observations')
    .select('observer_id, observed_id, submitted_at')
    .eq('session_id', sessionId);

  // Agrégats si session clôturée
  const { data: aggregates } = await supabase
    .from('tdt_aggregates')
    .select('*')
    .eq('session_id', sessionId);

  // Calcul de participation
  const submittedObservers = new Set(observations?.map(o => o.observer_id) ?? []);
  const participationRate  = participantIds.length > 0
    ? Math.round((submittedObservers.size / participantIds.length) * 100)
    : 0;

  const threshold = Math.round((session.participation_threshold ?? 0.70) * 100);
  const observerLink = `${process.env.NEXT_PUBLIC_APP_URL}/observer/${sessionId}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/performance/tour-de-table"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs mb-4 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Tour de Table
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-1">SESSION</p>
            <h1 className="font-display text-white text-2xl">
              Q{session.quarter} {session.year}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{participantIds.length} participants · {participationRate}% de participation</p>
          </div>
          <SessionActions session={session} organizationId={organizationId} />
        </div>
      </div>

      {/* Barre de participation */}
      <div className="card space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-medium">Participation</span>
          <span className={`font-semibold font-mono ${
            participationRate >= threshold ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {submittedObservers.size}/{participantIds.length} · {participationRate}%
          </span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${participationRate}%`,
              backgroundColor: participationRate >= threshold ? '#10B981' : '#F59E0B',
            }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>0%</span>
          <span className="text-slate-500">Seuil requis : {threshold}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Lien à partager (si session active) */}
      {session.status === 'active' && (
        <div className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-4 space-y-2">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest">LIEN D&apos;OBSERVATION</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Partagez ce lien avec les participants. Chaque personne connectée verra ses collègues à observer.
          </p>
          <div className="flex items-center gap-2 bg-bg rounded-xl px-3 py-2 border border-white/[0.06]">
            <code className="text-emerald-400 text-xs flex-1 truncate">{observerLink}</code>
            <button className="text-slate-500 hover:text-slate-300 flex-shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Liste participants + statut */}
      <div className="space-y-3">
        <h2 className="font-display text-white text-sm">
          Participants ({participantIds.length})
        </h2>
        <div className="space-y-1.5">
          {participants?.map(p => {
            const hasSubmitted = submittedObservers.has(p.id);
            const observed     = observations?.filter(o => o.observed_id === p.id).length ?? 0;
            const aggregate    = aggregates?.find(a => a.observed_id === p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.04] hover:border-white/[0.06] transition-all">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-violet-400 text-xs font-bold">
                    {(p.first_name ?? '?').slice(0, 1)}{(p.last_name ?? '').slice(0, 1)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-slate-600 text-[10px]">{p.role}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <div>
                    <p className="text-slate-400 text-[10px]">Observé par</p>
                    <p className={`font-mono text-xs font-bold ${
                      observed >= (session.min_observers ?? 3) ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {observed}/{session.min_observers ?? 3}
                    </p>
                  </div>
                  {hasSubmitted
                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                    : <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
                  }
                </div>
                {aggregate && (
                  <div className="ml-2 text-right">
                    <p className="text-slate-500 text-[10px]">Score</p>
                    <p className={`font-mono text-sm font-bold ${
                      (aggregate.score_global_observed ?? 0) >= 80 ? 'text-emerald-400'
                      : (aggregate.score_global_observed ?? 0) >= 60 ? 'text-amber-400'
                      : 'text-rose-400'
                    }`}>
                      {Math.round(aggregate.score_global_observed ?? 0)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agrégats si disponibles */}
      {aggregates && aggregates.length > 0 && session.status !== 'active' && (
        <div className="space-y-3">
          <h2 className="font-display text-white text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> Résultats observés
          </h2>
          <div className="card overflow-hidden p-0">
            <div className="grid grid-cols-8 text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-4 py-2.5 bg-bg border-b border-white/[0.04]">
              <span className="col-span-2">Personne</span>
              <span className="text-center">Fiab.</span>
              <span className="text-center">Collab.</span>
              <span className="text-center">Comm.</span>
              <span className="text-center">Init.</span>
              <span className="text-center">Adapt.</span>
              <span className="text-center font-bold">Global</span>
            </div>
            {aggregates.map(agg => {
              const p    = participants?.find(p => p.id === agg.observed_id);
              const name = p ? `${p.first_name ?? ''} ${(p.last_name ?? '').slice(0, 1)}.` : '—';
              return (
                <div key={agg.id} className="grid grid-cols-8 px-4 py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]">
                  <span className="col-span-2 text-slate-300 text-xs">{name}</span>
                  {[agg.score_fiabilite, agg.score_collaboration, agg.score_communication, agg.score_initiative, agg.score_adaptabilite].map((s, i) => (
                    <span key={i} className="font-mono text-xs text-center text-slate-400">{Math.round(s ?? 0)}</span>
                  ))}
                  <span className={`font-mono text-xs text-center font-bold ${
                    (agg.score_global_observed ?? 0) >= 80 ? 'text-emerald-400'
                    : (agg.score_global_observed ?? 0) >= 60 ? 'text-amber-400'
                    : 'text-rose-400'
                  }`}>
                    {Math.round(agg.score_global_observed ?? 0)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {aggregates.some(a => a.has_outlier_flag) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400 text-[10px]">Outliers détectés — certains scores ont été exclus</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
