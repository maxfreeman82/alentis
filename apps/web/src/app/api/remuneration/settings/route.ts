import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';

const upsertSchema = z.object({
  profile_id:          z.string().uuid(),
  salaire_brut:        z.number().positive(),
  situation:           z.enum(['celibataire', 'marie', 'marie_1', 'marie_2', 'marie_3']).default('celibataire'),
  enfants:             z.number().int().min(0).max(20).default(0),
  sector_risk:         z.enum(['low', 'medium', 'high']).default('low'),
  primes_mensuelles:   z.number().min(0).default(0),
  avantages_nature:    z.number().min(0).default(0),
  retenue_prevoyance:  z.number().min(0).default(0),
  est_cadre:           z.boolean().default(false),
  date_embauche:       z.string().optional(),
});

export async function GET() {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const { data, error } = await supabase
    .from('payroll_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const { supabase, organizationId } = ctx;

  const body   = await req.json() as unknown;
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Vérifier que le profil appartient à l'organisation
  const { data: profile } = await supabase
    .from('profiles').select('id').eq('id', parsed.data.profile_id).eq('organization_id', organizationId).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const { data, error } = await supabase
    .from('payroll_settings')
    .upsert({
      organization_id:     organizationId,
      profile_id:          parsed.data.profile_id,
      salaire_brut:        parsed.data.salaire_brut,
      situation:           parsed.data.situation,
      enfants:             parsed.data.enfants,
      sector_risk:         parsed.data.sector_risk,
      primes_mensuelles:   parsed.data.primes_mensuelles,
      avantages_nature:    parsed.data.avantages_nature,
      retenue_prevoyance:  parsed.data.retenue_prevoyance,
      est_cadre:           parsed.data.est_cadre,
      date_embauche:       parsed.data.date_embauche ?? null,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'organization_id,profile_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ setting: data }, { status: 201 });
}
