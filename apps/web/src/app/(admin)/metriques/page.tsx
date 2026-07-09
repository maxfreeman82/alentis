import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/shared';

interface OrgMetric {
  id: string;
  name: string;
  ias_score: number | null;
  nbEmployees: number;
  nbPassports: number;
  avgScoreGlobal: number | null;
  avgScoreRisk: number | null;
  nbActiveJobs: number;
}

export default async function MetriquesPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (me?.role !== 'super_admin') redirect('/dashboard');

  // Récupérer toutes les données en parallèle
  const [orgsRes, profilesRes, passportsRes, jobsRes] = await Promise.all([
    admin.from('organizations').select('id, name, ias_score').order('ias_score', { ascending: false }),
    admin.from('profiles').select('organization_id'),
    admin.from('talent_passports').select('organization_id, score_global, score_risk'),
    admin.from('jobs').select('organization_id, status'),
  ]);

  const orgs      = orgsRes.data ?? [];
  const profiles  = profilesRes.data ?? [];
  const passports = passportsRes.data ?? [];
  const jobs      = jobsRes.data ?? [];

  // Agréger par org
  const metrics: OrgMetric[] = orgs.map((org) => {
    const orgProfiles  = profiles.filter((p) => p.organization_id === org.id);
    const orgPassports = passports.filter((p) => p.organization_id === org.id);
    const orgJobs      = jobs.filter((j) => j.organization_id === org.id && j.status === 'open');

    const nbPassports   = orgPassports.length;
    const scoreGlobals  = orgPassports
      .map((p) => p.score_global)
      .filter((v): v is number => typeof v === 'number');
    const scoreRisks    = orgPassports
      .map((p) => p.score_risk)
      .filter((v): v is number => typeof v === 'number');

    const avgScoreGlobal = scoreGlobals.length > 0
      ? Math.round(scoreGlobals.reduce((s, v) => s + v, 0) / scoreGlobals.length)
      : null;

    const avgScoreRisk = scoreRisks.length > 0
      ? Math.round(scoreRisks.reduce((s, v) => s + v, 0) / scoreRisks.length)
      : null;

    return {
      id:             org.id,
      name:           org.name,
      ias_score:      org.ias_score ?? null,
      nbEmployees:    orgProfiles.length,
      nbPassports,
      avgScoreGlobal,
      avgScoreRisk,
      nbActiveJobs:   orgJobs.length,
    };
  });

  // Déjà trié par ias_score desc depuis la requête Supabase (nulls en dernier)
  const sorted = [...metrics].sort((a, b) => {
    if (a.ias_score === null && b.ias_score === null) return 0;
    if (a.ias_score === null) return 1;
    if (b.ias_score === null) return -1;
    return b.ias_score - a.ias_score;
  });

  function riskColor(v: number | null): string {
    if (v === null) return 'text-slate-400';
    if (v >= 70) return 'text-rose font-bold';
    if (v >= 50) return 'text-amber';
    return 'text-emerald';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="SUPER ADMIN · MÉTRIQUES"
        tagColor="text-violet"
        title="Métriques par organisation"
        subtitle="Trié par IAS Score décroissant"
      />

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-bg">
                <th className="text-left px-5 py-3 text-slate-500 text-xs font-medium">Organisation</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Employés</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Passports</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Score global moy.</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Score risque moy.</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Jobs actifs</th>
                <th className="text-right px-5 py-3 text-slate-500 text-xs font-medium">IAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Aucune organisation
                  </td>
                </tr>
              ) : (
                sorted.map((m) => (
                  <tr key={m.id} className="hover:bg-bg/60 transition-colors">
                    <td className="px-5 py-3 text-slate-900 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">{m.nbEmployees}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">{m.nbPassports}</td>
                    <td className="px-4 py-3 text-center font-mono text-violet font-semibold">
                      {m.avgScoreGlobal !== null ? m.avgScoreGlobal : '—'}
                    </td>
                    <td className={`px-4 py-3 text-center font-mono ${riskColor(m.avgScoreRisk)}`}>
                      {m.avgScoreRisk !== null ? m.avgScoreRisk : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-emerald font-semibold">
                      {m.nbActiveJobs}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-900 font-bold">
                      {m.ias_score !== null ? m.ias_score : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
