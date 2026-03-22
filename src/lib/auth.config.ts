import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Edge-compatible auth config (no Node.js modules)
export const authConfig: NextAuthConfig = {
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60,
    },
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            // authorize is handled in auth.ts (Node.js runtime)
            authorize: () => null,
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.mustChangePassword = (user as any).mustChangePassword;
                token.department = (user as any).department;
                token.departments = (user as any).departments || ((user as any).department ? [(user as any).department] : []);
            }
            if (trigger === "update" && session !== undefined) {
                if (typeof session.mustChangePassword === 'boolean') {
                    token.mustChangePassword = session.mustChangePassword;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).mustChangePassword = token.mustChangePassword as boolean | undefined;
                (session.user as any).department = token.department as string | undefined;
                (session.user as any).departments = (token.departments as string[]) || [];
            }
            return session;
        },
        async authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user;
            const isLoginPage = request.nextUrl.pathname.startsWith('/login');
            const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

            if (isApiAuth) return true;
            if (isLoginPage) return true;
            if (!isLoggedIn) return false;

            const mustChangePass = (auth.user as any)?.mustChangePassword;
            const isChangePassPage = request.nextUrl.pathname.startsWith('/change-password');
            const isApi = request.nextUrl.pathname.startsWith('/api/');

            if (mustChangePass && !isChangePassPage && !isApi) {
                return Response.redirect(new URL('/change-password', request.nextUrl));
            }

            if (!mustChangePass && isChangePassPage) {
                return Response.redirect(new URL('/', request.nextUrl)); // Already changed
            }

            return true;
        },
    },
};
