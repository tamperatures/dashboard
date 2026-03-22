'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onIdTokenChanged } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import Cookie from 'js-cookie';

export interface UserData {
    role?: string;
    department?: string;
    departments?: string[];
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribeAuth = onIdTokenChanged(auth, async (currentUser: User | null) => {
            if (currentUser) {
                const token = await currentUser.getIdToken();
                Cookie.set('firebaseToken', token, { expires: 14, secure: process.env.NODE_ENV === 'production' });
                setUser(currentUser);

                fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        setUserData(data.user);
                        if (data.user.mustChangePassword && pathname !== '/change-password') {
                            router.push('/change-password');
                        } else if (!data.user.mustChangePassword && pathname === '/change-password') {
                            router.push('/');
                        }
                    } else {
                        setUserData(null);
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch user data', err);
                    setUserData(null);
                });
            } else {
                Cookie.remove('firebaseToken');
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    return <AuthContext.Provider value={{ user, userData, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
