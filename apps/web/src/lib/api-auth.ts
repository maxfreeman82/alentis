'use server';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { can, type Permission, type Role } from '@/lib/permissions';

export interface AuthContext {
  userId:    string;
  profileId: string;
  role:      Role;
  email:     string;
}

/**
 * Vérifie l'authentification ET la permission RBAC.
 * Retourne { ctx } si autorisé, { error: NextResponse } sinon.
 *
 * Usage dans une route API :
 *   const { ctx, error } = await checkPermission('manage:jobs');
 *   if (error) return error;
 */
export async function checkPermission(
  permission: Permission
): Promise<{ ctx: AuthContext; error?: undefined } | { ctx?: undefined; error: NextResponse }> {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return { error: NextResponse.json({ error: 'Profil introuvable' }, { status: 403 }) };
  }

  if (!can(profile.role as Role, permission)) {
    return {
      error: NextResponse.json(
        { error: `Permission refusée : ${permission} requiert un rôle supérieur` },
        { status: 403 }
      ),
    };
  }

  return {
    ctx: {
      userId:    user.id,
      profileId: profile.id as string,
      role:      profile.role as Role,
      email:     profile.email as string,
    },
  };
}
