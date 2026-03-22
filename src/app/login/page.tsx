'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { HardHat, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken();
            document.cookie = `firebaseToken=${token}; path=/; max-age=${14 * 24 * 60 * 60}; ${process.env.NODE_ENV === 'production' ? 'secure;' : ''}`;
            
            router.push('/');
            router.refresh();
        } catch (err: any) {
            console.error('Firebase Auth Error:', err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('帳號或密碼不正確');
            } else {
                setError('登入時發生錯誤: ' + err.message);
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Light background with subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5F7] via-white to-[#E8ECFF]" />
            <div className="absolute top-[-30%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#0071E3]/[0.04] blur-[100px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[80px]" />

            {/* Subtle dot grid */}
            <div className="absolute inset-0 opacity-[0.3]" style={{
                backgroundImage: 'radial-gradient(circle, #D1D1D6 0.5px, transparent 0.5px)',
                backgroundSize: '24px 24px'
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-full max-w-[420px] relative z-10 px-4"
            >
                {/* Logo + Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-8"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-[#0071E3] to-[#00A2FF] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-[#0071E3]/20"
                    >
                        <HardHat className="h-9 w-9 text-white" strokeWidth={1.8} />
                    </motion.div>
                    <h1 className="text-[28px] font-bold text-[#1D1D1F] tracking-tight">適度裝修</h1>
                    <p className="text-[#86868B] text-sm mt-1 font-medium">工程管理系統 · Engineering Management</p>
                </motion.div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-3xl p-8 ring-1 ring-black/[0.04] shadow-xl shadow-black/[0.03]"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="text-center mb-2">
                            <h2 className="text-lg font-bold text-[#1D1D1F]">歡迎回來</h2>
                            <p className="text-sm text-[#86868B] mt-0.5">請登入您的帳號以繼續</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-2xl ring-1 ring-red-100"
                            >
                                <AlertCircle className="h-4 w-4 shrink-0" />{error}
                            </motion.div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider pl-1">電郵地址</label>
                            <div className={`relative flex items-center rounded-2xl transition-all duration-300 ring-1 ${focusedField === 'email'
                                ? 'ring-[#0071E3] bg-white shadow-lg shadow-[#0071E3]/8'
                                : 'ring-[#D1D1D6] bg-[#F9F9FB] hover:ring-[#86868B]'
                                }`}>
                                <Mail className={`absolute left-4 h-[18px] w-[18px] transition-colors duration-300 ${focusedField === 'email' ? 'text-[#0071E3]' : 'text-[#86868B]'
                                    }`} />
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    className="w-full h-12 pl-11 pr-4 bg-transparent text-sm text-[#1D1D1F] placeholder:text-[#C7C7CC] font-medium rounded-2xl focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-[#86868B] uppercase tracking-wider pl-1">密碼</label>
                            <div className={`relative flex items-center rounded-2xl transition-all duration-300 ring-1 ${focusedField === 'password'
                                ? 'ring-[#0071E3] bg-white shadow-lg shadow-[#0071E3]/8'
                                : 'ring-[#D1D1D6] bg-[#F9F9FB] hover:ring-[#86868B]'
                                }`}>
                                <Lock className={`absolute left-4 h-[18px] w-[18px] transition-colors duration-300 ${focusedField === 'password' ? 'text-[#0071E3]' : 'text-[#86868B]'
                                    }`} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    required
                                    className="w-full h-12 pl-11 pr-12 bg-transparent text-sm text-[#1D1D1F] placeholder:text-[#C7C7CC] font-medium rounded-2xl focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 p-1.5 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all duration-200"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <motion.div whileTap={{ scale: 0.98 }}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-[#0071E3] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#0071E3]/25 hover:bg-[#0077ED] hover:shadow-xl hover:shadow-[#0071E3]/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        登入系統
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </motion.div>


                    </form>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-[11px] text-[#C7C7CC] mt-8 font-medium"
                >
                    © 2026 適度裝修設計 · Built by Visionerse
                </motion.p>
            </motion.div>
        </div>
    );
}
