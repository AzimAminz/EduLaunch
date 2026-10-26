import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SignedInUser } from '../auth/routes';

/**
 * Refreshes the Supabase session on each page request and reports who is signed in.
 * Visitors without a Supabase cookie skip the check entirely, so public pages stay fast.
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: SignedInUser | null }> {
  let response = NextResponse.next({ request });
  if (!request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) return { response, user: null };

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return { response, user: null };
    return { response, user: { role: claims.app_metadata?.role === 'admin' ? 'admin' : 'student' } };
  } catch {
    // Auth unreachable: treat as signed out rather than breaking every page.
    return { response, user: null };
  }
}

/** A redirect that keeps any refreshed session cookies. */
export function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string): NextResponse {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
