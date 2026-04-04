'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarDays, Maximize2, AlertCircle, HardHat, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// 工程進度 — 10 construction phases
const CONSTRUCTION_PHASES = [
    { key: 'phase1SitePrep', icon: '☑️', label: '1. 工地準備' },
    { key: 'phase2Demolition', icon: '🗑️', label: '2. 清拆工程' },
    { key: 'phase3Plumbing', icon: '⚡', label: '3. 時間及水電' },
    { key: 'phase4Masonry', icon: '🧱', label: '4. 泥水防水' },
    { key: 'phase5Carpentry', icon: '🔧', label: '5. 木工油漆' },
    { key: 'phase6Installation', icon: '🔩', label: '6. 後期裝嵌' },
    { key: 'phase7PreInspection', icon: '📋', label: '7. 內部預檢驗' },
    { key: 'phase8OfficialInspection', icon: '👥', label: '8. 客戶驗收' },
    { key: 'phase9Handover', icon: '🔑', label: '9. 最終點收' },
    { key: 'phase10PostSupport', icon: '🛠️', label: '10. 售後保固' },
];

const COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500'
];

export default function ScheduleGridPage() {
    const router = useRouter();
    const { userData } = useAuth();
    const userRole = userData?.role || 'staff';
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDateOffset, setStartDateOffset] = useState(-5); // start 5 days before today

    useEffect(() => {
        const fetchEngineeringProjects = async () => {
            try {
                const res = await fetch('/api/projects');
                if (res.ok) {
                    const data = await res.json();
                    // Mode A is meant for engineering department to see global trades schedule
                    const activeProjs = data.projects.filter((p: any) => ['S06_工程啟動', 'S07_工程進行中', 'S08_工程完成'].includes(p.stage));
                    setProjects(activeProjs);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchEngineeringProjects();
    }, []);

    // Generate 35 days timeline
    const DAYS_COUNT = 35;
    const { dateArray, timelineMap } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const map = new Map<string, number>();
        const dates = [];

        for (let i = 0; i < DAYS_COUNT; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + startDateOffset + i);
            dates.push(d);
            map.set(d.toISOString().slice(0, 10), i); // Map 'YYYY-MM-DD' to col index
        }
        return { dateArray: dates, timelineMap: map };
    }, [startDateOffset]);

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    return (
        <motion.div className="max-w-[1600px] mx-auto pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-[#0071E3]" /> 全域工程甘特圖 (Mode A)
                    </h2>
                    <p className="text-sm text-[#86868B] mt-1">依據工種 (Trades) 檢視所有活躍地盤的排程狀態，避免工程疊加與資源擠兌。</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setStartDateOffset(prev => prev - 7)} title="上一週"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="text-xs" onClick={() => setStartDateOffset(-5)}>回到今日</Button>
                    <Button variant="outline" size="icon" onClick={() => setStartDateOffset(prev => prev + 7)} title="下一週"><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            <Card className="shadow-xl shadow-slate-200/40 border-slate-200 rounded-2xl bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[1200px]" style={{ display: 'grid', gridTemplateColumns: `200px repeat(${DAYS_COUNT}, minmax(40px, 1fr))` }}>
                        
                        {/* Timeline Header Row */}
                        <div className="bg-[#F5F5F7] border-b border-r border-slate-200 p-4 sticky left-0 z-20 flex items-center">
                            <span className="text-[12px] font-bold text-[#424245] uppercase tracking-wide">工序 / 地盤</span>
                        </div>
                        {dateArray.map((date, i) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                                <div key={i} className={`border-b border-r border-slate-100 flex flex-col items-center py-2 ${isToday ? 'bg-blue-50/50' : isWeekend ? 'bg-slate-50' : 'bg-white'}`}>
                                    <span className={`text-[10px] font-medium uppercase ${isWeekend ? 'text-[#86868B]' : 'text-slate-500'}`}>
                                        {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                                    </span>
                                    <span className={`text-[13px] font-bold mt-0.5 ${isToday ? 'text-blue-600' : 'text-[#1D1D1F]'}`}>
                                        {date.getDate()}
                                    </span>
                                    {isToday && <span className="w-1 h-1 rounded-full bg-blue-600 mt-1" />}
                                </div>
                            );
                        })}

                        {/* Trade Rows */}
                        {CONSTRUCTION_PHASES.map((phase) => {
                            // Find all projects that have this phase scheduled within our timeframe
                            // Actually, just find any project that has this phase, then check overlap
                            const activePhaseProjects = projects.filter(p => p[phase.key] && p[phase.key].startDate && p[phase.key].completionDate).sort((a,b) => new Date(a[phase.key].startDate).getTime() - new Date(b[phase.key].startDate).getTime());
                            
                            // If no projects have this phase, we skip rendering or render empty
                            // Rendering empty keeps structure nice
                            if (activePhaseProjects.length === 0) return null;

                            return (
                                <React.Fragment key={phase.key}>
                                    {/* Trade Title Row */}
                                    <div className="col-span-full border-b border-slate-200 bg-slate-50/50 flex">
                                        <div className="w-[200px] border-r border-slate-200 p-3 sticky left-0 z-20 bg-slate-50/90 backdrop-blur-sm flex items-center gap-2">
                                            <span>{phase.icon}</span>
                                            <span className="text-[13px] font-bold text-[#1D1D1F]">{phase.label}</span>
                                        </div>
                                        <div className="flex-1 flex" style={{ display: 'grid', gridTemplateColumns: `repeat(${DAYS_COUNT}, minmax(40px, 1fr))` }}>
                                            {Array.from({length: DAYS_COUNT}).map((_, i) => (
                                                <div key={i} className="border-r border-slate-100" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Project entries within this Trade row */}
                                    {activePhaseProjects.map((proj, pIdx) => {
                                        const pData = proj[phase.key];
                                        const startStr = pData.startDate;
                                        const endStr = pData.completionDate;
                                        const startColIndex = timelineMap.get(startStr);
                                        const endColIndex = timelineMap.get(endStr);
                                        
                                        // Calculate grid column positioning (1-indexed for CSS grid)
                                        // Since first column of dates is column 2 (column 1 is the pinned trade label)
                                        let gridColumnStart = -1;
                                        let gridColumnEnd = -1;

                                        // We need to parse dates if they fall outside the map exactly but intersect our window
                                        const sDate = new Date(startStr);
                                        const eDate = new Date(endStr);
                                        const windowStart = dateArray[0];
                                        const windowEnd = dateArray[DAYS_COUNT - 1];

                                        if (eDate < windowStart || sDate > windowEnd) return null; // completely outside viewport

                                        // Calculate start col
                                        if (sDate < windowStart) gridColumnStart = 2; // cap to left edge (+1 offset for grid, +1 for sidebar = 2)
                                        else gridColumnStart = 2 + (startColIndex !== undefined ? startColIndex : timelineMap.get(sDate.toISOString().slice(0,10)) || 0);

                                        // Calculate end col (non-inclusive end for CSS grid usually, so +1)
                                        if (eDate > windowEnd) gridColumnEnd = 2 + DAYS_COUNT; // cap to right edge
                                        else gridColumnEnd = 2 + (endColIndex !== undefined ? endColIndex : timelineMap.get(eDate.toISOString().slice(0,10)) || 0) + 1; // +1 to cover the day itself entirely

                                        const color = COLORS[pIdx % COLORS.length];

                                        return (
                                            <React.Fragment key={`${phase.key}-${proj.id}`}>
                                                {/* Sticky Project Label */}
                                                <div className="border-b border-slate-100 p-2 sticky left-0 z-10 bg-white flex flex-col justify-center border-r">
                                                    <span className="text-[11px] font-bold text-slate-800 line-clamp-1 truncate" title={proj.clientName}>{proj.clientName}</span>
                                                    <span className="text-[9px] text-[#86868B] truncate leading-none mt-0.5">{proj.projectCode}</span>
                                                </div>

                                                {/* The Gantt Bar Grid Container */}
                                                <div className="border-b border-slate-100 relative group" style={{ gridColumn: `2 / span ${DAYS_COUNT}` }}>
                                                    {/* Background lines mapping */}
                                                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${DAYS_COUNT}, 1fr)`}}>
                                                        {Array.from({length: DAYS_COUNT}).map((_, i) => (
                                                            <div key={i} className="border-r border-slate-50 relative pointer-events-none" />
                                                        ))}
                                                    </div>

                                                    {/* The literal colored bar */}
                                                    <div 
                                                        className={`absolute top-1 bottom-1 rounded-md ${color} bg-opacity-80 hover:bg-opacity-100 border border-white/20 shadow-sm flex items-center px-2 cursor-pointer transition-all z-10`}
                                                        style={{ 
                                                            left: `calc(${(gridColumnStart - 2) / DAYS_COUNT * 100}%)`, 
                                                            width: `calc(${(gridColumnEnd - gridColumnStart) / DAYS_COUNT * 100}%)` 
                                                        }}
                                                        onClick={() => router.push(`/projects/${proj.id}`)}
                                                    >
                                                        <span className="text-[10px] text-white font-bold whitespace-nowrap overflow-hidden text-ellipsis shadow-sm px-1 line-clamp-1">{proj.clientName}</span>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
