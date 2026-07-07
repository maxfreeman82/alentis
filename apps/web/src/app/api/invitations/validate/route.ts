import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/invitations/validate?token=xxx
// Public — pas d'auth requise. Vérifie qu'un token est valide et retourne les infos d'invitation.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token requis' }, { status: 400 });

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from('employee_invitations')
    .select('id, email, first_name, last_name, role, status, expires_at, organization_id')
    .eq('token', token)
    .maybeSingle();

  if (!inv) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });

  if (inv.status === 'accepted') {
    return NextResponse.json({ error: 'Cette invitation a déjà été utilisée.' }, { status: 410 });
  }

  if (new Date(inv.expires_at) < new Date()) {
    // Marquer comme expirée si ce n'est pas déjà fait
    await admin.from('employee_invitations').update({ status: 'expired' }).eq('id', inv.id);
    return NextResponse.json({ error: 'Cette invitation a expiré.' }, { status: 410 });
  }

  // Récupérer le nom de l'organisation + vérifier si l'email est déjà inscrit
  const [orgRes, profileRes] = await Promise.all([
    admin.from('organizations').select('name').eq('id', inv.organization_id).maybeSingle(),
    admin.from('profiles').select('id').eq('email', inv.email).maybeSingle(),
  ]);

  return NextResponse.json({
    valid:       true,
    email:       inv.email,
    first_name:  inv.first_name,
    last_name:   inv.last_name,
    role:        inv.role,
    org_name:    orgRes.data?.name ?? 'Votre entreprise',
    expires_at:  inv.expires_at,
    user_exists: !!profileRes.data,
  });
}
