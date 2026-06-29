import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getUserOrg } from '@/lib/supabase/auth';
import MessageThread from '@/components/chat/MessageThread';

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId: contactId } = await params;
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, profileId } = ctx;

  const [contactRes, messagesRes] = await Promise.all([
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('id', contactId)
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase.from('messages')
      .select('id, author_id, content, created_at, read_at')
      .eq('organization_id', organizationId)
      .or(`and(author_id.eq.${profileId},recipient_id.eq.${contactId}),and(author_id.eq.${contactId},recipient_id.eq.${profileId})`)
      .order('created_at', { ascending: true })
      .limit(200),
  ]);

  if (!contactRes.data) notFound();

  const contact  = contactRes.data;
  const messages = messagesRes.data ?? [];
  const name     = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email;

  // Marquer les messages non-lus comme lus
  const unreadIds = messages.filter(m => m.author_id === contactId && !m.read_at).map(m => m.id);
  if (unreadIds.length > 0) {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
  }

  return (
    <div className="animate-fade-in h-[calc(100vh-5rem)] flex flex-col space-y-0">
      {/* Header */}
      <div className="card flex items-center gap-3 mb-4 py-3">
        <Link href="/chat" className="p-1.5 rounded-lg hover:bg-white/[0.04] text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-sm font-bold text-emerald-400">
          {[contact.first_name?.[0], contact.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-white font-medium text-sm">{name}</p>
          <p className="text-slate-500 text-xs">{contact.email}</p>
        </div>
      </div>

      {/* Thread + formulaire */}
      <MessageThread
        myProfileId={profileId}
        contactId={contactId}
        contactName={name}
        initialMessages={messages.map(m => ({
          id:        m.id,
          authorId:  m.author_id ?? '',
          content:   m.content,
          createdAt: m.created_at,
          isRead:    m.read_at != null,
        }))}
      />
    </div>
  );
}
