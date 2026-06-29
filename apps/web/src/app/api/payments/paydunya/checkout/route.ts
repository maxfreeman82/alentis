import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserOrg } from '@/lib/supabase/auth';
import { createCheckout } from '@/lib/paydunya';

const PLANS = {
  pro:        { amount: 50000,  label: 'Teranga Align Pro — 1 mois' },
  enterprise: { amount: 150000, label: 'Teranga Align Enterprise — 1 mois' },
} as const;

const BodySchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
});

export async function POST(req: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const ctx = await getUserOrg(user.id);
  if (!ctx) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });

  const { plan }    = parsed.data;
  const planInfo    = PLANS[plan];
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const checkout = await createCheckout({
    amount:      planInfo.amount,
    description: planInfo.label,
    organizationId: ctx.organizationId,
    plan,
    returnUrl:   `${appUrl}/abonnement?status=success`,
    cancelUrl:   `${appUrl}/abonnement?status=cancel`,
    callbackUrl: `${appUrl}/api/payments/paydunya/callback`,
  });

  if (checkout.response_code !== '00') {
    return NextResponse.json({ error: checkout.response_text }, { status: 502 });
  }

  // Paiement en attente
  await ctx.supabase.from('payments').insert({
    organization_id: ctx.organizationId,
    amount_fcfa:     planInfo.amount,
    gateway:         'paydunya',
    status:          'pending',
    paydunya_token:  checkout.token,
    payment_method:  'paydunya',
    metadata:        { plan } as unknown,
  });

  return NextResponse.json({ checkout_url: checkout.invoice_url, token: checkout.token });
}
