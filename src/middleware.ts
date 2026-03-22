// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const isLoginPage = request.nextUrl.pathname.startsWith('/login');
    const isApi = request.nextUrl.pathname.startsWith('/api/');
    
    // API routes verify the token natively via firebase-admin, so we just pass them through here
    if (isApi) {
        return NextResponse.next();
    }

    const token = request.cookies.get('firebaseToken')?.value;
    
    if (!token && !isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (token && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
