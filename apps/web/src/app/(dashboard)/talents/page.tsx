import { withAuth } from '@workos-inc/authkit-nextjs';
import Link from 'next/link';
import { SectionHeader, ScoreCircle } from '@/components/shared';
import { scoreColor } from '@teranga/scoring';
import { scoreHex } from '@/lib/utils';

// Données mock — Talent Passports de l'organisation
const MOCK_PASSPORTS = [
  { id: 'TP-SN-001', name: 'Fatou Ndiaye',     role: 'Lead Product Manager',  score: 91, energy: 'Accomplisseurs', energyColor: '#10B981', level: 'C5', dept: 'Produit',    risk: 9  },
  { id: 'TP-SN-002', name: 'Ibrahima Fall',    role: 'Directeur Commercial',  score: 87, energy: 'Pilotes',       energyColor: '#F97316', level: 'C4', dept: 'Commercial', risk: 12 },
  { id: 'TP-SN-003', name: 'Aminata Diallo',   role: 'Ingénieure Data',       score: 83, energy: 'Initialiseurs', energyColor: '#8B5CF6', level: 'C4', dept: 'Tech',       risk: 18 },
  { id: 'TP-SN-004', name: 'Rokhaya Sow',      role: 'RH Business Partner',   score: 79, energy: 'Dynamiseurs',   energyColor: '#0EA5E9', level: 'C4', dept: 'RH',         risk: 23 },
  { id: 'TP-SN-005', name: 'Cheikh Mbaye',     role: 'Chef de Projet',        score: 74, energy: 'Régulateurs',   energyColor: '#F59E0B', level: 'C3', dept: 'Opérations', risk: 35 },
  { id: 'TP-SN-006', name: 'Aissatou Camara',  role: 'UX Designer',           score: 88, energy: 'Initialiseurs', energyColor: '#8B5CF6', level: 'C5', dept: 'Produit',    risk: 11 },
  { id: 'TP-SN-007', name: 'Modou Diop',       role: 'Développeur Full-Stack', score: 76, energy: 'Accomplisseurs', energyColor: '#10B981', level: 'C3', dept: 'Tech',      risk: 28 },
  { id: 'TP-SN-008', name: 'Oumar Ba',         role: 'Business Analyst',      score: 67, energy: 'Régulateurs',   energyColor: '#F59E0B', level: 'C3', dept: 'Finance',    risk: 44 },
];

const STATS = [
  { label: 'Passports actifs',    value: MOCK_PASSPORTS.length,             sub: 'sur 12 collaborateurs' },
  { label: 'Score moyen',         value: Math.round(MOCK_PASSPORTS.reduce((s, p) => s + p.score, 0) / MOCK_PASSPORTS.length), sub: 'score 6D global' },
  { label: 'Risque élevé',        value: MOCK_PASSPORTS.filter((p) => p.risk > 40).length, sub: 'départ probable < 12 mois' },
  { label: 'Passports manquants', value: 4,                                 sub: 'collaborateurs sans Passport' },
];

export default async function TalentsPage() {
  await withAuth({ ensureSignedIn: true });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          tag="TALENT PASSPORT"
          title="Cartographie des talents"
          subtitle="Profils énergie, scores 6D et risques départ de votre organisation"
        />
        <Link href="/talents/passport/questionnaire" className="btn-primary text-sm flex-shrink-0">
          + Nouveau Passport
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-emerald text-xs font-semibold mt-0.5">{s.label}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table Passports */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Passports actifs</p>
          <p className="text-slate-500 text-xs">{MOCK_PASSPORTS.length} collaborateurs</p>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {MOCK_PASSPORTS.map((p) => {
            const color = scoreColor(p.score);
            const hex   = scoreHex(color);
            const riskColor = p.risk > 40 ? '#F43F5E' : p.risk > 25 ? '#F59E0B' : '#10B981';

            return (
              <Link
                key={p.id}
                href={`/talents/passport/${p.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: `${hex}18`, color: hex, border: `1px solid ${hex}35` }}
                >
                  {p.name.charAt(0)}
                </div>

                {/* Nom + rôle */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-slate-500 text-xs truncate">{p.role} · {p.dept}</p>
                </div>

                {/* Énergie dominante */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded hidden sm:block"
                  style={{ backgroundColor: `${p.energyColor}15`, color: p.energyColor }}
                >
                  {p.energy}
                </span>

                {/* Niveau C1-C5 */}
                <span className="font-mono text-xs text-slate-400 w-6 text-center">{p.level}</span>

                {/* Risque départ */}
                <span
                  className="font-mono text-xs font-bold w-12 text-right"
                  style={{ color: riskColor }}
                  title={`Risque départ : ${p.risk}%`}
                >
                  ↗{p.risk}%
                </span>

                {/* Score 6D */}
                <div className="flex-shrink-0">
                  <ScoreCircle value={p.score} size="sm" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
