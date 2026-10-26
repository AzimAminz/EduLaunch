import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, isLocale, pickLocale } from './lib/i18n/locale';

/** Every page lives under /ms or /en. A path without one is redirected to the user's language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isLocale(pathname.split('/')[1])) return;

  const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get('accept-language'));
  request.nextUrl.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip the API (forwarded to the gateway), Next internals and files such as /icons/home.svg.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
