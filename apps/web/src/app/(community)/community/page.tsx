import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { getUserOrg } from '@/lib/supabase/auth';
import { Rss, Users, CalendarDays, ShoppingBag, MessageSquare, Briefcase, ArrowRight } from 'lucide-react';

export default async function CommunityHomePage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase } = ctx;

  const [postsCount, eventsCount, mentorsCount, listingsCount, forumCount, jobsCount] = await Promise.all([
    supabase.from('community_posts').select('id', { count: 'exact', head: true }),
    supabase.from('community_events').select('id', { count: 'exact', head: true }).gte('start_at', new Date().toISOString()),
    supabase.from('mentoring_profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('marketplace_listings').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('forum_posts').select('id', { count: 'exact', head: true }),
    supabase.from('job_offers').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const SECTIONS = [
    { href: '/community/feed',        icon: Rss,           label: 'Feed',           color: '#10B981', count: postsCount.count ?? 0,    unit: 'publications' },
    { href: '/community/mentoring',   icon: Users,         label: 'Mentoring',      color: '#8B5CF6', count: mentorsCount.count ?? 0,  unit: 'mentors actifs' },
    { href: '/community/events',      icon: CalendarDays,  label: 'Événements',     color: '#0EA5E9', count: eventsCount.count ?? 0,   unit: 'à venir' },
    { href: '/community/marketplace', icon: ShoppingBag,   label: 'Marketplace',    color: '#F97316', count: listingsCount.count ?? 0, unit: 'services' },
    { href: '/community/forum',       icon: MessageSquare, label: 'Forum',          color: '#F59E0B', count: forumCount.count ?? 0,    unit: 'discussions' },
    { href: '/community/jobs',        icon: Briefcase,     label: 'Emplois',        color: '#F43F5E', count: jobsCount.count ?? 0,     unit: 'offres actives' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3 py-6">
        <h1 className="font-display text-slate-900 text-3xl">Communauté Teranga Align</h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
          Réseau panafricain des professionnels RH. Partagez, apprenez, collaborez et trouvez des opportunités.
        </p>
      </div>

      {/* 6 sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}
              className="card hover:border-slate-200 transition-all group flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${s.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 text-sm font-semibold">{s.label}</p>
                <p className="font-mono text-xl font-bold mt-0.5" style={{ color: s.color }}>
                  {s.count}
                </p>
                <p className="text-slate-600 text-[10px]">{s.unit}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
