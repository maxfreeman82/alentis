import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { getUserOrg } from '@/lib/supabase/auth';

const createSchema = z.object({
  quarter:         z.number().int().min(1).max(4),
  year:            z.number().int().min(2020).max(2100),
  participant_ids: z.array(z.string().uuid()).min(2),
});

const patchSchema = z.object({
  sessionId: z.string().uuid(),
  action:    z.enum(['launch', 'close', 'aggregate', 'consolidate']),
});

export async function POST(req: Request) {
  const user = await requireAuth();

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });
  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: myProfile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).maybeSingle();

  const { data, error } = await supabase.from('tdt_sessions').insert({
    organization_id:  organizationId,
    quarter:          parsed.data.quarter,
    year:             parsed.data.year,
    participant_ids:  parsed.data.participant_ids,
    status:           'draft',
    created_by:       myProfile?.id ?? null,
  }).select('id').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sessionId: data?.id });
}

export async function PATCH(req: Request) {
  const user = await requireAuth();

  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });
  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, action } = parsed.data;

  // Vérifier que la session appartient à l'org
  const { data: session } = await supabase
    .from('tdt_sessions').select('*').eq('id', sessionId).eq('organization_id', organizationId).maybeSingle();
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  if (action === 'launch') {
    if (session.status !== 'draft') return NextResponse.json({ error: 'Déjà lancée' }, { status: 409 });
    await supabase.from('tdt_sessions').update({ status: 'active', launched_at: new Date().toISOString() }).eq('id', sessionId);
  }

  if (action === 'close') {
    if (session.status !== 'active') return NextResponse.json({ error: 'Pas active' }, { status: 409 });
    await supabase.from('tdt_sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', sessionId);
  }

  if (action === 'aggregate') {
    if (session.status !== 'closed') return NextResponse.json({ error: 'Pas clôturée' }, { status: 409 });
    // Déléguer à la route dédiée d'agrégation
    const aggRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tour-de-table/aggregate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') ?? '' },
      body:    JSON.stringify({ sessionId }),
    });
    if (!aggRes.ok) return NextResponse.json({ error: 'Erreur d\'agrégation' }, { status: 500 });
  }

  if (action === 'consolidate') {
    const conRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tour-de-table/consolidate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') ?? '' },
      body:    JSON.stringify({ sessionId }),
    });
    if (!conRes.ok) return NextResponse.json({ error: 'Erreur de consolidation' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
