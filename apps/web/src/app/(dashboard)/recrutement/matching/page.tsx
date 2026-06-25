import { withAuth } from '@workos-inc/authkit-nextjs';
import { SectionHeader, AIInsightCard, ScoreCircle } from '@/components/shared';
import { ScoreBreakdown } from '@/components/shared';
import { compute6DScore, scoreColor } from '@teranga/scoring';
import { cn } from '@/lib/utils';

// Données mock — candidats avec leurs scores 6D pour un poste donné
const JOB_TITLE = 'Lead Product Manager';

const MOCK_MATCHES = [
  {
    id: 'c1', name: 'Fatou Ndiaye', avatar: 'F',
    input: { hardSkills: 82, softSkills: 95, experience: 78, lifeScore: 70, energyFit: 90, stressRisk: 22 },
    strengths: ['Leadership naturel', 'Vision produit forte', 'Excellente communication'],
    risks:     ['Peu d\'expérience secteur fintech'],
    recommendation: 'Candidature fortement recommandée. Profil rare — leadership + vision produit + résilience.',
  },
  {
    id: 'c3', name: 'Aminata Diallo', avatar: 'A',
    input: { hardSkills: 75, softSkills: 88, experience: 85, lifeScore: 65, energyFit: 78, stressRisk: 35 },
    strengths: ['Expérience senior confirmée', 'Très bon historique livraison'],
    risks:     ['Risque départ sous 18 mois si pas d\'évolution', 'Attentes salariales élevées'],
    recommendation: 'Bon profil avec risque départ modéré. Proposer un plan de carrière dès l\'offre.',
  },
  {
    id: 'c2', name: 'Oumar Ba', avatar: 'O',
    input: { hardSkills: 68, softSkills: 72, experience: 60, lifeScore: 55, energyFit: 65, stressRisk: 55 },
    strengths: ['Bonne culture produit', 'Agile et adaptable'],
    risks:     ['Expérience insuffisante pour un rôle Lead', 'Stress élevé en période de crunch'],
    recommendation: 'Profil Junior Lead. Envisager un rôle PM Senior avec montée en compétence sur 12 mois.',
  },
];

export default async function MatchingPage() {
  await withAuth({ ensureSignedIn: true });

  const matchResults = MOCK_MATCHES.map((m) => ({
    ...m,
    result: compute6DScore(m.input),
  })).sort((a, b) => b.result.composite - a.result.composite);

  return (
    <div className="animate-fade-in space-y-6">
      <SectionHeader
        tag="RECRUTEMENT · MATCHING IA"
        tagColor="text-violet"
        title={`Matching — ${JOB_TITLE}`}
        subtitle="Classement des candidats par score 6D, analysé par l'IA Teranga Align"
      />

      <div className="space-y-4">
        {matchResults.map((match, rank) => {
          const hex = match.result.color === 'emerald' ? '#10B981'
                    : match.result.color === 'sky'     ? '#0EA5E9'
                    : match.result.color === 'amber'   ? '#F59E0B'
                    :                                    '#F43F5E';

          return (
            <div key={match.id} className="card border-l-4" style={{ borderLeftColor: hex }}>
              {/* En-tête candidat */}
              <div className="flex items-start gap-4 mb-4">
                {/* Rang */}
                <div className="w-7 h-7 rounded-full bg-bg-surface flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="font-mono text-xs font-bold text-slate-400">#{rank + 1}</span>
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: `${hex}20`, color: hex, border: `1px solid ${hex}40` }}
                >
                  {match.avatar}
                </div>

                {/* Nom + score */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold">{match.name}</p>
                  <p className="text-slate-400 text-xs">{JOB_TITLE}</p>
                </div>

                <ScoreCircle value={match.result.composite} size="md" label="Score 6D" />
              </div>

              {/* Décomposition 6D */}
              <ScoreBreakdown result={match.result} className="mb-4" />

              {/* Forces / Risques */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="section-tag text-emerald mb-2">FORCES</p>
                  <ul className="space-y-1">
                    {match.strengths.map((s, i) => (
                      <li key={i} className="text-slate-300 text-xs flex gap-1.5">
                        <span className="text-emerald">+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="section-tag text-rose mb-2">RISQUES</p>
                  <ul className="space-y-1">
                    {match.risks.map((r, i) => (
                      <li key={i} className="text-slate-300 text-xs flex gap-1.5">
                        <span className="text-rose">!</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommandation IA */}
              <AIInsightCard content={match.recommendation} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
