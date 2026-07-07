import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { TDT_ALL_ITEM_KEYS, computeDimensionScore, computeGlobalObservedScore } from '@/lib/tour-de-table/dimensions';
import { runObservationGuards, guard5HaloDetection } from '@/lib/tour-de-table/safety-guards';

// Schéma dynamique — toutes les 21 clés sont des entiers 1-5
const responsesSchema = z.object(
  Object.fromEntries(TDT_ALL_ITEM_KEYS.map(k => [k, z.number().int().min(1).max(5)]))
) as z.ZodObject<Record<string, z.ZodNumber>>;

const schema = z.object({
  session_id:  z.string().uuid(),
  observed_id: z.string().uuid(),
  responses:   responsesSchema,
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const supabase  = createServerClient();

  const { data: myProfile } = await supabase
    .from('profiles').select('id, organization_id').eq('user_id', user.id).maybeSingle();
  if (!myProfile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { session_id, observed_id, responses } = parsed.data;

  // Garde 4 : auto-observation
  if (myProfile.id === observed_id) {
    return NextResponse.json({ error: 'Auto-observation interdite' }, { status: 400 });
  }

  // Vérifier que la session est active et que les deux profils en font partie
  const { data: session } = await supabase
    .from('tdt_sessions')
    .select('status, participant_ids, organization_id')
    .eq('id', session_id)
    .maybeSingle();

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'Session non active' }, { status: 400 });
  }

  const participants = (session.participant_ids as string[]) ?? [];
  if (!participants.includes(myProfile.id) || !participants.includes(observed_id)) {
    return NextResponse.json({ error: 'Participant introuvable dans la session' }, { status: 400 });
  }

  // Garde 5 : halo/anti-halo
  const scores      = TDT_ALL_ITEM_KEYS.map(k => responses[k] ?? 0);
  const haloGuard   = guard5HaloDetection(scores);
  const is_flagged_halo = !haloGuard.passed;

  const { error } = await supabase.from('tdt_observations').upsert({
    session_id,
    organization_id:    session.organization_id as string,
    observer_id:        myProfile.id,
    observed_id,
    is_flagged_outlier: false,
    is_flagged_halo,
    f1: responses['f1'] ?? null, f2: responses['f2'] ?? null, f3: responses['f3'] ?? null,
    c1: responses['c1'] ?? null, c2: responses['c2'] ?? null, c3: responses['c3'] ?? null,
    k1: responses['k1'] ?? null, k2: responses['k2'] ?? null, k3: responses['k3'] ?? null,
    i1: responses['i1'] ?? null, i2: responses['i2'] ?? null, i3: responses['i3'] ?? null,
    a1: responses['a1'] ?? null, a2: responses['a2'] ?? null, a3: responses['a3'] ?? null,
    p1: responses['p1'] ?? null, p2: responses['p2'] ?? null, p3: responses['p3'] ?? null,
    b1: responses['b1'] ?? null, b2: responses['b2'] ?? null, b3: responses['b3'] ?? null,
  }, { onConflict: 'session_id,observer_id,observed_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, flagged: is_flagged_halo });
}
