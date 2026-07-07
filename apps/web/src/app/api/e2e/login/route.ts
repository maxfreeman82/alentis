import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Route E2E uniquement disponible hors production
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const email    = req.nextUrl.searchParams.get('email');
  const password = req.nextUrl.searchParams.get('password');

  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Construire la réponse d'abord pour pouvoir y écrire les cookies
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()  { return cookieStore.getAll(); },
        setAll(list) {
          // Écrire dans le cookie store ET dans la réponse (nécessaire pour e2e)
          list.forEach(({ name, value, options }) => {
            try { cookieStore.set({ name, value, ...options }); } catch { /* ignore */ }
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Retourner 200 avec les cookies — le test navigue ensuite lui-même
  return response;
}
