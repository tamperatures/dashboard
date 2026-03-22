'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChangePasswordPage() {
    const router = useRouter();
    const { update } = useSession();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError('');
        if (password !== confirm) { setError('兩次輸入的密碼不一致'); return; }
        if (password.length < 6) { setError('密碼長度必須至少為6個字元'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: password }) });
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || '密碼更新失敗'); }
            await update({ mustChangePassword: false });
            router.push('/');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Card className="shadow-xl shadow-black/5">
                    <CardContent className="p-8">
                        <div className="text-center mb-6">
                            <div className="mx-auto w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                                <Lock className="h-7 w-7 text-amber-600" />
                            </div>
                            <h2 className="text-xl font-bold text-[#1D1D1F]">必須更改密碼</h2>
                            <p className="text-sm text-[#86868B] mt-1">基於安全理由，首次登入系統或被重置密碼後，必須設定您的專屬密碼。</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2 text-sm text-red-600">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-[#424245]">新密碼</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                                    <Input type="password" required placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-[#424245]">確認新密碼</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
                                    <Input type="password" required placeholder="••••••••" className="pl-10" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} />
                                </div>
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                儲存並繼續
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
