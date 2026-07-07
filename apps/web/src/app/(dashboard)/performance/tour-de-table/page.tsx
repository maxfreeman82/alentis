import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { Users, Plus, Clock, CheckCircle, BarChart3, AlertTriangle, ChevronRight } from 'lucide-react';
import { getUserOrg } from '@/lib/supabase/auth';
import CreateSessionModal from '@/components/tour-de-table/CreateSessionModal';

const STATUS_META = {
  draft:        { label: 'Brouillon',   color: 'text-slate-500', bg: 'bg-slate-500/10'  },
  active:       { label: 'En cours',    color: 'text-amber-400', bg: 'bg-amber-400/10'   },
  closed:       { label: 'Clôturée',    color: 'text-sky-400',   bg: 'bg-sky-400/10'     },
  consolidated: { label: 'Consolidée',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

export default async function TourDeTablePage() {
  const user = await requireAuth();

  const ctx = await getUserOrg(user.id);
  if (!ctx) return <p className="text-slate-500 p-8">Organisation introuvable.</p>;
  const { supabase, organizationId } = ctx;

  const { data: sessions } = await supabase
    .from('tdt_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('year', { ascending: false })
    .order('quarter', { ascending: false });

  const { data: participants } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('organization_id', organizationId);

  const activeSession = sessions?.find(s => s.status === 'active');
  const totalParticipants = participants?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-widest mb-1">MODULE 17</p>
          <h1 className="font-display text-slate-900 text-2xl">Tour de Table</h1>
          <p className="text-slate-400 text-sm mt-1">
            Observations comportementales trimestrielles entre pairs. Anonymes, sécurisées, consolidées dans les Passports.
          </p>
        </div>
        {!activeSession && (
          <CreateSessionModal participants={participants ?? []} organizationId={organizationId} />
        )}
      </div>

      {/* Session active */}
      {activeSession && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-900 font-semibold text-sm">
                  Session Q{activeSession.quarter} {activeSession.year} — En cours
                </p>
                <p className="text-slate-500 text-xs">
                  Lancée le {activeSession.launched_at
                    ? new Date(activeSession.launched_at).toLocaleDateString('fr-SN')
                    : '—'}
                </p>
              </div>
            </div>
            <Link href={`/performance/tour-de-table/${activeSession.id}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
              Gérer <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Participants', value: totalParticipants, icon: Users, color: '#10B981' },
          { label: 'Sessions totales', value: sessions?.length ?? 0, icon: BarChart3, color: '#8B5CF6' },
          { label: 'Consolidées', value: sessions?.filter(s => s.status === 'consolidated').length ?? 0, icon: CheckCircle, color: '#06B6D4' },
          { label: 'Alertes', value: 0, icon: AlertTriangle, color: '#F59E0B' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card text-center space-y-2">
              <Icon className="w-5 h-5 mx-auto" style={{ color: stat.color }} />
              <p className="font-display text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Explication des 7 gardes */}
      <div className="card space-y-4">
        <h2 className="font-display text-slate-900 text-sm">Les 7 gardes de sécurité</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { n: 1, label: 'Minimum 3 observateurs',       desc: 'Les résultats ne s\'affichent que si ≥3 pairs ont répondu.' },
            { n: 2, label: 'Anonymat total',               desc: 'Le mapping observateur→observé n\'est jamais exposé.' },
            { n: 3, label: 'Détection des outliers',       desc: 'Notes trop extrêmes (z-score > 2) exclues du calcul.' },
            { n: 4, label: 'Auto-observation impossible',  desc: 'Contrainte SQL et API — personne ne peut s\'observer.' },
            { n: 5, label: 'Détection halo/anti-halo',    desc: 'Observation suspecte si toutes les notes sont max ou min.' },
            { n: 6, label: 'Cohérence temporelle',        desc: 'Chute > 25 pts vs trimestre précédent → alerte RH.' },
            { n: 7, label: 'Seuil de participation 70%',  desc: 'Session non publiée si < 70% des participants ont répondu.' },
          ].map(g => (
            <div key={g.n} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all">
              <span className="w-6 h-6 rounded-full bg-violet-500/15 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {g.n}
              </span>
              <div>
                <p className="text-slate-900 text-xs font-semibold">{g.label}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historique */}
      {sessions && sessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-slate-900 text-sm">Historique des sessions</h2>
          <div className="space-y-2">
            {sessions.map(s => {
              const meta = STATUS_META[s.status as keyof typeof STATUS_META];
              return (
                <Link key={s.id} href={`/performance/tour-de-table/${s.id}`}
                  className="card flex items-center justify-between hover:border-slate-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-violet-400 text-xs font-bold font-mono">Q{s.quarter}</span>
                    </div>
                    <div>
                      <p className="text-slate-900 text-sm font-medium">Session Q{s.quarter} {s.year}</p>
                      <p className="text-slate-500 text-xs">
                        {Array.isArray(s.participant_ids) ? s.participant_ids.length : 0} participants
                        {s.launched_at ? ` · Lancée le ${new Date(s.launched_at).toLocaleDateString('fr-SN')}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Vide */}
      {(!sessions || sessions.length === 0) && (
        <div className="text-center py-16 space-y-4">
          <Users className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">Aucune session créée.</p>
          <p className="text-slate-600 text-xs max-w-sm mx-auto">
            Lancez votre premier Tour de Table trimestriel pour collecter des observations comportementales anonymes.
          </p>
        </div>
      )}
    </div>
  );
}
