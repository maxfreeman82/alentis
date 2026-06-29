import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { computeFounderArchetype } from '@/lib/founder/archetypes';
import { FOUNDER_ARCHETYPE_META } from '@/lib/founder/archetypes';
import Anthropic from '@anthropic-ai/sdk';

const schema = z.object({
  responses: z.record(z.string(), z.enum(['A', 'B', 'C', 'D', 'E'])),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const supabase  = createServerClient();

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Récupérer le profile
  const { data: profile } = await supabase
    .from('profiles').select('id').eq('workos_user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const { archetype, scores, confidence } = computeFounderArchetype(parsed.data.responses);
  const meta = FOUNDER_ARCHETYPE_META[archetype];

  // Générer l'énoncé de vision avec Claude
  let vision_statement = `Vous êtes un ${meta.label}. ${meta.tagline} Votre mission est de construire quelque chose d'aligné avec vos forces naturelles.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 200,
      system:     `Expert en entrepreneuriat africain. Génère un énoncé de vision court (2-3 phrases) pour un fondateur de type ${archetype} au Sénégal. Inspirant, ancré dans le contexte africain, personnel. Pas de cliché. Utilise "vous".`,
      messages:   [{ role: 'user', content: `Archétype : ${archetype}. Traits : ${meta.strengths.join(', ')}. Énergie : ${meta.energyFamily}. Génère l'énoncé de vision.` }],
    });
    if (msg.content[0]?.type === 'text') vision_statement = msg.content[0].text;
  } catch {
    // Fallback si Claude échoue — l'essentiel est sauvegardé
  }

  // Upsert dans founders
  const { error } = await supabase.from('founders').upsert(
    {
      profile_id:       profile.id,
      archetype,
      archetype_scores: scores,
      confidence,
      vision_statement,
      founder_responses: parsed.data.responses,
      boussole_done:    true,
      stage:            'idea',
    },
    { onConflict: 'profile_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, archetype, confidence });
}
