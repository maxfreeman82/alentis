import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL    = 'niangm.mouhamadou@gmail.com';
const PASSWORD = 'SuperAdmin2026!';

export async function GET() {
  const admin = createAdminClient();

  // 1. Supprimer l'ancien auth.user (CASCADE supprimera le profile)
  const { error: delErr } = await admin.auth.admin.deleteUser(
    '72fb5870-cf3c-40f4-9c0d-999aa4d57fc1',
  );
  if (delErr && !delErr.message.includes('not found'))
    return NextResponse.json({ step: 'delete', error: delErr.message }, { status: 500 });

  // 2. Recréer via GoTrue SDK
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email:         EMAIL,
    password:      PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: 'Mouhamadou', last_name: 'Niang' },
  });
  if (createErr)
    return NextResponse.json({ step: 'create', error: createErr.message }, { status: 500 });

  const newId = created.user.id;

  // 3. Recréer le profile super_admin (cascade l'a supprimé)
  const { error: profileErr } = await admin.from('profiles').insert({
    user_id:              newId,
    email:                EMAIL,
    role:                 'super_admin',
    first_name:           'Mouhamadou',
    last_name:            'Niang',
    organization_id:      null,
    onboarding_completed: true,
  });
  if (profileErr)
    return NextResponse.json({ step: 'profile', error: profileErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, email: EMAIL, new_id: newId });
}
