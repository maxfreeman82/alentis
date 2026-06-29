import { withAuth } from '@workos-inc/authkit-nextjs';
import { getUserOrg } from '@/lib/supabase/auth';
import { ShoppingBag, Clock, Tag, Eye, Plus } from 'lucide-react';
import MarketplaceCreateBtn from '@/components/community/MarketplaceCreateBtn';

const CAT_CONFIG: Record<string, { color: string; icon: string }> = {
  'Recrutement':       { color: '#0EA5E9', icon: '🎯' },
  'Formation':         { color: '#F97316', icon: '📚' },
  'Conseil RH':        { color: '#10B981', icon: '🧭' },
  'Audit social':      { color: '#8B5CF6', icon: '📋' },
  'Paie & Admin':      { color: '#F59E0B', icon: '💰' },
  'Tech RH':           { color: '#F43F5E', icon: '⚡' },
  'Coaching Leadership':{ color: '#06B6D4', icon: '🏆' },
  'autre':             { color: '#64748B', icon: '💼' },
};

const PRICE_LABELS: Record<string, string> = { fixed: 'Fixe', hourly: '/heure', negotiable: 'Négociable' };

const CATEGORIES = Object.keys(CAT_CONFIG).filter(k => k !== 'autre');

export default async function MarketplacePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, profileId } = ctx;

  const [listingsRes, myListingRes] = await Promise.all([
    supabase
      .from('marketplace_listings')
      .select(`
        id, title, description, category, price_fcfa, price_type,
        delivery_days, skills, views_count, created_at,
        author:profiles!author_id(id, first_name, last_name, email, role)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('marketplace_listings').select('id').eq('author_id', profileId).eq('is_active', true),
  ]);

  const listings   = listingsRes.data ?? [];
  const myListings = myListingRes.data ?? [];

  const byCategory: Record<string, typeof listings> = {};
  for (const l of listings) {
    const cat = l.category ?? 'autre';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat]!.push(l);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-white text-xl">Marketplace RH</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {listings.length} service{listings.length > 1 ? 's' : ''} · consultants & experts africains
          </p>
        </div>
        <MarketplaceCreateBtn profileId={profileId} />
      </div>

      {/* Mes services */}
      {myListings.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-2 text-amber-400 text-xs">
          Vous avez {myListings.length} service{myListings.length > 1 ? 's' : ''} actif{myListings.length > 1 ? 's' : ''} publié{myListings.length > 1 ? 's' : ''}.
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-sm">Aucun service disponible. Soyez le premier à proposer le vôtre !</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byCategory).map(([cat, items]) => {
            const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG['autre']!;
            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="font-display text-white text-sm">{cat}</span>
                  <span className="text-slate-600 text-xs">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(l => {
                    const author  = Array.isArray(l.author) ? l.author[0] : l.author;
                    const name    = author ? [author.first_name, author.last_name].filter(Boolean).join(' ') || author.email : 'Consultant';
                    const ini     = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    const skills  = (l.skills ?? []) as string[];
                    const isOwn   = author?.id === profileId;

                    return (
                      <div key={l.id} className={`card hover:border-white/10 transition-all space-y-3 ${isOwn ? 'border-amber-500/20' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                            {ini}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold leading-snug">{l.title}</p>
                            <p className="text-slate-500 text-[10px]">{name}</p>
                          </div>
                        </div>

                        {l.description && (
                          <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">{l.description}</p>
                        )}

                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 3).map(s => (
                              <span key={s} className="text-[9px] px-1.5 py-0.5 bg-white/[0.04] text-slate-500 rounded">{s}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                          <div className="space-y-0.5">
                            {l.price_fcfa ? (
                              <p className="text-emerald-400 text-xs font-semibold">
                                {l.price_fcfa.toLocaleString('fr-FR')} FCFA
                                <span className="text-slate-600 font-normal ml-1">{PRICE_LABELS[l.price_type]}</span>
                              </p>
                            ) : (
                              <p className="text-slate-500 text-xs">Prix {PRICE_LABELS[l.price_type]}</p>
                            )}
                            {l.delivery_days && (
                              <p className="text-slate-600 text-[10px] flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {l.delivery_days}j délai
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-slate-700 text-[10px] flex items-center gap-1">
                              <Eye className="w-2.5 h-2.5" /> {l.views_count}
                            </span>
                            <button className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                              Contacter
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
