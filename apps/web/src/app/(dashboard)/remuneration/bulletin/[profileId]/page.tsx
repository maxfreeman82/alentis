import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft } from 'lucide-react';
import { computePayroll, type FamilySituation } from '@/lib/remuneration/payroll';
import { formatFCFA } from '@/lib/utils';
import { getUserOrg } from '@/lib/supabase/auth';

const SITUATION_LABELS: Record<FamilySituation, string> = {
  celibataire: 'Célibataire sans enfant',
  marie:       'Marié(e) sans enfant',
  marie_1:     'Marié(e) + 1 enfant',
  marie_2:     'Marié(e) + 2 enfants',
  marie_3:     'Marié(e) + 3 enfants et +',
};

interface PageProps {
  params: Promise<{ profileId: string }>;
}

export default async function BulletinPage({ params }: PageProps) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return null;

  const { supabase, organizationId } = ctx;
  const { profileId } = await params;

  const [settingRes, profileRes] = await Promise.all([
    supabase.from('payroll_settings').select('*').eq('profile_id', profileId).eq('organization_id', organizationId).maybeSingle(),
    supabase.from('profiles').select('first_name, last_name, role').eq('id', profileId).maybeSingle(),
  ]);

  if (!settingRes.data) notFound();
  const setting = settingRes.data;
  const profile = profileRes.data;
  const fullName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Collaborateur';

  const result = computePayroll({
    salaireBrut:     setting.salaire_brut,
    situation:       setting.situation as FamilySituation,
    enfants:         setting.enfants,
    sectorRisk:      setting.sector_risk as 'low' | 'medium' | 'high',
    primes:          setting.primes_mensuelles,
    avantagesNature: setting.avantages_nature,
    retenuePrevoy:   setting.retenue_prevoyance,
  });

  const now       = new Date();
  const monthName = now.toLocaleString('fr-FR', { month: 'long' });
  const year      = now.getFullYear();

  const rows = [
    { group: 'ÉLÉMENTS DE RÉMUNÉRATION', label: 'Salaire de base', credit: result.salaireBrut, debit: null },
    ...(result.input.primes > 0 ? [{ group: '', label: 'Primes', credit: result.input.primes, debit: null }] : []),
    ...(result.input.avantagesNature > 0 ? [{ group: '', label: 'Avantages en nature', credit: result.input.avantagesNature, debit: null }] : []),
    { group: '', label: 'SALAIRE BRUT', credit: result.totalBrut, debit: null, isBold: true },
    { group: 'COTISATIONS SALARIALES', label: result.ipresA_salarie.label, credit: null, debit: result.ipresA_salarie.montant },
    ...(result.ipresB_salarie.montant > 0 ? [{ group: '', label: result.ipresB_salarie.label, credit: null, debit: result.ipresB_salarie.montant }] : []),
    { group: '', label: result.ipm_salarie.label, credit: null, debit: result.ipm_salarie.montant },
    { group: 'IMPÔTS', label: 'IRPP mensuel (retenue à la source)', credit: null, debit: result.irppMensuel },
    { group: 'NET', label: 'SALAIRE NET À PAYER', credit: result.salaireNet, debit: null, isBold: true },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/remuneration" className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <p className="text-slate-500 text-sm">Rémunération</p>
      </div>

      {/* En-tête bulletin */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="section-tag text-emerald mb-1">BULLETIN DE PAIE · {monthName.toUpperCase()} {year}</p>
            <h1 className="text-white font-bold text-xl">{fullName}</h1>
            <p className="text-slate-400 text-sm">{profile?.role ?? '—'}</p>
            <p className="text-slate-500 text-xs mt-1">{SITUATION_LABELS[setting.situation as FamilySituation]}</p>
            {setting.est_cadre && (
              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-violet/10 text-violet border border-violet/20">Cadre</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono text-emerald">{formatFCFA(result.salaireNet)}</p>
            <p className="text-slate-500 text-xs mt-1">net à payer</p>
            <Link
              href={`/api/remuneration/bulletin/${profileId}/print`}
              target="_blank"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Télécharger PDF
            </Link>
          </div>
        </div>

        {/* Résumé rapide */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.06]">
          <div className="text-center">
            <p className="font-mono text-sm font-bold text-slate-300">{formatFCFA(result.totalBrut)}</p>
            <p className="text-[10px] text-slate-500">Salaire brut</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold text-rose">-{formatFCFA(result.totalRetenues + result.irppMensuel)}</p>
            <p className="text-[10px] text-slate-500">Total retenues</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold text-violet">{formatFCFA(result.coutEmployeur)}</p>
            <p className="text-[10px] text-slate-500">Coût employeur</p>
          </div>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <p className="text-white font-semibold text-sm">Détail du bulletin</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {rows.map((row, i) => (
            <div key={i} className={`flex items-center justify-between px-5 py-2.5 ${row.isBold ? 'bg-bg-card' : ''}`}>
              <div>
                {row.group && (
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{row.group}</p>
                )}
                <p className={`text-sm ${row.isBold ? 'font-bold text-white' : 'text-slate-300'}`}>{row.label}</p>
              </div>
              <div className="flex gap-12 text-right">
                <span className={`font-mono text-sm w-28 ${row.credit ? 'text-emerald' : 'text-slate-700'}`}>
                  {row.credit !== null ? formatFCFA(row.credit) : '—'}
                </span>
                <span className={`font-mono text-sm w-28 ${row.debit ? 'text-rose' : 'text-slate-700'}`}>
                  {row.debit !== null ? `-${formatFCFA(row.debit)}` : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charges patronales */}
      <div>
        <p className="section-tag text-violet mb-3">CHARGES PATRONALES (INFORMATIVES)</p>
        <div className="card space-y-2">
          {[
            result.ipresA_patronal,
            ...(result.ipresB_patronal.montant > 0 ? [result.ipresB_patronal] : []),
            result.css_pf,
            result.css_at,
            result.ipm_patronal,
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">{c.label}</span>
                <span className="font-mono text-[10px] text-slate-600">{c.taux}% × {formatFCFA(c.base)}</span>
              </div>
              <span className="font-mono text-sm font-medium text-violet">{formatFCFA(c.montant)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-white text-sm font-bold">Total charges patronales</span>
            <span className="font-mono text-sm font-bold text-violet">{formatFCFA(result.totalChargesPatronal)}</span>
          </div>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="font-mono text-xl font-bold text-amber">{result.tauxChargesSalarie}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Taux charges salariales</p>
        </div>
        <div className="card text-center">
          <p className="font-mono text-xl font-bold text-violet">{result.tauxCoutTotal}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Rapport coût/net</p>
        </div>
      </div>
    </div>
  );
}
