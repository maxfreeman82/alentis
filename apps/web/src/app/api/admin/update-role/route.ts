import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUserClient } from '@/lib/supabase/user';

type Role =
  | 'org_admin'
  | 'org_manager'
  | 'org_hr'
  | 'org_recruiter'
  | 'org_employee'
  | 'talent_free'
  | 'super_admin';

const VALID_ROLES: readonly Role[] = [
  'org_admin',
  'org_manager',
  'org_hr',
  'org_recruiter',
  'org_employee',
  'talent_free',
  'super_admin',
] as const;

function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (VALID_ROLES as readonly string[]).includes(v);
}

interface PatchBody {
  profileId: string;
  role: unknown;
}

export async function PATCH(req: NextRequest) {
  // Authentification
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Vérifier super_admin
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

  const { profileId, role } = body;

  if (!profileId || typeof profileId !== 'string') {
    return NextResponse.json({ error: 'profileId manquant' }, { status: 400 });
  }

  if (!isRole(role)) {
    return NextResponse.json(
      { error: `Rôle invalide. Valeurs acceptées : ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
