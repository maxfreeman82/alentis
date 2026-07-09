import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/shared';
import { Building2, Users, Award, TrendingUp } from 'lucide-react';

type PlanKey = 'starter' | 'growth' | 'enterprise';

const PLAN_LABELS: Record<PlanKey, string> = {
  starter:    'Starter',
  growth:     'Growth',
  enterprise: 'Enterprise',
} as const;

const PLAN_COLORS: Record<PlanKey, string> = {
  starter:    'text-sky bg-sky/10 border-sky/20',
  growth:     'text-violet bg-violet/10 border-violet/20',
  enterprise: 'text-amber bg-amber/10 border-amber/20',
} as const;

function isPlanKey(value: string): value is PlanKey {
  return value === 'starter' || value === 'growth' || value === 'enterprise';
}

export default async function AdminPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  // Guard
  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (me?.role !== 'super_admin') redirect('/dashboard');

  // Requêtes parallèles
  const [orgsRes, profilesCountRes, passportsRes, passportsScoreRes, recentOrgsRes] = await Promise.all([
    admin.from('organizations').select('id, plan'),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('talent_passports').select('id', { count: 'exact', head: true }),
    admin.from('talent_passports').select('score_global'),
    admin
      .from('organizations')
      .select('id, name, sector, plan, ias_score, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const orgs        = orgsRes.data ?? [];
  const userCount   = profilesCountRes.count ?? 0;
  const passCount   = passportsRes.count ?? 0;
  const passScores  = passportsScoreRes.data ?? [];
  const recentOrgs  = recentOrgsRes.data ?? [];

  // IAS moyen plateforme
  const iasValues = passScores
    .map((p) => p.score_global)
    .filter((v): v is number => typeof v === 'number');

  const iasAvg =
    iasValues.length > 0
      ? Math.round(iasValues.reduce((s, v) => s + v, 0) / iasValues.length)
      : null;

  // Répartition des plans
  const planCounts: Record<PlanKey, number> = { starter: 0, growth: 0, enterprise: 0 };
  for (const org of orgs) {
    const p = org.plan ?? 'starter';
    if (isPlanKey(p)) {
      planCounts[p] += 1;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="SUPER ADMIN · PLATEFORME"
        tagColor="text-violet"
        title="Vue globale Teranga Align"
        subtitle="Tableau de bord administrateur — toutes organisations"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-emerald" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-900 font-mono">{orgs.length}</p>
            <p className="text-slate-500 text-xs mt-0.5">Organisations</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-violet" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-900 font-mono">{userCount}</p>
            <p className="text-slate-500 text-xs mt-0.5">Utilisateurs</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center flex-shrink-0">
            <Award size={18} className="text-amber" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-900 font-mono">{passCount}</p>
            <p className="text-slate-500 text-xs mt-0.5">Talent Passports</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-sky" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-slate-900 font-mono">
              {iasAvg !== null ? iasAvg : '—'}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">IAS moyen plateforme</p>
          </div>
        </div>
      </div>

      {/* Répartition des plans */}
      <div>
        <h2 className="text-slate-900 font-semibold text-sm mb-3">Répartition des plans</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['starter', 'growth', 'enterprise'] as const).map((plan) => {
            const count = planCounts[plan];
            const pct   = orgs.length > 0 ? Math.round((count / orgs.length) * 100) : 0;
            return (
              <div key={plan} className="card text-center space-y-2">
                <p className="font-display text-3xl font-bold text-slate-900 font-mono">{count}</p>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${PLAN_COLORS[plan]}`}>
                  {PLAN_LABELS[plan]}
                </span>
                <p className="text-slate-400 text-xs">{pct}% des orgs</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tableau des 10 dernières orgs */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <p className="text-slate-900 font-semibold text-sm">10 dernières organisations créées</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-bg">
                <th className="text-left px-5 py-2.5 text-slate-500 text-xs font-medium">Nom</th>
                <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">Secteur</th>
                <th className="text-left px-4 py-2.5 text-slate-500 text-xs font-medium">Plan</th>
                <th className="text-right px-5 py-2.5 text-slate-500 text-xs font-medium">IAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrgs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-sm">
                    Aucune organisation trouvée
                  </td>
                </tr>
              ) : (
                recentOrgs.map((org) => {
                  const plan = org.plan ?? 'starter';
                  const planColor = isPlanKey(plan) ? PLAN_COLORS[plan] : 'text-slate-500 bg-slate-100 border-slate-200';
                  const planLabel = isPlanKey(plan) ? PLAN_LABELS[plan] : plan;
                  return (
                    <tr key={org.id} className="hover:bg-bg/60 transition-colors">
                      <td className="px-5 py-3 text-slate-900 font-medium">{org.name}</td>
                      <td className="px-4 py-3 text-slate-500">{org.sector ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${planColor}`}>
                          {planLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-900 font-semibold">
                        {org.ias_score ?? '—'}
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
