import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

const schema = z.object({
  section:     z.enum(['problem', 'solution', 'market', 'model', 'team', 'projections']),
  archetype:   z.string().nullable(),
  currentPlan: z.record(z.string(), z.string()),
});

const SECTION_PROMPTS: Record<string, string> = {
  problem:     'Aide à formuler clairement le problème résolu et la douleur client au Sénégal/Afrique de l\'Ouest.',
  solution:    'Aide à décrire la solution et sa différenciation dans le contexte africain.',
  market:      'Aide à segmenter le marché local, estimer la TAM/SAM/SOM pour une startup sénégalaise.',
  model:       'Aide à définir le modèle économique adapté (mobile money, freemium, B2B…).',
  team:        'Aide à présenter l\'équipe avec les compétences clés et les gaps à combler.',
  projections: 'Génère des projections financières 3 ans réalistes pour une startup africaine en phase early-stage.',
};

export async function POST(req: Request) {
  await requireAuth();

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { section, archetype, currentPlan } = parsed.data;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextBP = Object.entries(currentPlan)
    .filter(([k, v]) => k !== section && v?.trim())
    .map(([k, v]) => `**${k}**: ${v}`)
    .join('\n');

  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 400,
    system:     `Expert en entrepreneuriat africain (Sénégal, UEMOA). ${archetype ? `Le fondateur est de type ${archetype}.` : ''} ${SECTION_PROMPTS[section] ?? ''} Réponds en français, style direct et concret. Maximum 200 mots.`,
    messages:   [{
      role:    'user',
      content: `${contextBP ? `Contexte du business plan:\n${contextBP}\n\n` : ''}Génère le contenu pour la section "${section}".`,
    }],
  });

  const content = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
  return NextResponse.json({ content });
}
