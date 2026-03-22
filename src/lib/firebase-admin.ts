import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace \n with actual line breaks when reading from env
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log('Firebase Admin Initialized successfully.');
    } catch (error) {
        console.error('Firebase Admin Initialization Error', error);
    }
}

export const db = admin.firestore();
export const adminAuth = admin.auth();

import { cookies } from 'next/headers';

export async function auth(req?: Request) {
    let token = null;
    if (req) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get('firebaseToken')?.value;
    }
    if (!token) return null;
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        let userData: any = {};
        try {
            const doc = await db.collection('users').doc(decodedToken.uid).get();
            if (doc.exists) userData = doc.data();
        } catch(e) {}
        
        return {
            user: {
                id: decodedToken.uid,
                email: decodedToken.email,
                role: userData.role || 'staff',
                name: userData.name || decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
                department: userData.department || '',
                departments: userData.departments || [],
                mustChangePassword: !!userData.mustChangePassword
            }
        };
    } catch (error) {
        return null;
    }
}

