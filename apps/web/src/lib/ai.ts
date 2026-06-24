import Anthropic from '@anthropic-ai/sdk';

// RÈGLE : toutes les fonctions IA sont server-side uniquement
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

// 1. Parsing CV
export async function parseCV(cvText: string) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: `Expert RH africain. Extrais compétences, expériences du CV.
             Réponds UNIQUEMENT en JSON valide, sans markdown.`,
    messages: [{
      role: 'user',
      content: `CV:\n\n${cvText}\n\nJSON attendu:
      {"hard_skills":[{"name":string,"level":1-5,"recency_months":number}],
       "experience_years":number,"education":string,"languages":string[]}`,
    }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
  return JSON.parse(text) as Record<string, unknown>;
}

// 2. Classification vision -> archétype
export async function classifyVision(responses: Record<string, unknown>) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: `Expert en stratégie d'entreprise africaine. Analyse le questionnaire de vision.
             Réponds UNIQUEMENT en JSON valide, sans markdown.`,
    messages: [{
      role: 'user',
      content: `Réponses:\n${JSON.stringify(responses)}\n\nJSON attendu:
      {"archetype":"CONQUERANTE|INNOVATRICE|CONSOLIDATRICE|TRANSFORMATRICE|PERENNE",
       "confidence":0-100,"vision_statement":"string","key_insights":["...","...","..."]}`,
    }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
  return JSON.parse(text) as {
    archetype: string;
    confidence: number;
    vision_statement: string;
    key_insights: string[];
  };
}

// 3. Analyse évaluation trimestrielle
export async function analyzeEvaluation(
  evaluation: Record<string, number>,
  passport: Record<string, number>,
  previousQuarters: Record<string, number>[]
) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: `Expert RH. Analyse l'évaluation trimestrielle et compare avec le Talent Passport.
             Réponds en JSON.`,
    messages: [{
      role: 'user',
      content: `Évaluation Q actuel: ${JSON.stringify(evaluation)}
Passport prédit: ${JSON.stringify(passport)}
Historique Q: ${JSON.stringify(previousQuarters)}

JSON:
{"correlation_score":0-100,"departure_risk":0-100,
 "alerts":["..."],"ai_analysis":"string","recommendations":["..."]}`,
    }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
  return JSON.parse(text) as {
    correlation_score: number;
    departure_risk: number;
    alerts: string[];
    ai_analysis: string;
    recommendations: string[];
  };
}

// 4. Recommandation recrutement
export async function recommendCandidate(
  job: Record<string, unknown>,
  passport: Record<string, unknown>,
  teamContext: Record<string, unknown>
) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: `Expert en recrutement africain. Analyse le fit candidat-poste en contexte africain.
             Réponds en JSON.`,
    messages: [{
      role: 'user',
      content: `Poste: ${JSON.stringify(job)}
Passport candidat: ${JSON.stringify(passport)}
Contexte équipe: ${JSON.stringify(teamContext)}

JSON:
{"fit_score":0-100,"strengths":["..."],"risks":["..."],"recommendation":"string"}`,
    }],
  });
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
  return JSON.parse(text) as {
    fit_score: number;
    strengths: string[];
    risks: string[];
    recommendation: string;
  };
}
