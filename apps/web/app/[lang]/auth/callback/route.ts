import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_PAGES, safeNext } from '@/lib/auth/routes';
import { isLocale } from '@/lib/i18n/locale';
import { createClient } from '@/lib/supabase/server';

/** Links in sign-up and password e-mails land here with a one-time code, which becomes a session. */
export async function GET(request: NextRequest, { params }: RouteContext<'/[lang]/auth/callback'>) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'ms';
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNext(request.nextUrl.searchParams.get('next'), `/${locale}/utama`);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  // Expired, already used, or opened in another browser: ask for a new link.
  return NextResponse.redirect(new URL(`/${locale}/${AUTH_PAGES.forgotPassword}?ralat=pautan`, request.url));
}
