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
                console.log('--- STARTING AUTHORIZE LOGIC ---');
                if (!credentials?.email || !credentials?.password) {
                    console.error('Missing credentials email or password');
                    return null;
                }

                try {
                    console.log('Firebase project ID:', process.env.FIREBASE_PROJECT_ID);
                    console.log('Querying Firestore for user:', credentials.email);
                    const usersRef = firestore.collection('users');
                    const snapshot = await usersRef.where('email', '==', credentials.email).where('status', '==', 'active').get();

                    if (snapshot.empty) {
                        console.error('No active user found with email:', credentials.email);
                        return null;
                    }

                    const user = snapshot.docs[0].data() as User;
                    console.log('User found in Firestore:', user.email);

                    const isValid = await bcrypt.compare(
                        credentials.password as string,
                        user.password
                    );

                    if (!isValid) {
                        console.error('Invalid password for user:', credentials.email);
                        return null;
                    }
                    
                    console.log('Password is valid. Returning user object.');

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        mustChangePassword: user.mustChangePassword,
                        department: user.department,
                        departments: (user as any).departments || (user.department ? [user.department] : []),
                    };
                } catch (error) {
                    console.error('CRITICAL ERROR inside authorize():', error);
                    return null;
                }
            },
        }),
    ],
});
