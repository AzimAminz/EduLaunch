import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Role } from '../auth/routes';

/** Supabase client for Server Components, Server Actions and Route Handlers. The session lives in cookies. */
export async function createClient() {
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
