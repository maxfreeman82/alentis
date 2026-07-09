import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/shared';
import { AdminOrgRow } from '@/components/admin/AdminOrgRow';

type CertLevel = 1 | 2 | 3 | 4;
type Plan = 'starter' | 'growth' | 'enterprise';

function isCertLevel(v: number | null): v is CertLevel {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

function isPlan(v: string | null): v is Plan {
  return v === 'starter' || v === 'growth' || v === 'enterprise';
}

export default async function OrganisationsPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (me?.role !== 'super_admin') redirect('/dashboard');

  // Récupérer toutes les orgs avec nb users
  const [orgsRes, userCountsRes] = await Promise.all([
    admin
      .from('organizations')
      .select('id, name, sector, plan, cert_level, ias_score, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('profiles')
      .select('organization_id'),
  ]);

  const orgs      = orgsRes.data ?? [];
  const allProfs  = userCountsRes.data ?? [];

  // Compter les users par org
  const userCountByOrg = new Map<string, number>();
  for (const p of allProfs) {
    if (p.organization_id) {
      userCountByOrg.set(p.organization_id, (userCountByOrg.get(p.organization_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="SUPER ADMIN · ORGANISATIONS"
        tagColor="text-violet"
        title="Toutes les organisations"
        subtitle={`${orgs.length} organisation${orgs.length > 1 ? 's' : ''} sur la plateforme`}
      />

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-bg">
                <th className="text-left px-5 py-3 text-slate-500 text-xs font-medium">Organisation</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Secteur</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Cert. Level</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Users</th>
                <th className="text-right px-5 py-3 text-slate-500 text-xs font-medium">IAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Aucune organisation trouvée
                  </td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const plan      = isPlan(org.plan) ? org.plan : 'starter';
                  const certLevel = isCertLevel(org.cert_level) ? org.cert_level : null;
                  const nbUsers   = userCountByOrg.get(org.id) ?? 0;

                  return (
                    <tr key={org.id} className="hover:bg-bg/60 transition-colors">
                      <td className="px-5 py-3 text-slate-900 font-medium">{org.name}</td>
                      <td className="px-4 py-3 text-slate-500">{org.sector ?? '—'}</td>
                      <AdminOrgRow
                        orgId={org.id}
                        currentPlan={plan}
                        currentCertLevel={certLevel}
                        nbUsers={nbUsers}
                        iasScore={org.ias_score ?? null}
                      />
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
