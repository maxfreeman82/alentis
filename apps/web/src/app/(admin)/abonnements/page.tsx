import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/shared';
import { AdminOrgRow } from '@/components/admin/AdminOrgRow';

type Plan = 'starter' | 'growth' | 'enterprise';

const PLAN_PRICES: Record<Plan, number> = {
  starter:    0,
  growth:     299,
  enterprise: 899,
} as const;

const PLAN_COLORS: Record<Plan, string> = {
  starter:    'text-sky bg-sky/10 border-sky/20',
  growth:     'text-violet bg-violet/10 border-violet/20',
  enterprise: 'text-amber bg-amber/10 border-amber/20',
} as const;

function isPlan(v: string | null): v is Plan {
  return v === 'starter' || v === 'growth' || v === 'enterprise';
}

function isCertLevel(v: number | null): v is 1 | 2 | 3 | 4 {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

export default async function AbonnementsPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (me?.role !== 'super_admin') redirect('/dashboard');

  const [orgsRes, profsRes] = await Promise.all([
    admin
      .from('organizations')
      .select('id, name, sector, plan, cert_level, ias_score, created_at')
      .order('created_at', { ascending: false }),
    admin.from('profiles').select('organization_id'),
  ]);

  const orgs    = orgsRes.data ?? [];
  const allProf = profsRes.data ?? [];

  // Compter users par org
  const userCountByOrg = new Map<string, number>();
  for (const p of allProf) {
    if (p.organization_id) {
      userCountByOrg.set(p.organization_id, (userCountByOrg.get(p.organization_id) ?? 0) + 1);
    }
  }

  // Revenus estimés par plan
  const revenuByPlan: Record<Plan, number> = { starter: 0, growth: 0, enterprise: 0 };
  let totalRevenu = 0;

  for (const org of orgs) {
    const p = isPlan(org.plan) ? org.plan : 'starter';
    revenuByPlan[p] += PLAN_PRICES[p];
    totalRevenu      += PLAN_PRICES[p];
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="SUPER ADMIN · ABONNEMENTS"
        tagColor="text-violet"
        title="Gestion des abonnements"
        subtitle="Revenue estimé et plans des organisations"
      />

      {/* Stats revenus */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center space-y-1 lg:col-span-1">
          <p className="font-display text-2xl font-bold text-slate-900 font-mono">
            {totalRevenu.toLocaleString('fr-FR')} €
          </p>
          <p className="text-slate-500 text-xs">Revenu mensuel estimé</p>
        </div>

        {(['starter', 'growth', 'enterprise'] as const).map((plan) => (
          <div key={plan} className="card text-center space-y-1">
            <p className="font-display text-2xl font-bold text-slate-900 font-mono">
              {revenuByPlan[plan].toLocaleString('fr-FR')} €
            </p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${PLAN_COLORS[plan]}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)} · {PLAN_PRICES[plan]}€/mois
            </span>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <p className="text-slate-900 font-semibold text-sm">Organisations et abonnements</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-bg">
                <th className="text-left px-5 py-3 text-slate-500 text-xs font-medium">Organisation</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Date création</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Plan actuel</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Cert. Level</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Users</th>
                <th className="text-right px-5 py-3 text-slate-500 text-xs font-medium">IAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Aucune organisation
                  </td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const plan      = isPlan(org.plan) ? org.plan : 'starter';
                  const certLevel = isCertLevel(org.cert_level) ? org.cert_level : null;
                  const nbUsers   = userCountByOrg.get(org.id) ?? 0;
                  const date      = org.created_at
                    ? new Date(org.created_at).toLocaleDateString('fr-FR')
                    : '—';

                  return (
                    <tr key={org.id} className="hover:bg-bg/60 transition-colors">
                      <td className="px-5 py-3 text-slate-900 font-medium">{org.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{date}</td>
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
