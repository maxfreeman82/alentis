import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';

export default async function ChatPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, profileId } = ctx;

  const [teamRes, messagesRes] = await Promise.all([
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('organization_id', organizationId)
      .neq('id', profileId)
      .order('first_name'),
    // Dernier message par interlocuteur
    supabase.from('messages')
      .select('id, author_id, recipient_id, content, created_at, read_at')
      .eq('organization_id', organizationId)
      .or(`author_id.eq.${profileId},recipient_id.eq.${profileId}`)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const team     = teamRes.data     ?? [];
  const messages = messagesRes.data ?? [];

  // Calculer le dernier message + nb non-lus par contact
  const contactStats = new Map<string, { lastMsg: string; unread: number; lastAt: string }>();
  for (const m of messages) {
    const contactId = m.author_id === profileId ? m.recipient_id : m.author_id;
    if (!contactId) continue;
    if (!contactStats.has(contactId)) {
      contactStats.set(contactId, { lastMsg: m.content, unread: 0, lastAt: m.created_at });
    }
    if (m.author_id !== profileId && !m.read_at) {
      const stat = contactStats.get(contactId)!;
      stat.unread += 1;
    }
  }

  // Trier : conversations actives d'abord, puis le reste
  const sorted = [...team].sort((a, b) => {
    const aStats = contactStats.get(a.id);
    const bStats = contactStats.get(b.id);
    if (aStats && !bStats) return -1;
    if (!aStats && bStats) return 1;
    if (aStats && bStats) return bStats.lastAt.localeCompare(aStats.lastAt);
    return 0;
  });

  return (
    <div className="animate-fade-in space-y-4">
      <SectionHeader
        tag="MESSAGERIE"
        title="Messages"
        subtitle="Communication interne sécurisée"
      />

      {team.length === 0 ? (
        <div className="card py-16 text-center">
          <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Aucun collaborateur disponible.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-200 p-0 overflow-hidden">
          {sorted.map(contact => {
            const name    = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email;
            const initials = [contact.first_name?.[0], contact.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
            const stats   = contactStats.get(contact.id);

            return (
              <Link key={contact.id} href={`/chat/${contact.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-sm font-bold text-emerald-400 flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${stats?.unread ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>{name}</p>
                    {stats?.lastAt && (
                      <span className="text-slate-600 text-[10px] flex-shrink-0">
                        {new Date(stats.lastAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {stats ? (
                    <p className="text-slate-500 text-xs truncate">{stats.lastMsg}</p>
                  ) : (
                    <p className="text-slate-600 text-xs italic">Aucun message — cliquez pour démarrer</p>
                  )}
                </div>
                {(stats?.unread ?? 0) > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-900 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {stats!.unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
