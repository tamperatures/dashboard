'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Building2, Lock, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

export default function SettingsPage() {
    const { user, userData } = useAuth();
    const userRole = userData?.role || 'staff';
    const userDept = userData?.department || '—';
    const userName = userData?.name || user?.displayName || user?.email || '—';
    const userEmail = user?.email || '—';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setSuccess('');
        if (password !== confirm) { setError('兩次輸入的密碼不一致'); return; }
        if (password.length < 6) { setError('密碼長度必須至少為 6 個字元'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: password }) });
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || '密碼更新失敗'); }
            setSuccess('密碼已成功更新！'); setPassword(''); setConfirm('');
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#86868B] flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
            </label>
            <div className="h-11 px-4 rounded-xl bg-[#F5F5F7] flex items-center text-[14px] font-medium text-[#1D1D1F]">
                {value}
            </div>
        </div>
    );

    return (
        <motion.div className="max-w-4xl mx-auto space-y-7 pb-12" initial="hidden" animate="show" variants={container}>
            <motion.div variants={fadeUp}>
                <h2 className="apple-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#1D1D1F]">系統設定</h2>
                <p className="text-[14px] text-[#86868B] mt-1">管理個人資料與帳號安全</p>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-6">
                {/* Profile */}
                <Card className="border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
                    <CardHeader className="border-b border-[#E8E8ED]/60 bg-[#F5F5F7]/30 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#0071E3]/10 flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-[#0071E3]" />
                            </div>
                            個人資料
                        </CardTitle>
                        <CardDescription>你目前登入的帳號資訊（如需修改請聯絡管理員）</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InfoRow icon={User} label="姓名" value={userName} />
                            <InfoRow icon={Mail} label="電郵地址" value={userEmail} />
                            <InfoRow icon={Shield} label="系統權限" value={
                                userRole === 'admin'
                                    ? <Badge className="bg-amber-100 text-amber-700 border-none">管理員 (Admin)</Badge>
                                    : <Badge variant="secondary" className="border-none">一般員工 (Staff)</Badge>
                            } />
                            <InfoRow icon={Building2} label="所屬部門" value={userDept} />
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card className="border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
                    <CardHeader className="border-b border-[#E8E8ED]/60 bg-[#F5F5F7]/30 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            安全設置
                        </CardTitle>
                        <CardDescription>定期更新您的密碼以保持帳戶安全</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2 text-[13px] font-medium text-red-600">
                                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-2 text-[13px] font-medium text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />{success}
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
                            <Button type="submit" disabled={loading || !password || !confirm} className="w-full">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                更改密碼
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* About */}
                <Card className="border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
                    <CardHeader className="border-b border-[#E8E8ED]/60 bg-[#F5F5F7]/30 pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#86868B]/10 flex items-center justify-center">
                                <Info className="h-3.5 w-3.5 text-[#86868B]" />
                            </div>
                            系統資訊
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[#86868B]">系統版本</span>
                            <span className="font-semibold text-[#1D1D1F]">v1.0.0 (Build by Visionerse)</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
