import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { Users, TrendingUp, ArrowUpRight, ExternalLink } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

export default async function MonEquipePage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const supabase  = createServerClient();

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('workos_user_id', user.id).maybeSingle();

  const [{ data: founder }, { data: contracts }, { data: simulations }] = await Promise.all([
    profile
      ? supabase.from('founders').select('*').eq('profile_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile
      ? supabase.from('founder_contracts').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    profile
      ? supabase.from('employer_cost_simulations').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const employeeCount  = contracts?.length ?? 0;
  const signedContracts = contracts?.filter(c => c.signed).length ?? 0;
  const totalMonthlyCost = simulations?.[0]?.total_cost ?? null;

  // Seuil de migration : 5+ employés → passer au plan payant
  const shouldMigrate = employeeCount >= 5 && !founder?.migrated_to_paid;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">ÉTAPE 5</p>
        <h1 className="font-display text-white text-2xl">Mon Équipe</h1>
        <p className="text-slate-400 text-sm mt-1">
          Gérez vos collaborateurs, suivez vos coûts, anticipez la croissance.
        </p>
      </div>

      {/* Bannière migration si 5+ employés */}
      {shouldMigrate && (
        <div className="border border-violet-500/30 bg-violet-500/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <p className="text-violet-300 font-semibold text-sm">Vous êtes prêt pour Teranga Align Starter</p>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Avec {employeeCount} collaborateurs, il est temps de passer à un vrai RH digital.
            Évaluations 6D, boussole stratégique, vision pulse, gestion des talents — tout ça dans un seul outil.
          </p>
          <Link href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
            Migrer vers Starter · 49 000 FCFA/mois <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Collaborateurs',  value: employeeCount.toString(),    color: '#10B981', sub: `${signedContracts} contrats signés` },
          { label: 'Coût mensuel',    value: totalMonthlyCost ? `${(totalMonthlyCost / 1000).toFixed(0)}K FCFA` : '—', color: '#F97316', sub: 'dernière simulation' },
          { label: 'Archétype',       value: founder?.archetype ?? '—',   color: '#8B5CF6', sub: 'boussole fondateur' },
          { label: 'Stade',           value: founder?.stage ?? 'idea',    color: '#F59E0B', sub: 'progression' },
        ].map(kpi => (
          <div key={kpi.label} className="card text-center space-y-1">
            <p className="font-display text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-white text-xs font-semibold">{kpi.label}</p>
            <p className="text-slate-600 text-[10px]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Liste collaborateurs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-white text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" /> Collaborateurs ({employeeCount})
          </h2>
          <Link href="/premier-employe"
            className="text-amber-400 text-xs hover:underline flex items-center gap-1">
            + Ajouter un contrat
          </Link>
        </div>

        {!contracts || contracts.length === 0 ? (
          <div className="card text-center py-10 space-y-3">
            <Users className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-slate-500 text-sm">Aucun contrat créé pour l&apos;instant</p>
            <Link href="/premier-employe"
              className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/20 transition-all">
              Recruter mon premier employé
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map(c => (
              <div key={c.id} className="card flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-sm font-bold">
                    {(c.employee_name ?? '?').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.employee_name ?? '—'}</p>
                  <p className="text-slate-500 text-xs">{c.employee_role ?? '—'} · {c.contract_type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {c.gross_salary && (
                    <p className="text-slate-300 text-xs font-mono">{(c.gross_salary / 1000).toFixed(0)}K FCFA</p>
                  )}
                  <span className={`text-[10px] font-semibold ${c.signed ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {c.signed ? 'Signé' : 'Non signé'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dernières simulations */}
      {simulations && simulations.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-white text-sm">Dernières simulations de coût</h2>
          <div className="card overflow-hidden p-0">
            {simulations.map((s, i) => (
              <div key={s.id} className={`flex items-center justify-between px-4 py-3 ${i < simulations.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                <div>
                  <p className="text-slate-300 text-xs font-mono">{(s.gross_salary / 1000).toFixed(0)}K brut</p>
                  <p className="text-slate-600 text-[10px]">{s.is_cadre ? 'Cadre' : 'Non-cadre'} · {new Date(s.created_at).toLocaleDateString('fr-SN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 text-xs font-semibold font-mono">{((s.total_cost ?? 0) / 1000).toFixed(0)}K coût/mois</p>
                  <p className="text-slate-600 text-[10px]">net {((s.net_salary ?? 0) / 1000).toFixed(0)}K FCFA</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/premier-employe/cout-employeur" className="text-amber-400 text-xs hover:underline flex items-center gap-1">
            Nouvelle simulation <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
