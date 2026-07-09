import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/shared';
import { AdminRoleSelect } from '@/components/admin/AdminRoleSelect';

type Role =
  | 'org_admin'
  | 'org_manager'
  | 'org_hr'
  | 'org_recruiter'
  | 'org_employee'
  | 'talent_free'
  | 'super_admin';

const NON_STANDARD_ROLES: Role[] = [
  'org_admin',
  'org_manager',
  'org_hr',
  'org_recruiter',
  'super_admin',
] as const;

function isRole(v: string | null): v is Role {
  return (
    v === 'org_admin' ||
    v === 'org_manager' ||
    v === 'org_hr' ||
    v === 'org_recruiter' ||
    v === 'org_employee' ||
    v === 'talent_free' ||
    v === 'super_admin'
  );
}

const ROLE_LABELS: Record<Role, string> = {
  org_admin:     'Admin Org',
  org_manager:   'Manager',
  org_hr:        'RH',
  org_recruiter: 'Recruteur',
  org_employee:  'Employé',
  talent_free:   'Talent Free',
  super_admin:   'Super Admin',
} as const;

const ROLE_COLORS: Record<Role, string> = {
  org_admin:     'text-violet bg-violet/10 border-violet/20',
  org_manager:   'text-sky bg-sky/10 border-sky/20',
  org_hr:        'text-emerald bg-emerald/10 border-emerald/20',
  org_recruiter: 'text-orange bg-orange/10 border-orange/20',
  org_employee:  'text-slate-600 bg-slate-100 border-slate-200',
  talent_free:   'text-amber bg-amber/10 border-amber/20',
  super_admin:   'text-rose bg-rose/10 border-rose/20',
} as const;

export default async function PermissionsPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (me?.role !== 'super_admin') redirect('/dashboard');

  // Profils avec rôles non-standard (tout sauf talent_free basique et org_employee)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, role, organization_id')
    .in('role', NON_STANDARD_ROLES)
    .order('role')
    .order('email');

  // Récupérer les noms d'orgs
  const orgIds = [...new Set(
    (profiles ?? [])
      .map((p) => p.organization_id)
      .filter((id): id is string => id !== null)
  )];

  const orgNames = new Map<string, string>();

  if (orgIds.length > 0) {
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);

    for (const org of orgs ?? []) {
      orgNames.set(org.id, org.name);
    }
  }

  const profList = profiles ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="SUPER ADMIN · PERMISSIONS"
        tagColor="text-violet"
        title="Rôles & Accès"
        subtitle={`${profList.length} profil${profList.length > 1 ? 's' : ''} avec rôles spéciaux`}
      />

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-bg">
                <th className="text-left px-5 py-3 text-slate-500 text-xs font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Prénom Nom</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Organisation</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Rôle actuel</th>
                <th className="text-left px-5 py-3 text-slate-500 text-xs font-medium">Changer le rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Aucun profil avec rôle spécial
                  </td>
                </tr>
              ) : (
                profList.map((profile) => {
                  const role    = isRole(profile.role) ? profile.role : 'org_employee';
                  const orgName = profile.organization_id
                    ? (orgNames.get(profile.organization_id) ?? '—')
                    : '—';
                  const fullName = [profile.first_name, profile.last_name]
                    .filter(Boolean)
                    .join(' ') || '—';

                  return (
                    <tr key={profile.id} className="hover:bg-bg/60 transition-colors">
                      <td className="px-5 py-3 text-slate-700 text-xs">{profile.email ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{fullName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{orgName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
                          {ROLE_LABELS[role]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <AdminRoleSelect profileId={profile.id} currentRole={role} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
