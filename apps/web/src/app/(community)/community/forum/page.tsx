import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { getUserOrg } from '@/lib/supabase/auth';
import { MessageSquare, Pin, CheckCircle, Eye, Clock } from 'lucide-react';
import ForumPostBtn from '@/components/community/ForumPostBtn';

function timeAgo(d: string | null) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const hrs  = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

export default async function ForumPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, profileId } = ctx;

  const [catsRes, recentRes] = await Promise.all([
    supabase
      .from('forum_categories')
      .select('id, name, description, icon, color, slug, posts_count, sort_order')
      .order('sort_order'),
    supabase
      .from('forum_posts')
      .select(`
        id, title, is_pinned, is_solved, replies_count, views_count, last_reply_at, tags, created_at,
        category:forum_categories!category_id(id, name, color, slug),
        author:profiles!author_id(first_name, last_name, email)
      `)
      .order('last_reply_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const categories = catsRes.data ?? [];
  const posts      = recentRes.data ?? [];
  const totalPosts = categories.reduce((s, c) => s + (c.posts_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-white text-xl">Forum RH Afrique</h1>
          <p className="text-slate-400 text-xs mt-0.5">{totalPosts} discussions · 6 catégories</p>
        </div>
        <ForumPostBtn categories={categories} profileId={profileId} />
      </div>

      {/* Catégories */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map(cat => (
          <Link key={cat.id} href={`/community/forum/${cat.slug}`}
            className="card hover:border-white/10 transition-all flex items-start gap-3 group">
            <span className="text-2xl flex-shrink-0">{cat.icon}</span>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold group-hover:text-emerald-400 transition-colors">{cat.name}</p>
              <p className="text-slate-600 text-[10px] mt-0.5 leading-snug line-clamp-2">{cat.description}</p>
              <p className="text-slate-700 text-[10px] mt-1">{cat.posts_count} sujet{cat.posts_count !== 1 ? 's' : ''}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Discussions récentes */}
      <div className="space-y-2">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Discussions récentes</p>

        {posts.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">
            Aucune discussion pour l&apos;instant. Lancez la première !
          </div>
        ) : (
          <div className="space-y-1">
            {posts.map(post => {
              const cat    = Array.isArray(post.category) ? post.category[0] : post.category;
              const author = Array.isArray(post.author)   ? post.author[0]   : post.author;
              const name   = author ? [author.first_name, author.last_name].filter(Boolean).join(' ') || author.email : 'Anonyme';
              const tags   = (post.tags ?? []) as string[];

              return (
                <Link key={post.id} href={`/community/forum/post/${post.id}`}
                  className="flex items-start gap-3 py-3 px-4 rounded-xl hover:bg-white/[0.02] transition-colors group border border-transparent hover:border-white/[0.04]">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 w-8 pt-0.5">
                    {post.is_pinned  && <Pin         className="w-3 h-3 text-emerald-400" />}
                    {post.is_solved  && <CheckCircle className="w-3 h-3 text-sky-400"     />}
                    {!post.is_pinned && !post.is_solved && (
                      <MessageSquare className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm group-hover:text-white transition-colors leading-snug">{post.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {cat && (
                        <span className="text-[10px] font-medium" style={{ color: cat.color ?? '#10B981' }}>{cat.name}</span>
                      )}
                      <span className="text-slate-700 text-[10px]">par {name}</span>
                      {tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] text-slate-600">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <p className="text-slate-500 text-xs flex items-center gap-1 justify-end">
                      <MessageSquare className="w-3 h-3" />{post.replies_count}
                    </p>
                    <p className="text-slate-600 text-[10px] flex items-center gap-1 justify-end">
                      <Eye className="w-2.5 h-2.5" />{post.views_count}
                    </p>
                    <p className="text-slate-700 text-[10px] flex items-center gap-1 justify-end">
                      <Clock className="w-2.5 h-2.5" />{timeAgo(post.last_reply_at ?? post.created_at)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
