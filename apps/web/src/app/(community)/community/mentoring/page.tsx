import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { Star, Clock, Languages, Plus, CheckCircle } from 'lucide-react';
import MentoringRegisterBtn from '@/components/community/MentoringRegisterBtn';

const EXPERTISE_COLORS: Record<string, string> = {
  'Recrutement': '#0EA5E9', 'Leadership': '#8B5CF6', 'RH Stratégique': '#10B981',
  'Formation': '#F97316',   'Droit RH': '#F59E0B',   'Tech RH': '#F43F5E',
  'Finance RH': '#06B6D4',  'DEI': '#EC4899',
};

export default async function MentoringPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, profileId } = ctx;

  const [mentorsRes, myProfileRes, mySessionsRes] = await Promise.all([
    supabase
      .from('mentoring_profiles')
      .select(`
        id, expertise_areas, bio, available_hours, languages, sessions_count, rating,
        profile:profiles!profile_id(id, first_name, last_name, email, role)
      `)
      .eq('is_active', true)
      .in('mentor_type', ['mentor', 'both'])
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(20),
    supabase.from('mentoring_profiles').select('id, mentor_type').eq('profile_id', profileId).maybeSingle(),
    supabase
      .from('mentoring_sessions')
      .select('id, status, topic, scheduled_at, mentor_id, mentee_id')
      .or(`mentor_id.eq.${profileId},mentee_id.eq.${profileId}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const mentors    = mentorsRes.data ?? [];
  const myProfile  = myProfileRes.data;
  const mySessions = mySessionsRes.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panneau gauche */}
      <div className="space-y-4">
        {/* Mon statut */}
        <div className="card space-y-3">
          <h2 className="font-display text-white text-sm">Mon statut mentor</h2>
          {myProfile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold capitalize">{myProfile.mentor_type}</span>
              </div>
              <p className="text-slate-500 text-xs">Profil actif · visible par la communauté</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-400 text-xs">Vous n&apos;êtes pas encore inscrit comme mentor.</p>
              <MentoringRegisterBtn profileId={profileId} />
            </div>
          )}
        </div>

        {/* Mes sessions */}
        {mySessions.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-display text-white text-sm">Mes sessions</h2>
            {mySessions.map(s => {
              const statusColor = s.status === 'confirmed' ? '#10B981' : s.status === 'pending' ? '#F59E0B' : '#64748B';
              return (
                <div key={s.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: statusColor }} />
                  <div>
                    <p className="text-slate-300 text-xs">{s.topic}</p>
                    <p className="text-slate-600 text-[10px] capitalize">{s.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Liste mentors */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-white text-xl">Mentors disponibles</h1>
            <p className="text-slate-400 text-xs mt-0.5">{mentors.length} expert{mentors.length > 1 ? 's' : ''} prêt{mentors.length > 1 ? 's' : ''} à vous accompagner</p>
          </div>
        </div>

        {mentors.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">
            Aucun mentor disponible pour le moment. Rejoignez le réseau !
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mentors.map(m => {
              const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
              const name    = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email : 'Mentor';
              const ini     = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const areas   = (m.expertise_areas ?? []) as string[];

              return (
                <div key={m.id} className="card space-y-3 hover:border-white/10 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 text-violet-400 font-bold text-sm">
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{name}</p>
                      {profile?.role && <p className="text-slate-500 text-xs capitalize">{profile.role}</p>}
                      {m.rating && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-amber-400 text-xs font-mono">{Number(m.rating).toFixed(1)}</span>
                          <span className="text-slate-600 text-[10px]">({m.sessions_count} sessions)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {m.bio && <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{m.bio}</p>}

                  {areas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {areas.slice(0, 3).map(a => (
                        <span key={a} className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${EXPERTISE_COLORS[a] ?? '#64748B'}15`, color: EXPERTISE_COLORS[a] ?? '#94A3B8' }}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <div className="flex items-center gap-3 text-[10px] text-slate-600">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.available_hours}h/sem</span>
                      {((m.languages ?? []) as string[]).length > 0 && (
                        <span className="flex items-center gap-1"><Languages className="w-3 h-3" />{((m.languages ?? []) as string[]).join(', ')}</span>
                      )}
                    </div>
                    <button className="text-xs px-3 py-1 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors">
                      Demander
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
