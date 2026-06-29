import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Briefcase, MapPin, Building2, ArrowRight, TrendingUp } from 'lucide-react';

export default async function CandidatsPage() {
  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, description, organization_id, ias_impact, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const orgIds = [...new Set((jobs ?? []).map(j => j.organization_id).filter(Boolean))];
  const { data: orgs } = orgIds.length
    ? await admin.from('organizations').select('id, name, sector, country, city, plan').in('id', orgIds)
    : { data: [] };

  const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, o]));

  const SECTOR_COLORS: Record<string, string> = {
    'Technologie':           '#10B981',
    'Finance & Banque':      '#0EA5E9',
    'Agriculture & Agritech':'#84CC16',
    'Santé & Healthcare':    '#F43F5E',
    'Éducation & EdTech':    '#F59E0B',
    'Logistique & Transport':'#8B5CF6',
    'Médias & Communication':'#EC4899',
    'BTP & Construction':    '#F97316',
    'Tourisme & Hôtellerie': '#06B6D4',
    'Microfinance & Inclusion':'#A78BFA',
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3 pb-4">
        <p className="text-xs uppercase tracking-widest text-emerald font-semibold">Offres d'emploi</p>
        <h1 className="font-display text-3xl text-white font-bold">
          Trouvez votre prochain défi
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          {jobs?.length ?? 0} postes ouverts chez {orgIds.length} entreprises africaines qui utilisent Teranga Align pour recruter les meilleurs talents.
        </p>
      </div>

      {/* Liste des offres */}
      {!jobs?.length ? (
        <div className="text-center py-16 text-slate-500">Aucune offre disponible pour l&apos;instant.</div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const org = orgMap[job.organization_id];
            const color = org ? (SECTOR_COLORS[org.sector ?? ''] ?? '#10B981') : '#10B981';
            return (
              <Link
                key={job.id}
                href={`/candidats/${job.id}`}
                className="group flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all"
              >
                {/* Logo org */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {org?.name?.[0] ?? '?'}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm group-hover:text-emerald transition-colors">
                    {job.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {org && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Building2 size={11} />
                        {org.name}
                      </span>
                    )}
                    {org?.city && (
                      <span className="flex items-center gap-1 text-slate-500 text-xs">
                        <MapPin size={11} />
                        {org.city}, {org.country}
                      </span>
                    )}
                    {org?.sector && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {org.sector}
                      </span>
                    )}
                  </div>
                </div>

                {/* IAS Impact */}
                {job.ias_impact && (
                  <div className="flex items-center gap-1 text-slate-500 text-xs flex-shrink-0 hidden sm:flex">
                    <TrendingUp size={11} />
                    Impact IAS {job.ias_impact}
                  </div>
                )}

                <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
