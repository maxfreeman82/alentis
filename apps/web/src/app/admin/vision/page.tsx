import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/shared';

export default async function VisionPage() {
  const user  = await requireAuth();
  const admin = createAdminClient();

  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (me?.role !== 'super_admin') redirect('/dashboard');

  // Récupérer toutes les orgs
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, sector')
    .order('name');

  // Récupérer le dernier vision_assessment par org
  // On récupère tous, puis on garde le plus récent par org
  const { data: assessments } = await admin
    .from('vision_assessments')
    .select('id, organization_id, created_at')
    .order('created_at', { ascending: false });

  // Map : orgId → dernier assessment
  const latestByOrg = new Map<string, { id: string; created_at: string }>();
  for (const a of assessments ?? []) {
    if (!latestByOrg.has(a.organization_id)) {
      latestByOrg.set(a.organization_id, { id: a.id, created_at: a.created_at });
    }
  }

  const orgList = orgs ?? [];
  const withAssessment = orgList.filter((o) => latestByOrg.has(o.id)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="SUPER ADMIN · VISION"
        tagColor="text-violet"
        title="Vision des organisations"
        subtitle={`${withAssessment} org${withAssessment > 1 ? 's' : ''} avec assessment sur ${orgList.length}`}
      />

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-bg">
                <th className="text-left px-5 py-3 text-slate-500 text-xs font-medium">Organisation</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Secteur</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs font-medium">Dernier assessment</th>
                <th className="text-right px-5 py-3 text-slate-500 text-xs font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Aucune organisation
                  </td>
                </tr>
              ) : (
                orgList.map((org) => {
                  const latest = latestByOrg.get(org.id);
                  const date   = latest
                    ? new Date(latest.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <tr key={org.id} className="hover:bg-bg/60 transition-colors">
                      <td className="px-5 py-3 text-slate-900 font-medium">{org.name}</td>
                      <td className="px-4 py-3 text-slate-500">{org.sector ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600 text-xs">
                        {date ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {latest ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald/30 bg-emerald/10 text-emerald">
                            Complété
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400">
                            Non démarré
                          </span>
                        )}
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
