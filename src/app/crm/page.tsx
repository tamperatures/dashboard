'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Search, Plus, Phone, Mail, MapPin, ArrowRight,
    Users, Briefcase, CheckCircle2, Clock, FileText,
    MoreHorizontal, ChevronDown, UserPlus, Loader2, Inbox,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ───────── Types ───────── */
interface Customer {
    id: string;
    projectCode: string;
    clientName: string;
    phone: string;
    address: string;
    estate: string;
    renovationType: string;
    stage: string;
    budget: number;
    pmResponsible?: string;
    createdAt: string;
}

/* ───────── Constants ───────── */
const TABS = [
    '全部',
    'S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進',
    'S05_後續會面', 'S06_工程啟動', 'S07_工程進行中', 'S08_工程完成'
];

const TAB_COLORS: Record<string, string> = {
    'S01_客戶查詢': 'bg-amber-50 text-amber-700',
    'S02_見客前準備': 'bg-violet-50 text-violet-700',
    'S03_初步報價': 'bg-indigo-50 text-indigo-700',
    'S04_見客後跟進': 'bg-fuchsia-50 text-fuchsia-700',
    'S05_後續會面': 'bg-pink-50 text-pink-700',
    'S06_工程啟動': 'bg-blue-50 text-blue-700',
    'S07_工程進行中': 'bg-emerald-50 text-emerald-700',
    'S08_工程完成': 'bg-slate-100 text-slate-600',
};

const TAB_LABELS: Record<string, string> = {
    '全部': '全部',
    'S01_客戶查詢': 'S01 查詢',
    'S02_見客前準備': 'S02 準備',
    'S03_初步報價': 'S03 報價',
    'S04_見客後跟進': 'S04 跟進',
    'S05_後續會面': 'S05 會面',
    'S06_工程啟動': 'S06 啟動',
    'S07_工程進行中': 'S07 進行中',
    'S08_工程完成': 'S08 完成',
};

const STAGE_DEPARTMENTS: Record<string, string> = {
    'S01_客戶查詢': '推廣部',
    'S02_見客前準備': '設計部',
    'S03_初步報價': '銷售部',
    'S04_見客後跟進': '設計部',
    'S05_後續會面': '銷售部',
    'S06_工程啟動': '工程部',
    'S07_工程進行中': '工程部',
    'S08_工程完成': '工程部',
};

/* ───────── Animation ───────── */
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

/* ───────── Page ───────── */
export default function CRMPage() {
    const { user, userData } = useAuth();
    const userRole = userData?.role || 'staff';
    const userDept = userData?.department || '';

    const [activeTab, setActiveTab] = useState('全部');
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.projects || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const viewableCustomers = customers.filter(c => {
        if (userRole === 'admin') return true;
        const requiredDept = STAGE_DEPARTMENTS[c.stage];
        return !requiredDept || requiredDept === userDept;
    });

    const filtered = viewableCustomers.filter(c => {
        const matchTab = activeTab === '全部' || c.stage === activeTab;
        const matchSearch = !search || c.clientName.includes(search) || c.address.includes(search) || c.projectCode.includes(search);
        return matchTab && matchSearch;
    });

    const activeOrCompleted = viewableCustomers.filter(c => ['S06_工程啟動', 'S07_工程進行中', 'S08_工程完成'].includes(c.stage));
    const pending = viewableCustomers.filter(c => ['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進', 'S05_後續會面'].includes(c.stage));
    const completed = viewableCustomers.filter(c => c.stage === 'S08_工程完成');

    const availableTabs = TABS.filter(tab => {
        if (tab === '全部') return true;
        if (userRole === 'admin') return true;
        return STAGE_DEPARTMENTS[tab] === userDept;
    });

    const stats = [
        { label: '客戶總數', value: customers.length, icon: Users, color: 'blue' },
        { label: '已簽單客戶', value: activeOrCompleted.length, icon: Briefcase, color: 'emerald' },
        { label: '跟進中項目', value: pending.length, icon: Clock, color: 'amber' },
        { label: '已完工項目', value: completed.length, icon: CheckCircle2, color: 'violet' },
    ];

    return (
        <motion.div
            className="max-w-[1600px] mx-auto space-y-8 pb-12"
            initial="hidden" animate="show" variants={container}
        >
            {/* ─── Header ─── */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">客戶關係管理</h2>
                    <p className="text-sm text-slate-500 mt-1">管理前端銷售查詢、報價進度及已簽約客戶</p>
                </div>
                <Button className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md text-sm">
                    <UserPlus className="h-4 w-4" /> 新增外來客戶 (Lead)
                </Button>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            ) : customers.length === 0 ? (
                <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
                        <Inbox className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">尚無客戶資料</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-md">
                        客戶資料將從項目中自動生成。請先建立項目。
                    </p>
                </motion.div>
            ) : (
                <>
                    {/* ─── Stat Cards ─── */}
                    <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((s) => (
                            <Card key={s.label}>
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${s.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                        s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                            s.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                                'bg-violet-50 text-violet-600'
                                        }`}>
                                        <s.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                                        <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>

                    {/* ─── Search + Tabs ─── */}
                    <motion.div variants={fadeUp} className="space-y-4">
                        {/* Search */}
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="搜尋客戶名稱、地址、編號..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 placeholder:text-slate-400"
                            />
                        </div>

                        {/* Tab Bar */}
                        <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-px">
                            {availableTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all relative ${activeTab === tab
                                        ? 'text-slate-900 bg-white border border-b-0 border-slate-200 -mb-px hover:bg-slate-50'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    {TAB_LABELS[tab]}
                                    {activeTab !== tab && (
                                        <span className="ml-1.5 text-xs text-slate-400">
                                            {tab === '全部' ? viewableCustomers.length : viewableCustomers.filter(c => c.stage === tab).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* ─── Customer Table ─── */}
                    <motion.div variants={fadeUp}>
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3.5">客戶 / 項目</th>
                                            <th className="px-4 py-3.5">聯絡</th>
                                            <th className="px-4 py-3.5">類型</th>
                                            <th className="px-4 py-3.5">狀態</th>
                                            <th className="px-4 py-3.5">預算</th>
                                            <th className="px-4 py-3.5">負責人</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/80">
                                        {filtered.map((c, idx) => (
                                            <motion.tr
                                                key={c.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                                            {c.clientName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{c.clientName}</p>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                                <MapPin className="h-3 w-3" /> <span className="truncate max-w-[180px]">{c.estate} {c.address}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                        <Phone className="h-3 w-3 text-slate-400" /> {c.phone || '—'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">{c.renovationType}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <Badge variant="outline" className={`text-[11px] font-semibold border-transparent ${TAB_COLORS[c.stage] || 'bg-slate-100 text-slate-600'}`}>
                                                        {TAB_LABELS[c.stage] || c.stage}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3.5 font-semibold text-slate-900">
                                                    {c.budget ? `HK$${(c.budget / 1000).toFixed(0)}k` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{c.pmResponsible || '—'}</td>
                                            </motion.tr>
                                        ))}
                                        {filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-16 text-center">
                                                    <p className="text-sm text-slate-400">沒有符合條件的客戶</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                </>
            )}
        </motion.div>
    );
}
