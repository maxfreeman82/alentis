import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserClient } from '@/lib/supabase/user';

type Plan = 'starter' | 'growth' | 'enterprise';

function isPlan(v: unknown): v is Plan {
  return v === 'starter' || v === 'growth' || v === 'enterprise';
}

function isCertLevel(v: unknown): v is 1 | 2 | 3 | 4 {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

interface PatchBody {
  orgId: string;
  plan?: unknown;
  certLevel?: unknown;
}

export async function PATCH(req: NextRequest) {
  // Vérifier l'authentification via le client user
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Vérifier le rôle super_admin
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await req.json() as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { orgId, plan, certLevel } = body;

  if (!orgId || typeof orgId !== 'string') {
    return NextResponse.json({ error: 'orgId manquant' }, { status: 400 });
  }

  // Construire l'objet de mise à jour
  const updates: Record<string, Plan | number> = {};

  if (plan !== undefined) {
    if (!isPlan(plan)) {
      return NextResponse.json({ error: 'Plan invalide (starter|growth|enterprise)' }, { status: 400 });
    }
    updates['plan'] = plan;
  }

  if (certLevel !== undefined) {
    if (!isCertLevel(certLevel)) {
      return NextResponse.json({ error: 'cert_level invalide (1|2|3|4)' }, { status: 400 });
    }
    updates['cert_level'] = certLevel;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  const { error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
