import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { confirmCheckout } from '@/lib/paydunya';

const PLAN_AMOUNTS: Record<string, number> = {
  pro:        50000,
  enterprise: 150000,
};

export async function POST(req: Request) {
  const body = await req.json() as { data?: { hash?: string } };
  const token = body.data?.hash;
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

  // Vérification auprès de PayDunya — ne pas faire confiance au body seul
  const confirmed = await confirmCheckout(token);
  if (confirmed.status !== 'completed') {
    return NextResponse.json({ ok: false, status: confirmed.status });
  }

  const { organization_id, plan } = confirmed.custom_data;
  if (!organization_id || !plan) {
    return NextResponse.json({ error: 'custom_data manquant' }, { status: 400 });
  }

  const admin      = createAdminClient();
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  await Promise.all([
    admin.from('payments').update({ status: 'completed' }).eq('paydunya_token', token),
    admin.from('subscriptions').upsert({
      organization_id,
      plan,
      status:          'active',
      amount_fcfa:     PLAN_AMOUNTS[plan] ?? 0,
      paydunya_token:  token,
      next_billing:    nextBilling.toISOString(),
    }, { onConflict: 'organization_id' }),
  ]);

  return NextResponse.json({ ok: true });
}
