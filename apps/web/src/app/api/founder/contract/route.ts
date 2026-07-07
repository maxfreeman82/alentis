import { requireAuth } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const schema = z.object({
  employee_name:  z.string().min(2).max(100),
  employee_role:  z.string().min(2).max(100),
  contract_type:  z.enum(['CDI', 'CDD', 'STAGE', 'FREELANCE']).default('CDI'),
  start_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gross_salary:   z.number().int().min(75000),
  trial_months:   z.number().int().min(0).max(6).default(1),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  const supabase  = createServerClient();

  const body   = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  const { data: founder } = await supabase
    .from('founders').select('id').eq('profile_id', profile.id).maybeSingle();

  const { data, error } = await supabase.from('founder_contracts').insert({
    founder_id:     founder?.id ?? null,
    profile_id:     profile.id,
    employee_name:  parsed.data.employee_name,
    employee_role:  parsed.data.employee_role,
    contract_type:  parsed.data.contract_type,
    start_date:     parsed.data.start_date,
    end_date:       parsed.data.end_date ?? null,
    gross_salary:   parsed.data.gross_salary,
    trial_months:   parsed.data.trial_months,
  }).select('id').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mettre à jour le stage fondateur si premier contrat
  if (founder?.id) {
    await supabase.from('founders').update({ first_hire_done: true, stage: 'first_hire' }).eq('id', founder.id);
  }

  return NextResponse.json({ ok: true, contractId: data?.id });
}

export async function PATCH(req: Request) {
  const user = await requireAuth();
  const supabase  = createServerClient();

  const { contractId, signed } = await req.json() as { contractId: string; signed: boolean };
  if (!contractId) return NextResponse.json({ error: 'contractId requis' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });

  // Vérifier que le contrat appartient au profil
  const { data: contract } = await supabase
    .from('founder_contracts').select('id').eq('id', contractId).eq('profile_id', profile.id).maybeSingle();
  if (!contract) return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });

  await supabase.from('founder_contracts').update({
    signed,
    signed_at: signed ? new Date().toISOString() : null,
  }).eq('id', contractId);

  return NextResponse.json({ ok: true });
}
