import { requireAuth } from '@/lib/supabase/user';
import { notFound } from 'next/navigation';
import {
  ScoreCircle,
  ScoreBreakdown,
  AIInsightCard,
  CertBadge,
} from '@/components/shared';
import { compute6DScore } from '@teranga/scoring';
import type { CertLevel } from '@teranga/types';
import { ENERGY_FAMILIES, type EnergyFamilyId } from '@/lib/passport/assessment';

interface MockPassport {
  name: string; role: string; dept: string; level: string;
  hardSkills: number; softSkills: number; experience: number;
  lifeScore: number; energyFit: number; stressRisk: number;
  energy: Record<EnergyFamilyId, number>;
  softDetails: Record<string, number>;
  certLevel: CertLevel;
  aiSummary: string;
}

// Données mock — 1=Alignée, 2=Engagée, 3=Exemplaire, 4=Transformatrice
const MOCK_PASSPORTS: Record<string, MockPassport> = {
  'TP-SN-001': {
    name: 'Fatou Ndiaye', role: 'Lead Product Manager', dept: 'Produit', level: 'C5',
    hardSkills: 82, softSkills: 90, experience: 78, lifeScore: 70, energyFit: 91, stressRisk: 18,
    energy: { pilotes: 18, initialiseurs: 22, accomplisseurs: 28, dynamiseurs: 16, regulateurs: 16 },
    softDetails: {
      Communication: 92, Leadership: 85, Adaptabilité: 88, Résolution: 84,
      'Pensée critique': 78, Collaboration: 95, 'Gestion stress': 82, Organisation: 79,
      Apprentissage: 88, 'Intelligence émotionnelle': 90,
    },
    certLevel: 4,
    aiSummary: 'Profil exceptionnel à forte énergie Accomplisseurs. Finisseuse naturelle avec un sens du collectif rare. Idéale pour des rôles Lead nécessitant exécution + empathie équipe. Risque départ très faible — fort engagement.',
  },
  'TP-SN-006': {
    name: 'Aissatou Camara', role: 'UX Designer', dept: 'Produit', level: 'C5',
    hardSkills: 85, softSkills: 88, experience: 74, lifeScore: 72, energyFit: 90, stressRisk: 20,
    energy: { pilotes: 14, initialiseurs: 32, accomplisseurs: 20, dynamiseurs: 22, regulateurs: 12 },
    softDetails: {
      Communication: 88, Leadership: 72, Adaptabilité: 92, Résolution: 90,
      'Pensée critique': 86, Collaboration: 88, 'Gestion stress': 80, Organisation: 74,
      Apprentissage: 94, 'Intelligence émotionnelle': 87,
    },
    certLevel: 3,
    aiSummary: 'Profil Initialiseur dominant avec forte créativité. Excellente capacité d\'apprentissage — s\'approprie vite de nouveaux outils design. Son énergie Dynamiseurs la rend précieuse dans les ateliers co-création.',
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PassportPage({ params }: PageProps) {
  await requireAuth();
  const { id } = await params;

  const passport = MOCK_PASSPORTS[id];
  if (!passport) notFound();

  const result = compute6DScore({
    hardSkills: passport.hardSkills,
    softSkills: passport.softSkills,
    experience: passport.experience,
    lifeScore:  passport.lifeScore,
    energyFit:  passport.energyFit,
    stressRisk: passport.stressRisk,
  });

  const families: EnergyFamilyId[] = ['pilotes', 'initialiseurs', 'accomplisseurs', 'dynamiseurs', 'regulateurs'];
  const dominantFamily = families.reduce((a, b) =>
    (passport.energy[a] ?? 0) >= (passport.energy[b] ?? 0) ? a : b
  );
  const dominantMeta = ENERGY_FAMILIES[dominantFamily];

  return (
    <div className="animate-fade-in space-y-6">
      {/* En-tête Passport */}
      <div className="card">
        <div className="flex items-start gap-5">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0"
            style={{
              backgroundColor: `${dominantMeta?.color ?? '#10B981'}18`,
              color: dominantMeta?.color ?? '#10B981',
              border: `1.5px solid ${dominantMeta?.color ?? '#10B981'}40`,
            }}
          >
            {passport.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-slate-900 font-bold text-xl">{passport.name}</h1>
              <CertBadge level={passport.certLevel} />
            </div>
            <p className="text-slate-400 text-sm">{passport.role} · {passport.dept}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `${dominantMeta?.color ?? '#10B981'}18`,
                  color: dominantMeta?.color ?? '#10B981',
                }}
              >
                {dominantMeta?.label ?? dominantFamily} dominant
              </span>
              <span className="font-mono text-xs text-slate-500">Niveau {passport.level}</span>
              <span className="font-mono text-xs text-slate-500">#{id}</span>
            </div>
          </div>

          <ScoreCircle value={result.composite} size="lg" label="Score 6D" />
        </div>
      </div>

      {/* Décomposition 6D */}
      <div>
        <p className="section-tag text-emerald mb-3">SCORE 6D DÉTAILLÉ</p>
        <ScoreBreakdown result={result} />
      </div>

      {/* Profil énergétique */}
      <div>
        <p className="section-tag text-violet mb-3">PROFIL ÉNERGÉTIQUE</p>
        <div className="card space-y-3">
          {families.map((fid) => {
            const meta = ENERGY_FAMILIES[fid];
            return (
              <div key={fid}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 text-xs font-medium">{meta?.label}</span>
                  <span className="font-mono text-xs text-slate-400">{passport.energy[fid]}%</span>
                </div>
                <div className="h-2 bg-bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${passport.energy[fid]}%`, backgroundColor: meta?.color ?? '#64748B' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Soft skills */}
      <div>
        <p className="section-tag text-sky mb-3">COMPÉTENCES COMPORTEMENTALES</p>
        <div className="card">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(passport.softDetails).map(([skill, score]) => (
              <div key={skill}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 text-[11px]">{skill}</span>
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{ color: score >= 80 ? '#10B981' : score >= 70 ? '#0EA5E9' : score >= 60 ? '#F59E0B' : '#F43F5E' }}
                  >
                    {score}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${score}%`,
                      backgroundColor: score >= 80 ? '#10B981' : score >= 70 ? '#0EA5E9' : score >= 60 ? '#F59E0B' : '#F43F5E',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Synthèse IA */}
      <div>
        <p className="section-tag text-amber mb-3">SYNTHÈSE TERANGA ALIGN IA</p>
        <AIInsightCard content={passport.aiSummary} />
      </div>
    </div>
  );
}
