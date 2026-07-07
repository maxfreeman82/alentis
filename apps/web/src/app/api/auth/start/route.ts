import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const VALID = ['talent', 'entreprise', 'fondateur'] as const;
type ProfileType = typeof VALID[number];

export async function GET(req: Request) {
  const url     = new URL(req.url);
  const raw     = url.searchParams.get('profile') ?? 'talent';
  const profile = (VALID as readonly string[]).includes(raw) ? (raw as ProfileType) : 'talent';

  const jar = await cookies();
  jar.set('ta_profile_type', profile, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   3600, // 1 heure — assez long pour vérifier l'email
    path:     '/',
  });

  redirect(`/sign-up?profile=${profile}`);
}
