import { requireAuth } from '@/lib/supabase/user';
import { LayoutGrid, Pin, Users, Link2, Plus } from 'lucide-react';
import { SectionHeader } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';
import AnnouncementForm from '@/components/workspace/AnnouncementForm';
import LinkForm from '@/components/workspace/LinkForm';

const PRIORITY_CFG = {
  urgent: { label: '🚨 Urgent',  color: '#F43F5E', bg: 'bg-rose-500/10' },
  high:   { label: '⚠️ Haute',   color: '#F97316', bg: 'bg-orange-500/10' },
  normal: { label: '💬 Normal',  color: '#0EA5E9', bg: 'bg-sky-500/10' },
  low:    { label: '📌 Faible',  color: '#64748B', bg: 'bg-slate-500/10' },
} as const;

const LINK_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  outil:   { label: 'Outil',     color: '#8B5CF6' },
  doc:     { label: 'Document',  color: '#F59E0B' },
  rh:      { label: 'RH',        color: '#10B981' },
  finance: { label: 'Finance',   color: '#F97316' },
  autre:   { label: 'Autre',     color: '#64748B' },
};

export default async function WorkspacePage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Profil en cours de configuration…</p></div>;

  const { supabase, organizationId, orgName, role } = ctx;
  const isAdmin = ['org_admin', 'org_hr', 'org_manager'].includes(role);

  const [announcesRes, linksRes, teamRes] = await Promise.all([
    supabase.from('workspace_announcements')
      .select('id, title, content, priority, pinned, created_at, author_id')
      .eq('organization_id', organizationId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('workspace_links')
      .select('id, title, url, category, icon')
      .eq('organization_id', organizationId)
      .order('category'),
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('organization_id', organizationId)
      .order('first_name'),
  ]);

  const announces = announcesRes.data ?? [];
  const links     = linksRes.data     ?? [];
  const team      = teamRes.data      ?? [];

  const pinned  = announces.filter(a => a.pinned);
  const regular = announces.filter(a => !a.pinned);

  const linksByCategory = links.reduce<Record<string, typeof links>>((acc, l) => {
    const cat = l.category ?? 'autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(l);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="ESPACE DE TRAVAIL"
        title={orgName}
        subtitle="Annonces, ressources et annuaire de l'équipe"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Annonces — colonne principale */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-sky-400" /> Annonces
            </h2>
            {isAdmin && <AnnouncementForm />}
          </div>

          {announces.length === 0 ? (
            <div className="card py-10 text-center">
              <LayoutGrid className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Aucune annonce pour le moment.</p>
              {isAdmin && <p className="text-slate-600 text-xs mt-1">Créez la première annonce avec le bouton ci-dessus.</p>}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Pin className="w-3 h-3" /> Épinglées
                  </p>
                  {pinned.map(a => {
                    const pCfg = PRIORITY_CFG[a.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.normal;
                    return (
                      <div key={a.id} className="card border border-slate-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-slate-900 font-medium text-sm">{a.title}</h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pCfg.bg}`} style={{ color: pCfg.color }}>
                            {pCfg.label}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm whitespace-pre-wrap">{a.content}</p>
                        <p className="text-slate-600 text-xs mt-2">{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2">
                {regular.map(a => {
                  const pCfg = PRIORITY_CFG[a.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.normal;
                  return (
                    <div key={a.id} className="card">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-slate-900 font-medium text-sm">{a.title}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pCfg.bg}`} style={{ color: pCfg.color }}>
                          {pCfg.label}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm whitespace-pre-wrap">{a.content}</p>
                      <p className="text-slate-600 text-xs mt-2">{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Colonne latérale : liens + équipe */}
        <div className="space-y-4">
          {/* Liens utiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-400" /> Liens utiles
              </h2>
              {isAdmin && <LinkForm />}
            </div>
            {links.length === 0 ? (
              <div className="card py-6 text-center">
                <p className="text-slate-600 text-xs">Aucun lien enregistré.</p>
              </div>
            ) : (
              Object.entries(linksByCategory).map(([cat, catLinks]) => {
                const cfg = LINK_CATEGORY_LABELS[cat] ?? { label: cat, color: '#64748B' };
                return (
                  <div key={cat} className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</p>
                    {catLinks.map(l => (
                      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-slate-200 hover:border-slate-200 transition-colors text-sm text-sky-400 hover:text-sky-300">
                        <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{l.title}</span>
                      </a>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {/* Annuaire équipe */}
          <div className="space-y-2">
            <h2 className="font-display text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Équipe ({team.length})
            </h2>
            <div className="card space-y-2 max-h-72 overflow-y-auto">
              {team.map(p => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email;
                const initials = [p.first_name?.[0], p.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-900 text-xs font-medium truncate">{name}</p>
                      <p className="text-slate-600 text-[10px]">{p.role?.replace('org_', '')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
