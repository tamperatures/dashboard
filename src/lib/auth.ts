import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db as firestore } from './firebase-admin';
import type { User } from './db';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const usersRef = firestore.collection('users');
                const snapshot = await usersRef.where('email', '==', credentials.email).where('status', '==', 'active').get();

                if (snapshot.empty) return null;

                const user = snapshot.docs[0].data() as User;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    mustChangePassword: user.mustChangePassword,
                    department: user.department,
                    departments: (user as any).departments || (user.department ? [user.department] : []),
                };
            },
        }),
    ],
});
