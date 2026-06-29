import { type NextRequest, NextResponse } from 'next/server';
import { WorkOS } from '@workos-inc/node';
import { sealData } from 'iron-session';

// Route uniquement disponible hors production — ne jamais monter en prod
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const email    = req.nextUrl.searchParams.get('email');
  const password = req.nextUrl.searchParams.get('password');

  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 });
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY!);

  const { accessToken, refreshToken, user } =
    await workos.userManagement.authenticateWithPassword({
      email,
      password,
      clientId: process.env.WORKOS_CLIENT_ID!,
    });

  // Reproduire exactement le format de cookie de @workos-inc/authkit-nextjs
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD!;
  const sealed = await sealData(
    { accessToken, refreshToken, user },
    { password: cookiePassword, ttl: 0 },
  );

  const cookieName = process.env.WORKOS_COOKIE_NAME ?? 'wos-session';

  // Cookie défini directement sur la réponse redirect (pas via cookies() — incompatible avec redirect)
  const res = NextResponse.redirect(new URL('/dashboard', req.url));
  res.cookies.set(cookieName, sealed, {
    httpOnly: true,
    secure:   false,
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24,
  });

  return res;
}
