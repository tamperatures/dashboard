'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Hammer, Droplets, Paintbrush, Zap, Sofa, Wrench,
    MapPin, User, Clock, ChevronRight, Plus, MoreHorizontal,
    CheckCircle2, Circle, AlertCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────── Types ───────── */
interface Trade {
    name: string;
    icon: React.ElementType;
    status: 'done' | 'active' | 'pending';
}

interface Project {
    id: string;
    client: string;
    address: string;
    type: string;
    pm: string;
    budget: number;
    stage: string;
    progress: number;
    startDate: string;
    endDate: string;
    trades: Trade[];
}

/* ───────── Mock Data ───────── */
const STAGES = ['初步報價', '設計中', '已簽約', '施工中', '已完工'];

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    '初步報價': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    '設計中': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
    '已簽約': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
    '施工中': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    '已完工': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const PROJECTS: Project[] = [
    {
        id: 'P-2026-033', client: '張先生', address: '荃灣 映日灣 2座 18F',
        type: '全屋裝修', pm: 'David', budget: 320000, stage: '初步報價', progress: 10,
        startDate: '—', endDate: '—',
        trades: [
            { name: '清拆', icon: Hammer, status: 'pending' },
            { name: '水電', icon: Zap, status: 'pending' },
            { name: '泥水', icon: Droplets, status: 'pending' },
            { name: '油漆', icon: Paintbrush, status: 'pending' },
            { name: '傢俬', icon: Sofa, status: 'pending' },
        ]
    },
    {
        id: 'P-2026-035', client: '李太', address: '將軍澳 日出康城 領都 5座',
        type: '全屋裝修', pm: 'Angel', budget: 750000, stage: '設計中', progress: 25,
        startDate: '2026-02-10', endDate: '—',
        trades: [
            { name: '清拆', icon: Hammer, status: 'pending' },
            { name: '水電', icon: Zap, status: 'pending' },
            { name: '泥水', icon: Droplets, status: 'pending' },
            { name: '油漆', icon: Paintbrush, status: 'pending' },
            { name: '傢俬', icon: Sofa, status: 'pending' },
        ]
    },
    {
        id: 'P-2026-029', client: '黃小姐', address: '青衣 長安邨 安泊樓',
        type: '廚廁翻新', pm: 'David', budget: 180000, stage: '已簽約', progress: 35,
        startDate: '2026-01-20', endDate: '2026-04-20',
        trades: [
            { name: '清拆', icon: Hammer, status: 'done' },
            { name: '水電', icon: Zap, status: 'active' },
            { name: '泥水', icon: Droplets, status: 'pending' },
            { name: '油漆', icon: Paintbrush, status: 'pending' },
            { name: '傢俬', icon: Sofa, status: 'pending' },
        ]
    },
    {
        id: 'P-2026-031', client: '陳先生', address: '太古城 海棠閣 12A',
        type: '全屋裝修', pm: 'Angel', budget: 580000, stage: '施工中', progress: 65,
        startDate: '2025-12-01', endDate: '2026-03-15',
        trades: [
            { name: '清拆', icon: Hammer, status: 'done' },
            { name: '水電', icon: Zap, status: 'done' },
            { name: '泥水', icon: Droplets, status: 'active' },
            { name: '油漆', icon: Paintbrush, status: 'pending' },
            { name: '傢俬', icon: Sofa, status: 'pending' },
        ]
    },
    {
        id: 'P-2026-028', client: '黃小姐', address: '沙田第一城 52座 3B',
        type: '全屋裝修', pm: 'David', budget: 420000, stage: '施工中', progress: 82,
        startDate: '2025-11-15', endDate: '2026-02-28',
        trades: [
            { name: '清拆', icon: Hammer, status: 'done' },
            { name: '水電', icon: Zap, status: 'done' },
            { name: '泥水', icon: Droplets, status: 'done' },
            { name: '油漆', icon: Paintbrush, status: 'active' },
            { name: '傢俬', icon: Sofa, status: 'pending' },
        ]
    },
    {
        id: 'P-2026-030', client: '王太', address: '天水圍 嘉湖山莊 美湖居',
        type: '全屋裝修', pm: 'Angel', budget: 680000, stage: '施工中', progress: 90,
        startDate: '2025-10-20', endDate: '2026-03-05',
        trades: [
            { name: '清拆', icon: Hammer, status: 'done' },
            { name: '水電', icon: Zap, status: 'done' },
            { name: '泥水', icon: Droplets, status: 'done' },
            { name: '油漆', icon: Paintbrush, status: 'done' },
            { name: '傢俬', icon: Sofa, status: 'active' },
        ]
    },
    {
        id: 'P-2025-022', client: '張生', address: '元朗 錦繡花園 M段',
        type: '全屋裝修', pm: 'David', budget: 450000, stage: '已完工', progress: 100,
        startDate: '2025-09-25', endDate: '2026-01-15',
        trades: [
            { name: '清拆', icon: Hammer, status: 'done' },
            { name: '水電', icon: Zap, status: 'done' },
            { name: '泥水', icon: Droplets, status: 'done' },
            { name: '油漆', icon: Paintbrush, status: 'done' },
            { name: '傢俬', icon: Sofa, status: 'done' },
        ]
    },
];

/* ───────── Animation ───────── */
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

/* ───────── Component ───────── */
export default function ProjectsPage() {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);

    const filtered = selectedStage ? PROJECTS.filter(p => p.stage === selectedStage) : PROJECTS;

    const stageCounts = STAGES.map(s => ({
        name: s,
        count: PROJECTS.filter(p => p.stage === s).length,
        ...STAGE_COLORS[s],
    }));

    return (
        <motion.div
            className="max-w-[1600px] mx-auto space-y-8 pb-12"
            initial="hidden" animate="show" variants={container}
        >
            {/* ─── Header ─── */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">項目管理</h2>
                    <p className="text-sm text-slate-500 mt-1">追蹤所有裝修工程進度及工種狀態</p>
                </div>
                <Button className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md text-sm">
                    <Plus className="h-4 w-4" /> 新增項目
                </Button>
            </motion.div>

            {/* ─── Stage Filter Pills ─── */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedStage(null)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${!selectedStage ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    全部 <span className="ml-1 opacity-70">{PROJECTS.length}</span>
                </button>
                {stageCounts.map(s => (
                    <button
                        key={s.name}
                        onClick={() => setSelectedStage(selectedStage === s.name ? null : s.name)}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedStage === s.name
                                ? `${s.bg} ${s.text} ring-1 ring-current/20`
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {s.name} <span className="opacity-70">{s.count}</span>
                    </button>
                ))}
            </motion.div>

            {/* ─── Project Cards Grid ─── */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <AnimatePresence mode="popLayout">
                    {filtered.map((project, idx) => {
                        const stageStyle = STAGE_COLORS[project.stage];
                        const isExpanded = expandedId === project.id;

                        return (
                            <motion.div
                                key={project.id}
                                layout
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.04 }}
                            >
                                <Card className="shadow-sm border-slate-200/60 hover:shadow-md transition-shadow overflow-hidden group">
                                    <CardContent className="p-5">
                                        {/* Top Row: ID + Stage */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-mono font-semibold text-slate-400">{project.id}</span>
                                            <Badge variant="outline" className={`text-[11px] font-semibold border-transparent ${stageStyle.bg} ${stageStyle.text}`}>
                                                {project.stage}
                                            </Badge>
                                        </div>

                                        {/* Client + Address */}
                                        <h3 className="text-base font-bold text-slate-900 leading-tight">{project.client}</h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{project.address}</span>
                                        </div>

                                        {/* Meta Row */}
                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <User className="h-3 w-3" /> {project.pm}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Wrench className="h-3 w-3" /> {project.type}
                                            </span>
                                        </div>

                                        {/* Budget + Progress */}
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-900">HK${(project.budget / 1000).toFixed(0)}k</span>
                                            <span className="text-xs font-semibold text-slate-500">{project.progress}%</span>
                                        </div>
                                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full ${project.progress >= 90 ? 'bg-emerald-500' :
                                                        project.progress >= 50 ? 'bg-blue-500' :
                                                            project.progress >= 25 ? 'bg-amber-400' :
                                                                'bg-slate-300'
                                                    }`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${project.progress}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 + idx * 0.05 }}
                                            />
                                        </div>

                                        {/* Dates */}
                                        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                                            <span>開工: {project.startDate}</span>
                                            <span>完工: {project.endDate}</span>
                                        </div>

                                        {/* Expand Toggle */}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : project.id)}
                                            className="mt-4 w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors py-1"
                                        >
                                            {isExpanded ? '收起工種' : '查看工種'}
                                            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>

                                        {/* Trade Checklist */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-3 mt-1 border-t border-slate-100 space-y-2">
                                                        {project.trades.map((trade) => (
                                                            <div key={trade.name} className="flex items-center gap-3 py-1">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${trade.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                                                                        trade.status === 'active' ? 'bg-blue-50 text-blue-600' :
                                                                            'bg-slate-50 text-slate-400'
                                                                    }`}>
                                                                    <trade.icon className="h-3.5 w-3.5" />
                                                                </div>
                                                                <span className={`text-sm font-medium flex-1 ${trade.status === 'done' ? 'text-slate-400 line-through' :
                                                                        trade.status === 'active' ? 'text-slate-900' :
                                                                            'text-slate-500'
                                                                    }`}>
                                                                    {trade.name}
                                                                </span>
                                                                {trade.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                                {trade.status === 'active' && (
                                                                    <Badge variant="secondary" className="text-[10px] font-bold bg-blue-50 text-blue-600 border-transparent">
                                                                        進行中
                                                                    </Badge>
                                                                )}
                                                                {trade.status === 'pending' && <Circle className="h-4 w-4 text-slate-300" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
