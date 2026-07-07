import { requireAuth } from '@/lib/supabase/user';
import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import ObserverFlow from '@/components/tour-de-table/ObserverFlow';

interface Props { params: Promise<{ sessionId: string }> }

export default async function ObserverPage({ params }: Props) {
  const { sessionId } = await params;
  const user           = await requireAuth();
  const supabase       = createServerClient();

  // Profil de l'observateur
  const { data: myProfile } = await supabase
    .from('profiles').select('id, organization_id, first_name').eq('user_id', user.id).maybeSingle();
  if (!myProfile) redirect('/');

  // Session
  const { data: session } = await supabase
    .from('tdt_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || session.status !== 'active') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center space-y-2 p-8">
          <p className="text-slate-900 font-display text-xl">Session non disponible</p>
          <p className="text-slate-500 text-sm">
            {session?.status === 'closed' ? 'Cette session est clôturée.' :
             session?.status === 'consolidated' ? 'Cette session est déjà consolidée.' :
             'Cette session n\'est pas encore active.'}
          </p>
        </div>
      </div>
    );
  }

  // Vérifier que l'observateur est bien dans la liste des participants
  const participantIds = (session.participant_ids as string[]) ?? [];
  if (!participantIds.includes(myProfile.id)) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center space-y-2 p-8">
          <p className="text-slate-900 font-display text-xl">Accès refusé</p>
          <p className="text-slate-500 text-sm">Vous ne faites pas partie des participants de cette session.</p>
        </div>
      </div>
    );
  }

  // Récupérer les collègues à observer (tout le monde sauf soi-même)
  const toObserveIds = participantIds.filter(id => id !== myProfile.id);
  const { data: toObserve } = await supabase
    .from('profiles').select('id, first_name, last_name')
    .in('id', toObserveIds.length > 0 ? toObserveIds : ['00000000-0000-0000-0000-000000000000']);

  // Observations déjà soumises
  const { data: done } = await supabase
    .from('tdt_observations')
    .select('observed_id')
    .eq('session_id', sessionId)
    .eq('observer_id', myProfile.id);

  const doneIds = new Set(done?.map(o => o.observed_id) ?? []);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-slate-200 bg-bg-card px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <span className="text-slate-900 text-[10px] font-bold">TdT</span>
            </div>
            <span className="text-slate-900 text-sm font-semibold">Tour de Table · Q{session.quarter} {session.year}</span>
          </div>
          <span className="text-slate-500 text-xs">{doneIds.size}/{toObserveIds.length} complétés</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <ObserverFlow
          sessionId={sessionId}
          profiles={(toObserve ?? []).map(p => ({ id: p.id, first_name: p.first_name, last_name: p.last_name }))}
          doneIds={Array.from(doneIds)}
        />
      </main>
    </div>
  );
}
