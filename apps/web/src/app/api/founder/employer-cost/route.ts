import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { computeEmployerCost } from '@/lib/payroll/employer-cost';

const schema = z.object({
  gross_salary:   z.number().int().min(0).max(50000000),
  is_cadre:       z.boolean().default(false),
  accident_rate:  z.number().min(0).max(0.10).default(0.02),
  has_13th_month: z.boolean().default(false),
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

  const { data: founder } = await supabase
    .from('founders').select('id').eq('profile_id', profile.id).maybeSingle();

  const result = computeEmployerCost(parsed.data.gross_salary, {
    isCadre:      parsed.data.is_cadre,
    accidentRate: parsed.data.accident_rate,
    has13thMonth: parsed.data.has_13th_month,
  });

  const { error } = await supabase.from('employer_cost_simulations').insert({
    founder_id:        founder?.id ?? null,
    profile_id:        profile.id,
    gross_salary:      parsed.data.gross_salary,
    country:           'SN',
    is_cadre:          parsed.data.is_cadre,
    accident_rate:     parsed.data.accident_rate,
    has_13th_month:    parsed.data.has_13th_month,
    ipres_rg_employee: result.ipresRgEmployee,
    ir_employee:       result.ir,
    trimf_employee:    result.trimf,
    net_salary:        result.netSalary,
    ipres_rg_employer: result.ipresRgEmployer,
    ipres_rc_employer: result.ipresRcEmployer,
    css_employer:      result.cssEmployer,
    fdfp_employer:     result.fdfpEmployer,
    total_cost:        result.totalCost,
    total_cost_annual: result.totalCostAnnual,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, result });
}
