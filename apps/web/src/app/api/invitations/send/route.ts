import { type NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/invitations/send
// Corps : { emails: string[] | string, role?: string, first_name?: string, last_name?: string }
// Auth  : org_admin ou org_hr (manage:jobs couvre les droits RH)
export async function POST(req: NextRequest) {
  const { ctx, error: authErr } = await checkPermission('manage:jobs');
  if (authErr) return authErr;

  let body: {
    emails?: unknown;
    role?: string;
    first_name?: string;
    last_name?: string;
  };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }); }

  const rawEmails = body.emails;
  const emailList: string[] = Array.isArray(rawEmails)
    ? (rawEmails as unknown[]).filter((e): e is string => typeof e === 'string')
    : typeof rawEmails === 'string'
      ? [rawEmails]
      : [];

  if (emailList.length === 0) {
    return NextResponse.json({ error: 'Au moins un email requis' }, { status: 400 });
  }
  if (emailList.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 invitations à la fois' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = emailList.filter(e => !emailRegex.test(e));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Emails invalides : ${invalid.join(', ')}` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Récupérer l'org du caller
  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', ctx.profileId)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });
  }

  const organizationId = profile.organization_id;
  const role = body.role ?? 'org_employee';

  // Supprimer les doublons et les invitations pending déjà existantes pour ces emails
  const { data: existing } = await admin
    .from('employee_invitations')
    .select('email')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .in('email', emailList);

  const alreadyInvited = new Set((existing ?? []).map(e => e.email));
  const toInvite = emailList.filter(e => !alreadyInvited.has(e));

  if (toInvite.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      skipped: emailList.length,
      message: 'Toutes ces adresses ont déjà une invitation en attente.',
    });
  }

  const rows = toInvite.map(email => ({
    organization_id: organizationId,
    email,
    role,
    first_name:  body.first_name ?? null,
    last_name:   body.last_name  ?? null,
    invited_by:  ctx.profileId,
  }));

  const { data: created, error: insertErr } = await admin
    .from('employee_invitations')
    .insert(rows)
    .select('id, email, token, expires_at');

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const invitations = (created ?? []).map(inv => ({
    email:   inv.email,
    link:    `${baseUrl}/join/${inv.token}`,
    expires: inv.expires_at,
  }));

  return NextResponse.json({
    ok:      true,
    sent:    invitations.length,
    skipped: alreadyInvited.size,
    invitations,
  });
}
