import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/auth/signup
// Crée le compte avec email_confirm: true (pas d'OTP requis)
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.includes('already registered') || error.message.includes('already been registered')
      ? 'Ce compte existe déjà. Connectez-vous.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
