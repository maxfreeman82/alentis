import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// NEXT_PUBLIC_APP_URL est embedded au build → disponible dans l'Edge runtime
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ecranalentis.vercel.app';

export default authkitMiddleware({
  redirectUri: `${appUrl}/callback`,
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|api/webhooks|api/public|candidats).*)'],
};
