'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Search, Plus, Phone, Mail, MapPin, ArrowRight,
    Users, Briefcase, CheckCircle2, Clock, FileText,
    MoreHorizontal, ChevronDown, UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ───────── Types ───────── */
interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address: string;
    type: string;
    status: string;
    budget?: number;
    nextAction?: string;
    createdAt: string;
    pm?: string;
}

/* ───────── Mock Data ───────── */
const TABS = ['全部', '查詢中', '報價中', '已簽約', '施工中', '已完工'];

const TAB_COLORS: Record<string, string> = {
    '查詢中': 'bg-blue-50 text-blue-700',
    '報價中': 'bg-amber-50 text-amber-700',
    '已簽約': 'bg-indigo-50 text-indigo-700',
    '施工中': 'bg-emerald-50 text-emerald-700',
    '已完工': 'bg-slate-100 text-slate-600',
};

const CUSTOMERS: Customer[] = [
    { id: '#10301', name: '陳先生', phone: '9123 4567', email: 'chan@email.com', address: '太古城 海棠閣 12A', type: '全屋裝修', status: '施工中', budget: 580000, nextAction: '泥水驗收', createdAt: '2025-12-01', pm: 'Angel' },
    { id: '#10302', name: '黃小姐', phone: '9234 5678', address: '沙田第一城 52座 3B', type: '全屋裝修', status: '施工中', budget: 420000, nextAction: '油漆選色', createdAt: '2025-11-15', pm: 'David' },
    { id: '#10303', name: '李太', phone: '9345 6789', address: '將軍澳 日出康城 領都', type: '全屋裝修', status: '報價中', budget: 750000, nextAction: '發送報價單', createdAt: '2026-02-10', pm: 'Angel' },
    { id: '#10304', name: '張先生', phone: '9456 7890', address: '荃灣 映日灣 2座 18F', type: '全屋裝修', status: '查詢中', budget: 320000, nextAction: '安排約見', createdAt: '2026-02-25', pm: 'David' },
    { id: '#10305', name: '王太', phone: '9567 8901', address: '天水圍 嘉湖山莊 美湖居', type: '全屋裝修', status: '施工中', budget: 680000, nextAction: '傢俬安裝', createdAt: '2025-10-20', pm: 'Angel' },
    { id: '#10306', name: '黃小姐', phone: '9678 9012', address: '青衣 長安邨 安泊樓', type: '廚廁翻新', status: '已簽約', budget: 180000, nextAction: '開工安排', createdAt: '2026-01-20', pm: 'David' },
    { id: '#10297', name: '陳先生', phone: '9111 2222', address: '荃灣 海之戀 3座', type: '全屋裝修', status: '查詢中', nextAction: '安排約見', createdAt: '2025-10-25' },
    { id: '#10298', name: '李太', phone: '9333 4444', address: '大埔 汀角路 村屋', type: '村屋裝修', status: '報價中', budget: 520000, nextAction: '修改報價', createdAt: '2025-10-28', pm: 'David' },
    { id: '#10299', name: '黃小姐', phone: '9555 6666', address: '沙田 河畔花園', type: '廚廁翻新', status: '查詢中', nextAction: '安排約見', createdAt: '2025-11-05' },
    { id: '#10290', name: '張生', phone: '9777 8888', address: '元朗 錦繡花園 M段', type: '全屋裝修', status: '已完工', budget: 450000, createdAt: '2025-09-25', pm: 'David' },
];

/* ───────── Animation ───────── */
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

/* ───────── Page ───────── */
export default function CRMPage() {
    const [activeTab, setActiveTab] = useState('全部');
    const [search, setSearch] = useState('');

    const filtered = CUSTOMERS.filter(c => {
        const matchTab = activeTab === '全部' || c.status === activeTab;
        const matchSearch = !search || c.name.includes(search) || c.address.includes(search) || c.id.includes(search);
        return matchTab && matchSearch;
    });

    const stats = [
        { label: '總客戶', value: CUSTOMERS.length, icon: Users, color: 'blue' },
        { label: '進行中', value: CUSTOMERS.filter(c => c.status === '施工中').length, icon: Briefcase, color: 'emerald' },
        { label: '待跟進', value: CUSTOMERS.filter(c => ['查詢中', '報價中'].includes(c.status)).length, icon: Clock, color: 'amber' },
        { label: '已完工', value: CUSTOMERS.filter(c => c.status === '已完工').length, icon: CheckCircle2, color: 'violet' },
    ];

    return (
        <motion.div
            className="max-w-[1600px] mx-auto space-y-8 pb-12"
            initial="hidden" animate="show" variants={container}
        >
            {/* ─── Header ─── */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">客戶管理</h2>
                    <p className="text-sm text-slate-500 mt-1">管理查詢、報價及銷售項目</p>
                </div>
                <Button className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md text-sm">
                    <UserPlus className="h-4 w-4" /> 新增客戶
                </Button>
            </motion.div>

            {/* ─── Stat Cards ─── */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Card key={s.label} className="shadow-sm border-slate-200/60 hover:shadow-md transition-shadow">
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
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all relative ${activeTab === tab
                                    ? 'text-slate-900 bg-white border border-b-0 border-slate-200 -mb-px'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {tab}
                            {activeTab !== tab && (
                                <span className="ml-1.5 text-xs text-slate-400">
                                    {tab === '全部' ? CUSTOMERS.length : CUSTOMERS.filter(c => c.status === tab).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* ─── Customer Table ─── */}
            <motion.div variants={fadeUp}>
                <Card className="shadow-sm border-slate-200/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3.5">客戶</th>
                                    <th className="px-4 py-3.5">聯絡</th>
                                    <th className="px-4 py-3.5">類型</th>
                                    <th className="px-4 py-3.5">狀態</th>
                                    <th className="px-4 py-3.5">預算</th>
                                    <th className="px-4 py-3.5">負責人</th>
                                    <th className="px-4 py-3.5 text-right">下一步</th>
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
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{c.name}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <MapPin className="h-3 w-3" /> <span className="truncate max-w-[180px]">{c.address}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                <Phone className="h-3 w-3 text-slate-400" /> {c.phone}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">{c.type}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <Badge variant="outline" className={`text-[11px] font-semibold border-transparent ${TAB_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                                                {c.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                                            {c.budget ? `HK$${(c.budget / 1000).toFixed(0)}k` : '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{c.pm || '—'}</td>
                                        <td className="px-4 py-3.5 text-right">
                                            {c.nextAction ? (
                                                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                                    {c.nextAction}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <p className="text-sm text-slate-400">沒有符合條件的客戶</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
}
