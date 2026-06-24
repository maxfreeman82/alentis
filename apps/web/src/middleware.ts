import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|api/webhooks|api/public).*)'],
};
