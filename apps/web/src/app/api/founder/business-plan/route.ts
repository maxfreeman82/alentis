import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const schema = z.object({
  section: z.enum(['problem', 'solution', 'market', 'model', 'team', 'projections']),
  content: z.string().max(5000),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const supabase  = createServerClient();

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('workos_user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  // Récupérer le business_plan actuel pour merger
  const { data: founder } = await supabase
    .from('founders').select('id, business_plan').eq('profile_id', profile.id).maybeSingle();

  const currentBP = (founder?.business_plan ?? {}) as Record<string, string>;
  const updatedBP = { ...currentBP, [parsed.data.section]: parsed.data.content };

  const allSections  = ['problem', 'solution', 'market', 'model', 'team', 'projections'];
  const filledCount  = allSections.filter(s => updatedBP[s]?.trim()).length;
  const bizplanDone  = filledCount >= 4;

  if (founder?.id) {
    await supabase.from('founders').update({ business_plan: updatedBP, bizplan_done: bizplanDone }).eq('id', founder.id);
  } else {
    await supabase.from('founders').upsert({ profile_id: profile.id, business_plan: updatedBP, bizplan_done: bizplanDone }, { onConflict: 'profile_id' });
  }

  return NextResponse.json({ ok: true });
}
