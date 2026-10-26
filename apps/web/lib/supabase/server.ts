import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { AUTH_PAGES, homeFor, type Role } from '../auth/routes';
import type { Locale } from '../i18n/locale';

/** Supabase client for Server Components, Server Actions and Route Handlers. The session lives in cookies. */
export async function createClient() {
  // Supabase reads the clock (Date.now) to check the session, which Next only allows at request time.
  await connection();
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

export interface Account {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

/** The signed-in user, checked with Supabase Auth, or null. */
export async function getAccount(): Promise<Account | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as { full_name?: string };
  return {
    id: claims.sub,
    email: claims.email ?? '',
    name: meta.full_name?.trim() || null,
    role: claims.app_metadata?.role === 'admin' ? 'admin' : 'student',
  };
}

/** The signed-in user's access token, to call the API gateway on their behalf. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Second check after the proxy, on the server that renders the page:
 * no account → log in; the other role → that role's own home.
 */
export async function requireRole(locale: Locale, role: Role): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect(`/${locale}/${AUTH_PAGES.signIn}`);
  if (account.role !== role) redirect(homeFor(locale, account.role));
  return account;
}
