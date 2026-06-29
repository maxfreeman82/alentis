import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { Heart, MessageCircle, Share2, Pin } from 'lucide-react';
import PostComposer from '@/components/community/PostComposer';

const TAG_COLORS: Record<string, string> = {
  rh: '#10B981', recrutement: '#0EA5E9', leadership: '#8B5CF6',
  formation: '#F97316', bien_etre: '#F59E0B', tech: '#F43F5E',
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)   return `il y a ${mins}m`;
  const hrs  = Math.floor(mins / 60);
  if (hrs < 24)    return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

export default async function FeedPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, profileId } = ctx;

  const [postsRes, profileRes] = await Promise.all([
    supabase
      .from('community_posts')
      .select(`
        id, content, post_type, tags, likes_count, comments_count, is_pinned, created_at,
        author:profiles!author_id(id, first_name, last_name, email, role)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('profiles').select('first_name, last_name').eq('id', profileId).maybeSingle(),
  ]);

  const posts   = postsRes.data ?? [];
  const profile = profileRes.data;
  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PostComposer profileId={profileId} initials={initials} />

      {posts.length === 0 && (
        <div className="text-center py-16 text-slate-600 text-sm">
          Aucune publication pour l&apos;instant. Soyez le premier à partager !
        </div>
      )}

      {posts.map(post => {
        const author = Array.isArray(post.author) ? post.author[0] : post.author;
        const name   = author ? [author.first_name, author.last_name].filter(Boolean).join(' ') || author.email : 'Anonyme';
        const ini    = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const tags   = (post.tags ?? []) as string[];

        return (
          <div key={post.id} className={`card space-y-3 ${post.is_pinned ? 'border-emerald-500/20' : ''}`}>
            {post.is_pinned && (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                <Pin className="w-3 h-3" /> Épinglé
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 text-xs font-bold">
                {ini}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-sm font-semibold">{name}</span>
                  {author?.role && <span className="text-slate-600 text-[10px]">{author.role}</span>}
                  <span className="text-slate-700 text-[10px] ml-auto flex-shrink-0">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-slate-300 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${TAG_COLORS[t] ?? '#64748B'}15`, color: TAG_COLORS[t] ?? '#94A3B8' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04]">
              <button className="flex items-center gap-1.5 text-slate-500 hover:text-rose-400 transition-colors text-xs">
                <Heart className="w-3.5 h-3.5" /> {post.likes_count}
              </button>
              <button className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors text-xs">
                <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}
              </button>
              <button className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-400 transition-colors text-xs ml-auto">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
