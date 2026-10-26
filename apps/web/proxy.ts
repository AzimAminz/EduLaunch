import { NextResponse, type NextRequest } from 'next/server';
import { guard } from './lib/auth/routes';
import { LOCALE_COOKIE, isLocale, pickLocale } from './lib/i18n/locale';
import { redirectKeepingCookies, updateSession } from './lib/supabase/proxy';

/**
 * 1. Every page lives under /ms or /en. A path without one is redirected to the user's language.
 * 2. The Supabase session is refreshed, and pages that need (or must not have) a session redirect.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isLocale(pathname.split('/')[1])) {
    const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get('accept-language'));
    request.nextUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const { response, user } = await updateSession(request);
  const decision = guard(pathname, user, request.nextUrl.search);
  return decision ? redirectKeepingCookies(request, response, decision.redirect) : response;
}

export const config = {
  // Skip the API (forwarded to the gateway), Next internals and files such as /icons/home.svg.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
