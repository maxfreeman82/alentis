import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const VALID_TYPES = ['talent', 'entreprise', 'fondateur'] as const;
type ProfileType = typeof VALID_TYPES[number];

export async function GET(req: Request) {
  const url     = new URL(req.url);
  const raw     = url.searchParams.get('profile') ?? 'talent';
  const profile = (VALID_TYPES as readonly string[]).includes(raw)
    ? (raw as ProfileType)
    : 'talent';

  // Stocker le choix avant de partir vers WorkOS (10 minutes)
  const jar = await cookies();
  jar.set('ta_profile_type', profile, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  });

  const signInUrl = await getSignInUrl();
  redirect(signInUrl);
}
