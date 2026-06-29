import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { Users, FileText, Calendar, AlertTriangle, Plus, CheckCircle, Clock } from 'lucide-react';
import { SectionHeader, AlertCard } from '@/components/shared';
import { getUserOrg } from '@/lib/supabase/auth';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: 'Congé annuel',
  maladie:      'Maladie',
  maternite:    'Maternité',
  paternite:    'Paternité',
  sans_solde:   'Sans solde',
  autre:        'Autre',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  contrat:      'Contrat',
  avenant:      'Avenant',
  attestation:  'Attestation',
  fiche_poste:  'Fiche de poste',
  evaluation:   'Évaluation',
  autre:        'Autre',
};

export default async function AdminRHPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);

  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Profil en cours de configuration…</p>
      </div>
    );
  }

  const { supabase, organizationId } = ctx;

  const [profilesRes, leavesRes, docsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, email, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabase
      .from('leave_requests')
      .select(`
        id, type, start_date, end_date, days, status, reason, created_at,
        profiles!leave_requests_profile_id_fkey (first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('hr_documents')
      .select(`
        id, type, title, expiry_date, status, created_at,
        profiles!hr_documents_profile_id_fkey (first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const profiles = profilesRes.data ?? [];
  const leaves   = leavesRes.data   ?? [];
  const docs     = docsRes.data     ?? [];

  const pendingLeaves  = leaves.filter(l => l.status === 'pending');
  const approvedLeaves = leaves.filter(l => l.status === 'approved');

  // Documents expirant dans les 30 jours
  const today = new Date();
  const in30  = new Date(today); in30.setDate(today.getDate() + 30);
  const expiringDocs = docs.filter(d => {
    if (!d.expiry_date || d.status !== 'active') return false;
    const exp = new Date(d.expiry_date);
    return exp >= today && exp <= in30;
  });

  const KPIS = [
    { label: 'Effectif total',         value: profiles.length,       icon: Users,       color: '#10B981' },
    { label: 'Congés en attente',      value: pendingLeaves.length,  icon: Clock,       color: '#F59E0B' },
    { label: 'Docs expirés < 30j',     value: expiringDocs.length,   icon: FileText,    color: '#F43F5E' },
    { label: 'Congés approuvés',       value: approvedLeaves.length, icon: CheckCircle, color: '#0EA5E9' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="ADMINISTRATION RH"
        title="Tableau de bord RH"
        subtitle="Gestion des congés, documents et données collaborateurs"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${k.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-white font-bold text-xl font-mono">{k.value}</p>
                <p className="text-slate-500 text-[10px]">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertes documents */}
      {expiringDocs.length > 0 && (
        <div className="space-y-2">
          {expiringDocs.slice(0, 3).map(d => {
            const profile = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
            const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '';
            return (
              <AlertCard
                key={d.id}
                severity="warning"
                title={`Document expirant — ${d.title}`}
                description={`${DOC_TYPE_LABELS[d.type] ?? d.type}${name ? ` · ${name}` : ''} · Expire le ${new Date(d.expiry_date!).toLocaleDateString('fr-FR')}`}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Congés en attente */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="font-display text-white text-sm">Congés à valider</h3>
              {pendingLeaves.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                  {pendingLeaves.length}
                </span>
              )}
            </div>
            <Link href="/admin-rh/conges/nouveau" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter
            </Link>
          </div>

          {pendingLeaves.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">Aucun congé en attente de validation.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {pendingLeaves.slice(0, 6).map(l => {
                const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
                const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Inconnu';
                return (
                  <div key={l.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {LEAVE_TYPE_LABELS[l.type] ?? l.type}
                        {' · '}
                        {new Date(l.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {' → '}
                        {new Date(l.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {' · '}{l.days}j
                      </p>
                    </div>
                    <Link href={`/admin-rh/conges/${l.id}`}
                      className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors flex-shrink-0">
                      Valider
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Documents récents */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <h3 className="font-display text-white text-sm">Documents RH</h3>
            </div>
            <Link href="/admin-rh/documents/nouveau" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter
            </Link>
          </div>

          {docs.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">Aucun document enregistré.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {docs.slice(0, 6).map(d => {
                const profile = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
                const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : null;
                const isExpiring = d.expiry_date && expiringDocs.some(e => e.id === d.id);
                return (
                  <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{d.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {DOC_TYPE_LABELS[d.type] ?? d.type}
                        {name ? ` · ${name}` : ''}
                        {d.expiry_date && ` · exp. ${new Date(d.expiry_date).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    {isExpiring && (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Annuaire collaborateurs */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <p className="text-white font-semibold text-sm">Effectif ({profiles.length})</p>
          </div>
          <Link href="/admin-rh/collaborateur/nouveau"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter
          </Link>
        </div>

        {profiles.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-500">Aucun collaborateur — invitez votre équipe.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {profiles.map(p => {
              const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email;
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <Link key={p.id} href={`/admin-rh/collaborateur/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400 flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{name}</p>
                    <p className="text-slate-500 text-xs truncate">{p.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex-shrink-0 hidden sm:block">
                    {p.role.replace('org_', '')}
                  </span>
                  <span className="text-slate-600 text-xs flex-shrink-0">
                    {new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
