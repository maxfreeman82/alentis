import { withAuth } from '@workos-inc/authkit-nextjs';
import { TrendingUp, Users, Target, Zap, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { ScoreCircle, AIInsightCard, AlertCard, SectionHeader, CertBadge } from '@/components/shared';
import { iasLabel } from '@teranga/scoring';

// Données fictives — seront remplacées par Supabase
const MOCK_ORG = {
  name: 'Dakar Tech Solutions',
  ias_score: 74,
  cert_level: 2 as const,
  archetype: 'INNOVATRICE' as const,
  okr_velocity: 68,
  energy_fit: 71,
  adhesion: 82,
};

const MOCK_ALERTS = [
  { id: '1', title: '3 postes critiques non pourvus depuis +60j', severity: 'critical' as const, desc: 'Impact estimé : -4.2 pts IAS' },
  { id: '2', title: 'Risque départ détecté — Aminata Diallo (Lead Dev)', severity: 'critical' as const, desc: 'Score départ : 78/100' },
  { id: '3', title: 'Vision Pulse Q2 : participation 42% seulement', severity: 'warning' as const, desc: 'Objectif : 70%' },
];

const MOCK_OKRS = [
  { title: 'Expansion Côte d\'Ivoire', progress: 62, on_track: true },
  { title: 'Certification ISO 27001', progress: 45, on_track: false },
  { title: 'Réduction turnover -30%', progress: 78, on_track: true },
];

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const iasResult = iasLabel(MOCK_ORG.ias_score);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        tag="VUE D'ENSEMBLE"
        title={`Bonjour, ${user.firstName ?? 'Dirigeant'}`}
        subtitle={`${MOCK_ORG.name} · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={<CertBadge level={MOCK_ORG.cert_level} />}
      />

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IAS */}
        <div className="card col-span-1 flex items-center gap-4">
          <ScoreCircle value={MOCK_ORG.ias_score} size="lg" />
          <div>
            <p className="section-tag text-slate-500 mb-1">IAS Global</p>
            <p className="font-display text-white text-lg">{iasResult.label}</p>
            <p className="text-slate-400 text-xs mt-1">Index d&apos;Alignement Stratégique</p>
          </div>
        </div>

        {/* OKR Velocity */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Target size={16} className="text-orange" />
            <span className="section-tag text-slate-500">OKR VELOCITY</span>
          </div>
          <p className="font-display text-3xl text-orange">{MOCK_ORG.okr_velocity}%</p>
          <p className="text-slate-400 text-xs mt-1">OKR on track</p>
          <div className="mt-3 h-1 bg-bg rounded-full">
            <div className="h-full bg-orange rounded-full" style={{ width: `${MOCK_ORG.okr_velocity}%` }} />
          </div>
        </div>

        {/* Energy Fit */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Zap size={16} className="text-violet" />
            <span className="section-tag text-slate-500">ENERGY FIT</span>
          </div>
          <p className="font-display text-3xl text-violet">{MOCK_ORG.energy_fit}%</p>
          <p className="text-slate-400 text-xs mt-1">Mix énergétique vs archétype {MOCK_ORG.archetype}</p>
          <div className="mt-3 h-1 bg-bg rounded-full">
            <div className="h-full bg-violet rounded-full" style={{ width: `${MOCK_ORG.energy_fit}%` }} />
          </div>
        </div>

        {/* Vision Pulse */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Users size={16} className="text-sky" />
            <span className="section-tag text-slate-500">VISION PULSE</span>
          </div>
          <p className="font-display text-3xl text-sky">{MOCK_ORG.adhesion}%</p>
          <p className="text-slate-400 text-xs mt-1">Adhésion des équipes Q2 2026</p>
          <div className="mt-3 h-1 bg-bg rounded-full">
            <div className="h-full bg-sky rounded-full" style={{ width: `${MOCK_ORG.adhesion}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alertes critiques */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-rose" />
            <h2 className="text-white font-semibold text-sm">Alertes critiques</h2>
            <span className="font-mono text-xs bg-rose/10 text-rose px-2 py-0.5 rounded-full border border-rose/20">
              {MOCK_ALERTS.length}
            </span>
          </div>
          {MOCK_ALERTS.map((alert) => (
            <AlertCard
              key={alert.id}
              title={alert.title}
              description={alert.desc}
              severity={alert.severity}
            />
          ))}
        </div>

        {/* OKR Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald" />
              <h2 className="text-white font-semibold text-sm">OKR 2026</h2>
            </div>
            <button className="text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {MOCK_OKRS.map((okr, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-slate-300 text-xs truncate pr-2">{okr.title}</p>
                  <span className={`font-mono text-xs font-bold ${okr.on_track ? 'text-emerald' : 'text-rose'}`}>
                    {okr.progress}%
                  </span>
                </div>
                <div className="h-1 bg-bg rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${okr.progress}%`,
                      backgroundColor: okr.on_track ? '#10B981' : '#F43F5E',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analyse IA */}
      <AIInsightCard
        content={`L'organisation ${MOCK_ORG.name} présente un IAS de ${MOCK_ORG.ias_score}/100 avec une friction modérée. L'archétype INNOVATRICE requiert un renforcement des profils Initialiseurs (+8 pts). Les 3 postes non pourvus pénalisent la vélocité OKR. Priorité recommandée : recrutement Lead Product + Data Engineer avant fin Q3 2026.`}
      />
    </div>
  );
}
