'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { Loader2, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdvancedGanttChart } from '@/components/AdvancedGanttChart';

export default function ScheduleGridPage() {
    const { userData } = useAuth();
    const userRole = userData?.role || 'staff';
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch('/api/projects');
                if (res.ok) {
                    const data = await res.json();
                    // Optional: You can filter active projects here if needed
                    setProjects(data.projects || []);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    return (
        <motion.div className="max-w-[1600px] mx-auto pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-[#0071E3]" /> 全域工程甘特圖 (Global Gantt)
                    </h2>
                    <p className="text-sm text-[#86868B] mt-1">檢視並總覽所有活躍工程的全局生命週期排程狀態。</p>
                </div>
            </div>

            <div className="w-full">
                <AdvancedGanttChart projects={projects} />
            </div>
        </motion.div>
    );
}
