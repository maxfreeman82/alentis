import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { Users, FileText, Calendar, AlertTriangle, Plus, CheckCircle, Clock, Activity, UserPlus, Award, Heart } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-400 text-sm">Profil en cours de configuration…</p>
        <a href="/onboarding" className="text-xs text-emerald hover:underline">
          → Accéder à l&apos;onboarding
        </a>
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

  // Requêtes logs RH — sans joins pour compatibilité types Supabase
  const [appsRes, passportsRes, wellbeingRes] = await Promise.all([
    supabase
      .from('applications')
      .select('id, stage, created_at, job_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('talent_passports')
      .select('id, dominant_profile, score_global, last_assessment, profile_id')
      .eq('organization_id', organizationId)
      .not('last_assessment', 'is', null)
      .order('last_assessment', { ascending: false })
      .limit(5),
    supabase
      .from('wellbeing_surveys')
      .select('id, score_global, burnout_risk, created_at, profile_id')
      .eq('organization_id', organizationId)
      .eq('year', new Date().getFullYear())
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const profiles   = profilesRes.data ?? [];
  const leaves     = leavesRes.data   ?? [];
  const docs       = docsRes.data     ?? [];
  const apps       = appsRes.data     ?? [];
  const passports  = passportsRes.data ?? [];
  const wellbeing  = wellbeingRes.data ?? [];

  // Index profils pour résolution nom dans les logs
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  // Construction du fil d'activité RH
  const STAGE_LABELS: Record<string, string> = {
    new:        'Nouvelle candidature',
    screening:  'En screening',
    interview:  'Entretien planifié',
    assessment: 'Assessment en cours',
    offer:      'Offre envoyée',
    hired:      'Embauché(e)',
  };

  type LogEntry = {
    id:    string;
    icon:  'application' | 'passport' | 'wellbeing' | 'profile';
    title: string;
    desc:  string;
    date:  string;
    color: string;
  };

  const activityLog: LogEntry[] = [
    ...apps.map(a => ({
      id:    `app-${a.id}`,
      icon:  'application' as const,
      title: STAGE_LABELS[a.stage ?? ''] ?? 'Candidature',
      desc:  `Poste : ${a.job_id.slice(0, 8)}…`,
      date:  a.created_at,
      color: '#0EA5E9',
    })),
    ...passports.map(p => {
      const prof = profileMap.get(p.profile_id ?? '');
      const name = prof ? `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() : 'Inconnu';
      return {
        id:    `pass-${p.id}`,
        icon:  'passport' as const,
        title: 'Passport 6D complété',
        desc:  `${name} · ${p.dominant_profile ?? '—'} · Score ${p.score_global ?? '—'}/100`,
        date:  p.last_assessment ?? '',
        color: '#8B5CF6',
      };
    }),
    ...wellbeing.map(w => {
      const prof = profileMap.get(w.profile_id ?? '');
      const name = prof ? `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() : 'Inconnu';
      return {
        id:    `wb-${w.id}`,
        icon:  'wellbeing' as const,
        title: 'Enquête bien-être soumise',
        desc:  `${name} · Bien-être ${w.score_global ?? '—'}/100${(w.burnout_risk ?? 0) >= 60 ? ' ⚠ Burnout risk' : ''}`,
        date:  w.created_at,
        color: '#10B981',
      };
    }),
    ...profiles.slice(0, 3).map(p => ({
      id:    `prof-${p.id}`,
      icon:  'profile' as const,
      title: 'Profil créé',
      desc:  `${p.first_name ?? ''} ${p.last_name ?? ''} · ${p.role.replace('org_', '')}`,
      date:  p.created_at,
      color: '#F59E0B',
    })),
  ]
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

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

      {/* Fil d'activité RH */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h3 className="font-display text-white text-sm">Activité RH récente</h3>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
            {activityLog.length}
          </span>
        </div>

        {activityLog.length === 0 ? (
          <p className="text-slate-500 text-sm py-2">Aucune activité récente.</p>
        ) : (
          <div className="space-y-0 divide-y divide-white/[0.04]">
            {activityLog.map(entry => {
              const Icon = entry.icon === 'application' ? FileText
                         : entry.icon === 'passport'    ? Award
                         : entry.icon === 'wellbeing'   ? Heart
                         : UserPlus;
              return (
                <div key={entry.id} className="flex items-start gap-3 py-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${entry.color}18` }}
                  >
                    <Icon size={13} style={{ color: entry.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{entry.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 truncate">{entry.desc}</p>
                  </div>
                  <span className="text-slate-600 text-[10px] flex-shrink-0 mt-1">
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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
