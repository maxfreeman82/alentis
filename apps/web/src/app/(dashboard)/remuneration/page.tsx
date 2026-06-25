import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { SectionHeader } from '@/components/shared';
import { formatFCFA } from '@/lib/utils';
import { computePayroll } from '@/lib/remuneration/payroll';

// Données mock — masse salariale organisation (juin 2026)
const MOCK_EMPLOYEES = [
  { id: 'p1', name: 'Fatou Ndiaye',    role: 'Lead PM',            salaire: 900_000, sit: 'marie_2'    as const, enfants: 2, risk: 'low'    as const },
  { id: 'p2', name: 'Ibrahima Fall',   role: 'Dir. Commercial',    salaire: 1_200_000, sit: 'marie_3'  as const, enfants: 3, risk: 'low'    as const },
  { id: 'p3', name: 'Aminata Diallo',  role: 'Ingénieure Data',    salaire: 750_000, sit: 'celibataire' as const, enfants: 0, risk: 'low'    as const },
  { id: 'p4', name: 'Cheikh Mbaye',    role: 'Chef de Projet',     salaire: 650_000, sit: 'marie_1'    as const, enfants: 1, risk: 'medium' as const },
  { id: 'p5', name: 'Rokhaya Sow',     role: 'RH Business Partner',salaire: 700_000, sit: 'marie'      as const, enfants: 0, risk: 'low'    as const },
  { id: 'p6', name: 'Aissatou Camara', role: 'UX Designer',        salaire: 600_000, sit: 'celibataire' as const, enfants: 0, risk: 'low'    as const },
  { id: 'p7', name: 'Modou Diop',      role: 'Dev Full-Stack',     salaire: 680_000, sit: 'marie'      as const, enfants: 0, risk: 'medium' as const },
  { id: 'p8', name: 'Oumar Ba',        role: 'Business Analyst',   salaire: 550_000, sit: 'celibataire' as const, enfants: 0, risk: 'low'    as const },
];

export default async function RemunerationPage() {
  await withAuth({ ensureSignedIn: true });

  const bulletins = MOCK_EMPLOYEES.map((e) => ({
    ...e,
    result: computePayroll({
      salaireBrut:     e.salaire,
      situation:       e.sit,
      enfants:         e.enfants,
      sectorRisk:      e.risk,
      primes:          0,
      avantagesNature: 0,
      retenuePrevoy:   0,
    }),
  }));

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

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          tag="RÉMUNÉRATION · JUIN 2026"
          title="Masse salariale"
          subtitle="Bulletins de paie IPRES/CSS/IRPP — moteur Sénégal"
        />
        <Link href="/remuneration/bulletin/new" className="btn-primary text-sm flex-shrink-0">
          + Nouveau bulletin
        </Link>
      </div>

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
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Bulletins de paie — Juin 2026</p>
          <p className="text-slate-500 text-xs">{bulletins.length} collaborateurs</p>
        </div>

        {/* Colonnes */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2 border-b border-white/[0.04] text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>Collaborateur</span>
          <span className="text-right">Brut</span>
          <span className="text-right text-amber">IPRES</span>
          <span className="text-right text-rose">IRPP</span>
          <span className="text-right text-emerald">Net</span>
          <span className="text-right text-violet">Coût total</span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {bulletins.map((b) => {
            const ipresTotal = b.result.ipresA_salarie.montant + b.result.ipresB_salarie.montant;
            return (
              <Link
                key={b.id}
                href={`/remuneration/bulletin/${b.id}`}
                className="grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-white text-sm font-medium">{b.name}</p>
                  <p className="text-slate-500 text-xs">{b.role}</p>
                </div>
                <span className="font-mono text-sm text-right text-slate-300">
                  {formatFCFA(b.result.totalBrut)}
                </span>
                <span className="font-mono text-sm text-right text-amber">
                  -{formatFCFA(ipresTotal)}
                </span>
                <span className="font-mono text-sm text-right text-rose">
                  -{formatFCFA(b.result.irppMensuel)}
                </span>
                <span className="font-mono text-sm text-right text-emerald font-bold">
                  {formatFCFA(b.result.salaireNet)}
                </span>
                <span className="font-mono text-xs text-right text-violet">
                  {formatFCFA(b.result.coutEmployeur)}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Total */}
        <div className="grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 border-t border-white/[0.08] bg-bg-card">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL</span>
          <span className="font-mono text-sm font-bold text-right text-slate-300">{formatFCFA(totalBrut)}</span>
          <span />
          <span />
          <span className="font-mono text-sm font-bold text-right text-emerald">{formatFCFA(totalNet)}</span>
          <span className="font-mono text-xs font-bold text-right text-violet">{formatFCFA(coutTotal)}</span>
        </div>
      </div>
    </div>
  );
}
