import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client, used for sign-in. Data requests go through /api (the gateway). */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
