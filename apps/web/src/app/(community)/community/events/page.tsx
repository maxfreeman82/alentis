import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { CalendarDays, MapPin, Video, Users, Clock, Plus } from 'lucide-react';
import EventCreateBtn from '@/components/community/EventCreateBtn';

const TYPE_CONFIG = {
  online:     { label: 'En ligne',  color: '#0EA5E9', icon: Video    },
  'in-person':{ label: 'Présentiel', color: '#10B981', icon: MapPin   },
  hybrid:     { label: 'Hybride',   color: '#8B5CF6', icon: Users    },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function EventsPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, profileId } = ctx;

  const now = new Date().toISOString();

  const [upcomingRes, pastRes, myRegsRes] = await Promise.all([
    supabase
      .from('community_events')
      .select(`
        id, title, description, event_type, location, start_at, end_at,
        max_attendees, attendees_count, tags, is_free, price_fcfa,
        creator:profiles!created_by(first_name, last_name, email)
      `)
      .gte('start_at', now)
      .order('start_at')
      .limit(20),
    supabase
      .from('community_events')
      .select('id, title, event_type, start_at, attendees_count')
      .lt('start_at', now)
      .order('start_at', { ascending: false })
      .limit(5),
    supabase
      .from('community_event_registrations')
      .select('event_id')
      .eq('profile_id', profileId),
  ]);

  const upcoming  = upcomingRes.data ?? [];
  const past      = pastRes.data ?? [];
  const myEventIds = new Set((myRegsRes.data ?? []).map(r => r.event_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-white text-xl">Événements communauté</h1>
          <p className="text-slate-400 text-xs mt-0.5">{upcoming.length} événement{upcoming.length > 1 ? 's' : ''} à venir</p>
        </div>
        <EventCreateBtn profileId={profileId} />
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <CalendarDays className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">Aucun événement à venir. Organisez le premier !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map(ev => {
            const cfg     = TYPE_CONFIG[ev.event_type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.online;
            const TypeIcon = cfg.icon;
            const registered = myEventIds.has(ev.id);
            const full    = ev.max_attendees ? ev.attendees_count >= ev.max_attendees : false;
            const creator = Array.isArray(ev.creator) ? ev.creator[0] : ev.creator;
            const creatorName = creator ? [creator.first_name, creator.last_name].filter(Boolean).join(' ') || creator.email : '—';
            const tags = (ev.tags ?? []) as string[];

            return (
              <div key={ev.id} className="card space-y-3 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 inline-flex items-center gap-1"
                      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                      <TypeIcon className="w-2.5 h-2.5" /> {cfg.label}
                    </span>
                    <h3 className="text-white text-sm font-semibold mt-1">{ev.title}</h3>
                  </div>
                  {ev.is_free ? (
                    <span className="text-emerald-400 text-[10px] font-semibold flex-shrink-0">GRATUIT</span>
                  ) : (
                    <span className="text-amber-400 text-[10px] font-semibold flex-shrink-0">
                      {ev.price_fcfa?.toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>

                {ev.description && <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{ev.description}</p>}

                <div className="flex items-center gap-3 text-[10px] text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(ev.start_at)}</span>
                  {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {ev.attendees_count}{ev.max_attendees ? `/${ev.max_attendees}` : ''} participants
                  </span>
                </div>

                {tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {tags.map(t => <span key={t} className="text-[10px] text-slate-600 bg-white/[0.03] px-1.5 py-0.5 rounded">#{t}</span>)}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className="text-slate-700 text-[10px]">par {creatorName}</span>
                  <button disabled={full || registered}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                      registered ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                      : full      ? 'bg-white/[0.03] text-slate-600 cursor-not-allowed'
                      : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                    }`}>
                    {registered ? '✓ Inscrit' : full ? 'Complet' : "S'inscrire"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest">Événements passés</p>
          {past.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] opacity-50">
              <span className="text-slate-600 text-xs">{formatDate(ev.start_at)}</span>
              <span className="text-slate-400 text-xs flex-1">{ev.title}</span>
              <span className="text-slate-600 text-[10px]">{ev.attendees_count} participants</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
