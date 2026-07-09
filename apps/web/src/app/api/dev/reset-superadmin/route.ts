import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPERADMIN_ID = '72fb5870-cf3c-40f4-9c0d-999aa4d57fc1';
const NEW_PASSWORD  = 'SuperAdmin2026!';

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.updateUserById(SUPERADMIN_ID, {
    password:      NEW_PASSWORD,
    email_confirm: true,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok:    true,
    email: data.user.email,
    id:    data.user.id,
  });
}
