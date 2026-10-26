
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REFRESH_COOKIE = 'aakara_refresh';

// the one login page, for staff and bidders alike (it sends staff on to the dashboard)
const LOGIN_PATH = '/registration';

// /authenticator: the Google Authenticator code a dashboard login enters before the dashboard opens
const PROTECTED_PREFIXES = ['/dashboard', '/my-profile', '/authenticator'];
// /registration is not bounced here: the cookie alone can't say the visitor is still signed in (and a
// redirect cached while signed in outlives logout), so the page itself sends signed-in visitors on

function matchesPrefix(pathname: string, prefixes: string[]) {
    return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isSignedIn = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);

    if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !isSignedIn) {
        const loginUrl = new URL(LOGIN_PATH, request.url);
        loginUrl.searchParams.set('redirect', pathname + search);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};