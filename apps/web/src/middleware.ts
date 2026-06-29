import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const handler = authkitMiddleware();

export default async function middleware(req: NextRequest) {
  // Diagnostic rapide des variables critiques
  const clientId  = process.env.WORKOS_CLIENT_ID;
  const cookiePwd = process.env.WORKOS_COOKIE_PASSWORD;
  const redirectURI = process.env.WORKOS_REDIRECT_URI;

  if (!clientId || !cookiePwd) {
    return new NextResponse(
      JSON.stringify({ error: 'ENV_MISSING', clientId: !!clientId, cookiePwd: !!cookiePwd, redirectURI: !!redirectURI }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    return await handler(req, {} as never);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      JSON.stringify({ error: 'MIDDLEWARE_ERROR', message: msg }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|api/webhooks|api/public).*)'],
};
