import { requireAuth } from '@/lib/supabase/user';
import { computePayroll, type FamilySituation } from '@/lib/remuneration/payroll';
import { createServerClient, setOrgContext } from '@/lib/supabase/server';
import { z } from 'zod';

const BodySchema = z.object({
  organizationId:  z.string().uuid(),
  profileId:       z.string().uuid(),
  month:           z.number().min(1).max(12),
  year:            z.number().min(2024).max(2030),
  salaireBrut:     z.number().positive(),
  situation:       z.enum(['celibataire', 'marie', 'marie_1', 'marie_2', 'marie_3']),
  enfants:         z.number().min(0).max(20),
  sectorRisk:      z.enum(['low', 'medium', 'high']),
  primes:          z.number().min(0).default(0),
  avantagesNature: z.number().min(0).default(0),
  retenuePrevoy:   z.number().min(0).default(0),
});

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
  }

  const { organizationId, profileId, month, year, ...payInput } = parsed.data;

  // Calcul bulletin
  const result = computePayroll({
    ...payInput,
    situation: payInput.situation as FamilySituation,
  });

  // Sauvegarde Supabase
  const supabase = createServerClient();
  await setOrgContext(supabase, organizationId);

  const { data, error } = await supabase
    .from('payslips')
    .upsert({
      profile_id:       profileId,
      organization_id:  organizationId,
      month,
      year,
      base_salary:      result.salaireBrut,
      bonuses:          result.input.primes,
      gross_total:      result.totalBrut,
      net_salary:       result.salaireNet,
      retenues:         result.totalRetenues,
      irpp:             result.irppMensuel,
      charges_patronal: result.totalChargesPatronal,
      cout_employeur:   result.coutEmployeur,
      details:          result,
    }, { onConflict: 'profile_id,month,year' })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: 'Erreur base de données', details: error.message }, { status: 500 });
  }

  return Response.json({ payslip_id: data.id, ...result });
}
