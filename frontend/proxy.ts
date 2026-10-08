
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// const REFRESH_COOKIE = 'aakara_refresh';

// const LOGIN_PATH = '/login';
// const HOME_PATH = '/';

// // bidder-facing pages send logged-out visitors to the storefront login instead of the staff one
// const BIDDER_LOGIN_PATH = '/registration';

// const PROTECTED_PREFIXES = ['/dashboard'];
// const BIDDER_PROTECTED_PREFIXES = ['/my-profile'];
// const AUTH_ONLY_PREFIXES = ['/login', '/signup', '/registration'];

// function matchesPrefix(pathname: string, prefixes: string[]) {
//     return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
// }

// export function proxy(request: NextRequest) {
//     const { pathname, search } = request.nextUrl;
//     const isSignedIn = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);

//     const isStaffPage = matchesPrefix(pathname, PROTECTED_PREFIXES);
//     const isBidderPage = matchesPrefix(pathname, BIDDER_PROTECTED_PREFIXES);

//     if ((isStaffPage || isBidderPage) && !isSignedIn) {
//         const loginUrl = new URL(isBidderPage ? BIDDER_LOGIN_PATH : LOGIN_PATH, request.url);
//         loginUrl.searchParams.set('redirect', pathname + search);
//         return NextResponse.redirect(loginUrl);
//     }

//     if (matchesPrefix(pathname, AUTH_ONLY_PREFIXES) && isSignedIn) {
//         return NextResponse.redirect(new URL(HOME_PATH, request.url));
//     }

//     return NextResponse.next();
// }

// export const config = {
//     matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
// };