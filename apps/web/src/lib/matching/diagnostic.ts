import Anthropic from '@anthropic-ai/sdk';
import { compute6DScore } from '@teranga/scoring';
import type { Score6DResult } from '@teranga/scoring';

export interface DiagnosticGap {
  dimension: 'H' | 'S' | 'X' | 'L' | 'E' | 'R';
  label: string;
  talentScore: number;
  requiredScore: number;
  gap: number;
  trainingHint: string;
}

export interface PreApplicationDiagnostic {
  jobId: string;
  jobTitle: string;
  company: string;
  score6D: Score6DResult;
  gaps: DiagnosticGap[];
  strengths: string[];
  recommendation: string;
  trainingRecommendations: string[];
  verdict: 'apply_now' | 'train_first' | 'improve_profile';
}

export type PassportScores = {
  score_hard?: number | null;
  score_soft?: number | null;
  score_exp?: number | null;
  score_life?: number | null;
  score_energy?: number | null;
  score_risk?: number | null;
  dominant_profile?: string | null;
  energy_level?: string | null;
};

export type JobRequirements = {
  id: string;
  title: string;
  company_name: string;
  description?: string | null;
  min_score_global?: number | null;
  min_score_hard?: number | null;
  min_score_soft?: number | null;
};

const DIM_LABELS: Record<string, string> = {
  H: 'Hard Skills', S: 'Soft Skills', X: 'Expérience',
  L: 'Life Score',  E: 'Énergie',     R: 'Stress',
};

function buildStaticStrengths(r: Score6DResult): string[] {
  const s: string[] = [];
  if (r.breakdown.H >= 70) s.push('Solides compétences techniques');
  if (r.breakdown.S >= 70) s.push('Excellent profil comportemental');
  if (r.breakdown.X >= 70) s.push('Expérience confirmée');
  if (r.breakdown.E >= 70) s.push("Haut niveau d'énergie");
  if (r.breakdown.R <= 35) s.push('Grande résistance au stress');
  if (r.composite >= 75)   s.push('Profil très aligné au marché');
  return s.length > 0 ? s.slice(0, 3) : ['Profil à potentiel, à développer'];
}

export async function computeDiagnostic(params: {
  passport: PassportScores;
  job: JobRequirements;
}): Promise<PreApplicationDiagnostic> {
  const { passport, job } = params;

  const t = {
    H: passport.score_hard   ?? 50,
    S: passport.score_soft   ?? 50,
    X: passport.score_exp    ?? 50,
    L: passport.score_life   ?? 50,
    E: passport.score_energy ?? 50,
    R: passport.score_risk   ?? 50,
  };

  const score6D = compute6DScore({
    hardSkills: t.H, softSkills: t.S, experience: t.X,
    lifeScore:  t.L, energyFit:  t.E, stressRisk: t.R,
  });

  // Seuils requis dérivés du poste (avec fallback à 60)
  const req = {
    H: job.min_score_hard   ?? job.min_score_global ?? 60,
    S: job.min_score_soft   ?? job.min_score_global ?? 60,
    X: job.min_score_global ?? 60,
    L: 45,
    E: 45,
    R: 60,
  };

  // R est inverse : gap si le talent a un risque stress > seuil
  const gaps: DiagnosticGap[] = (Object.keys(t) as (keyof typeof t)[])
    .filter(d => d === 'R' ? t[d] > req[d] : t[d] < req[d])
    .map(d => ({
      dimension: d,
      label: DIM_LABELS[d] ?? d,
      talentScore:   t[d],
      requiredScore: req[d],
      gap: d === 'R' ? t[d] - req[d] : req[d] - t[d],
      trainingHint:  '',
    }));

  const prompt = `Expert RH Teranga Align. Génère un diagnostic JSON de compatibilité talent/poste.

TALENT (scores /100) : H=${t.H} S=${t.S} X=${t.X} L=${t.L} E=${t.E} R=${t.R}
Score 6D composite : ${score6D.composite}/100${passport.dominant_profile ? ` | Profil: ${passport.dominant_profile}` : ''}
POSTE : ${job.title} chez ${job.company_name}${job.description ? ` — ${job.description.slice(0, 300)}` : ''}
SEUILS REQUIS : H≥${req.H} S≥${req.S} X≥${req.X}
GAPS DÉTECTÉS : ${gaps.length > 0 ? gaps.map(g => `${g.label}(${g.talentScore}→${g.requiredScore})`).join(', ') : 'aucun gap'}

Réponds UNIQUEMENT en JSON valide :
{
  "recommendation": "phrase courte estimant les chances (ex: '74% de chances d'atteindre la shortlist')",
  "strengths": ["force courte 1", "force courte 2", "force courte 3"],
  "gapTrainings": {"H":"nom formation ou null","S":"...","X":"...","L":"...","E":"...","R":"..."},
  "trainingRecommendations": ["formation prioritaire 1", "formation prioritaire 2"],
  "verdict": "apply_now"
}
Règle verdict : apply_now si composite≥70, train_first si 55–69, improve_profile si <55.`;

  type AiResult = {
    recommendation: string;
    strengths: string[];
    gapTrainings: Partial<Record<string, string | null>>;
    trainingRecommendations: string[];
    verdict: 'apply_now' | 'train_first' | 'improve_profile';
  };

  let aiResult: AiResult | null = null;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    const m   = raw.match(/\{[\s\S]*\}/);
    if (m) aiResult = JSON.parse(m[0]) as AiResult;
  } catch { /* fallback aux valeurs statiques */ }

  return {
    jobId:    job.id,
    jobTitle: job.title,
    company:  job.company_name,
    score6D,
    gaps: gaps.map(g => ({
      ...g,
      trainingHint: aiResult?.gapTrainings?.[g.dimension] ?? '',
    })),
    strengths:               aiResult?.strengths               ?? buildStaticStrengths(score6D),
    recommendation:          aiResult?.recommendation          ?? `${score6D.composite}% de compatibilité estimée`,
    trainingRecommendations: aiResult?.trainingRecommendations ?? [],
    verdict: aiResult?.verdict ?? (
      score6D.composite >= 70 ? 'apply_now' :
      score6D.composite >= 55 ? 'train_first' :
      'improve_profile'
    ),
  };
}
