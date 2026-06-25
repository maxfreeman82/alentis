import { withAuth } from '@workos-inc/authkit-nextjs';
import { notFound } from 'next/navigation';
import { SectionHeader } from '@/components/shared';
import { computePayroll, type FamilySituation } from '@/lib/remuneration/payroll';
import { formatFCFA } from '@/lib/utils';

const MOCK_EMPLOYEES: Record<string, {
  name: string; role: string; dept: string;
  salaire: number; sit: FamilySituation; enfants: number;
  sectorRisk: 'low' | 'medium' | 'high';
  primes: number; avantagesNature: number;
}> = {
  p1: { name: 'Fatou Ndiaye',    role: 'Lead Product Manager',   dept: 'Produit',    salaire: 900_000,   sit: 'marie_2',     enfants: 2, sectorRisk: 'low',    primes: 50_000,  avantagesNature: 0       },
  p2: { name: 'Ibrahima Fall',   role: 'Directeur Commercial',   dept: 'Commercial', salaire: 1_200_000, sit: 'marie_3',     enfants: 3, sectorRisk: 'low',    primes: 100_000, avantagesNature: 150_000 },
  p3: { name: 'Aminata Diallo',  role: 'Ingénieure Data',        dept: 'Tech',       salaire: 750_000,   sit: 'celibataire', enfants: 0, sectorRisk: 'low',    primes: 0,       avantagesNature: 0       },
  p4: { name: 'Cheikh Mbaye',    role: 'Chef de Projet',         dept: 'Opérations', salaire: 650_000,   sit: 'marie_1',     enfants: 1, sectorRisk: 'medium', primes: 0,       avantagesNature: 0       },
  p5: { name: 'Rokhaya Sow',     role: 'RH Business Partner',   dept: 'RH',         salaire: 700_000,   sit: 'marie',       enfants: 0, sectorRisk: 'low',    primes: 25_000,  avantagesNature: 0       },
  p6: { name: 'Aissatou Camara', role: 'UX Designer',            dept: 'Produit',    salaire: 600_000,   sit: 'celibataire', enfants: 0, sectorRisk: 'low',    primes: 0,       avantagesNature: 0       },
  p7: { name: 'Modou Diop',      role: 'Développeur Full-Stack', dept: 'Tech',       salaire: 680_000,   sit: 'marie',       enfants: 0, sectorRisk: 'medium', primes: 0,       avantagesNature: 0       },
  p8: { name: 'Oumar Ba',        role: 'Business Analyst',       dept: 'Finance',    salaire: 550_000,   sit: 'celibataire', enfants: 0, sectorRisk: 'low',    primes: 0,       avantagesNature: 0       },
};

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
  await withAuth({ ensureSignedIn: true });
  const { profileId } = await params;

  const emp = MOCK_EMPLOYEES[profileId];
  if (!emp) notFound();

  const result = computePayroll({
    salaireBrut:     emp.salaire,
    situation:       emp.sit,
    enfants:         emp.enfants,
    sectorRisk:      emp.sectorRisk,
    primes:          emp.primes,
    avantagesNature: emp.avantagesNature,
    retenuePrevoy:   0,
  });

  const rows = [
    // Éléments de rémunération
    { group: 'ÉLÉMENTS DE RÉMUNÉRATION', label: 'Salaire de base', credit: result.salaireBrut, debit: null },
    ...(result.input.primes > 0 ? [{ group: '', label: 'Primes', credit: result.input.primes, debit: null }] : []),
    ...(result.input.avantagesNature > 0 ? [{ group: '', label: 'Avantages en nature', credit: result.input.avantagesNature, debit: null }] : []),
    { group: '', label: 'SALAIRE BRUT', credit: result.totalBrut, debit: null, isBold: true },
    // Retenues salariales
    { group: 'COTISATIONS SALARIALES', label: result.ipresA_salarie.label, credit: null, debit: result.ipresA_salarie.montant },
    ...(result.ipresB_salarie.montant > 0 ? [{ group: '', label: result.ipresB_salarie.label, credit: null, debit: result.ipresB_salarie.montant }] : []),
    { group: '', label: result.ipm_salarie.label, credit: null, debit: result.ipm_salarie.montant },
    // IRPP
    { group: 'IMPÔTS', label: 'IRPP mensuel (retenue à la source)', credit: null, debit: result.irppMensuel },
    // Net
    { group: 'NET', label: 'SALAIRE NET À PAYER', credit: result.salaireNet, debit: null, isBold: true },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* En-tête bulletin */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="section-tag text-emerald mb-1">BULLETIN DE PAIE · JUIN 2026</p>
            <h1 className="text-white font-bold text-xl">{emp.name}</h1>
            <p className="text-slate-400 text-sm">{emp.role} · {emp.dept}</p>
            <p className="text-slate-500 text-xs mt-1">{SITUATION_LABELS[emp.sit]}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold font-mono text-emerald">{formatFCFA(result.salaireNet)}</p>
            <p className="text-slate-500 text-xs mt-1">net à payer</p>
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
            <div
              key={i}
              className={`flex items-center justify-between px-5 py-2.5 ${
                row.isBold ? 'bg-bg-card' : ''
              }`}
            >
              <div>
                {row.group && (
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{row.group}</p>
                )}
                <p className={`text-sm ${row.isBold ? 'font-bold text-white' : 'text-slate-300'}`}>
                  {row.label}
                </p>
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

      {/* Charges patronales (informatives) */}
      <div>
        <p className="section-tag text-violet mb-3">CHARGES PATRONALES (INFORMATIVES)</p>
        <div className="card">
          <div className="space-y-2">
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
                  <span className="font-mono text-[10px] text-slate-600">
                    {c.taux}% × {formatFCFA(c.base)}
                  </span>
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
