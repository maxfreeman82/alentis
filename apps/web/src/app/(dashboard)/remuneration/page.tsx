import { requireAuth } from '@/lib/supabase/user';
import Link from 'next/link';
import { SectionHeader } from '@/components/shared';
import { formatFCFA } from '@/lib/utils';
import { computePayroll } from '@/lib/remuneration/payroll';
import { getUserOrg } from '@/lib/supabase/auth';
import type { FamilySituation } from '@/lib/remuneration/payroll';
import { PayrollConfigButton } from '@/components/remuneration/PayrollConfigButton';
import { Users, AlertTriangle } from 'lucide-react';

export default async function RemunerationPage() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, organizationId } = ctx;

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Requêtes parallèles — pas de join car relation non typée
  const [settingsRes, allProfilesRes] = await Promise.all([
    supabase.from('payroll_settings').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, first_name, last_name, role').eq('organization_id', organizationId).order('first_name'),
  ]);

  const settings    = settingsRes.data ?? [];
  const allProfiles = allProfilesRes.data ?? [];

  // Index des profils pour lookup O(1)
  const profileMap  = new Map(allProfiles.map(p => [p.id, p]));
  const configuredIds = new Set(settings.map(s => s.profile_id));
  const unconfigured  = allProfiles.filter(p => !configuredIds.has(p.id));

  // Calculer les bulletins depuis les settings réels
  const bulletins = settings.map((s) => {
    const profile = profileMap.get(s.profile_id);
    const result  = computePayroll({
      salaireBrut:     s.salaire_brut,
      situation:       s.situation as FamilySituation,
      enfants:         s.enfants,
      sectorRisk:      s.sector_risk as 'low' | 'medium' | 'high',
      primes:          s.primes_mensuelles,
      avantagesNature: s.avantages_nature,
      retenuePrevoy:   s.retenue_prevoyance,
    });
    return {
      profileId: s.profile_id,
      name:  profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Collaborateur',
      role:  profile?.role ?? '—',
      result,
    };
  });

  const totalBrut     = bulletins.reduce((s, b) => s + b.result.totalBrut, 0);
  const totalNet      = bulletins.reduce((s, b) => s + b.result.salaireNet, 0);
  const totalPatronal = bulletins.reduce((s, b) => s + b.result.totalChargesPatronal, 0);
  const coutTotal     = bulletins.reduce((s, b) => s + b.result.coutEmployeur, 0);

  const STATS = [
    { label: 'Masse salariale brute', value: formatFCFA(totalBrut),     color: '#10B981' },
    { label: 'Masse salariale nette', value: formatFCFA(totalNet),      color: '#0EA5E9' },
    { label: 'Charges patronales',    value: formatFCFA(totalPatronal), color: '#F59E0B' },
    { label: 'Coût total employeur',  value: formatFCFA(coutTotal),     color: '#8B5CF6' },
  ];

  const monthName = new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long' });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          tag={`RÉMUNÉRATION · ${monthName.toUpperCase()} ${year}`}
          title="Masse salariale"
          subtitle="Bulletins de paie IPRES/CSS/IRPP — moteur Sénégal 2024"
        />
        <PayrollConfigButton profiles={allProfiles ?? []} />
      </div>

      {/* Alerte profils non configurés */}
      {unconfigured.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-semibold">
              {unconfigured.length} collaborateur{unconfigured.length > 1 ? 's' : ''} sans paramètres de paie
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              {unconfigured.map(p => `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()).join(', ')} — Cliquez "Configurer" pour les ajouter.
            </p>
          </div>
        </div>
      )}

      {/* État vide */}
      {bulletins.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <Users className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-900 font-display text-xl">Aucun bulletin configuré</p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Configurez les paramètres de paie de vos collaborateurs pour générer la masse salariale.
          </p>
          <PayrollConfigButton profiles={allProfiles ?? []} />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="card text-center">
                <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-semibold mt-0.5 text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table bulletins */}
          <div className="card !p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-slate-900 font-semibold text-sm">Bulletins de paie — {monthName} {year}</p>
              <p className="text-slate-500 text-xs">{bulletins.length} collaborateurs</p>
            </div>

            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <span>Collaborateur</span>
              <span className="text-right">Brut</span>
              <span className="text-right text-amber">IPRES</span>
              <span className="text-right text-rose">IRPP</span>
              <span className="text-right text-emerald">Net</span>
              <span className="text-right text-violet">Coût total</span>
            </div>

            <div className="divide-y divide-slate-200">
              {bulletins.map((b) => {
                const ipresTotal = b.result.ipresA_salarie.montant + b.result.ipresB_salarie.montant;
                return (
                  <Link
                    key={b.profileId}
                    href={`/remuneration/bulletin/${b.profileId}`}
                    className="grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-slate-900 text-sm font-medium">{b.name}</p>
                      <p className="text-slate-500 text-xs">{b.role}</p>
                    </div>
                    <span className="font-mono text-sm text-right text-slate-600">{formatFCFA(b.result.totalBrut)}</span>
                    <span className="font-mono text-sm text-right text-amber">-{formatFCFA(ipresTotal)}</span>
                    <span className="font-mono text-sm text-right text-rose">-{formatFCFA(b.result.irppMensuel)}</span>
                    <span className="font-mono text-sm text-right text-emerald font-bold">{formatFCFA(b.result.salaireNet)}</span>
                    <span className="font-mono text-xs text-right text-violet">{formatFCFA(b.result.coutEmployeur)}</span>
                  </Link>
                );
              })}
            </div>

            {/* Total */}
            <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 border-t border-slate-200 bg-bg-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL ORG</span>
              <span className="font-mono text-sm font-bold text-right text-slate-600">{formatFCFA(totalBrut)}</span>
              <span /><span />
              <span className="font-mono text-sm font-bold text-right text-emerald">{formatFCFA(totalNet)}</span>
              <span className="font-mono text-xs font-bold text-right text-violet">{formatFCFA(coutTotal)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
