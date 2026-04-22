'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Inbox, Loader2, Plus, Flag, Briefcase, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/toast';
import { CONSTRUCTION_PHASES } from '@/lib/constants';

interface TaskEvent {
    id: string;
    originalId?: string;
    projectId: string;
    title: string;
    type: 'milestone' | 'task' | 'meeting' | 'gantt_span' | 'gantt_single' | 'spacer';
    spanStatus?: 'start' | 'middle' | 'end';
    ganttStartDate?: string;
    ganttDuration?: number;
    date: string;
    assigneeId?: string;
    status: 'pending' | 'completed';
    createdAt: string;
}

const EVENT_STYLES: Record<string, { dot: string; bg: string; text: string; label: string, icon: any }> = {
    milestone: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '里程碑', icon: Flag },
    task: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: '分派任務', icon: Briefcase },
    meeting: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: '約見', icon: Clock },
    gantt_single: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', label: '工程進度', icon: Briefcase },
    gantt_span: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', label: '工程進度', icon: Briefcase },
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* Department filter — S01-S05 = 前端 (frontend/sales), P06-P08 = 工程 (engineering) */
const FRONTEND_STAGES = ['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進', 'S05_後續會面'];
const ENGINEERING_STAGES = ['P06_工程啟動', 'P07_工程進行中', 'P08_工程完成'];
type DeptFilter = 'all' | 'frontend' | 'engineering';

/* ───────── Helpers ───────── */
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function formatTime(dateStr: string) {
    if (!dateStr || !dateStr.includes('T')) return null;
    const timeFull = dateStr.split('T')[1];
    if (!timeFull) return null;
    const parts = timeFull.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeFull;
}

function getFirstDayOfWeek(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
    const { user, userData } = useAuth();
    const userRole = userData?.role || 'staff';

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: '',
        type: 'task',
        projectId: '',
        date: '',
        assigneeId: ''
    });
    const [saving, setSaving] = useState(false);
    const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tasksRes, projectsRes, empRes] = await Promise.all([
                fetch('/api/tasks'),
                fetch('/api/projects'),
                userRole === 'admin' || userRole === 'staff' ? fetch('/api/employees') : Promise.resolve({ ok: false, json: () => ({ users: [] }) } as any)
            ]);

            if (tasksRes.ok) {
                const data = await tasksRes.json();
                setTasks(data.tasks || []);
            }
            if (projectsRes.ok) {
                const data = await projectsRes.json();
                setProjects(data.projects || []);
            }
            if (empRes.ok) {
                const data = await empRes.json();
                setEmployees(data.users || []);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!createForm.title || !createForm.projectId || !createForm.date) { toast.warning('請填寫完整資料'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setCreateForm({ title: '', type: 'task', projectId: '', date: '', assigneeId: '' });
                fetchData();
            } else {
                toast.error('創建失敗');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm('確定刪除此事項？')) return;
        try {
            const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch { }
    };

    const toggleTaskStatus = async (task: TaskEvent) => {
        if (task.type === 'meeting') return;
        if (userRole !== 'admin' && userRole !== 'staff') return;
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchData();
        } catch { }
    };

    const allEvents: TaskEvent[] = useMemo(() => {
        const list = [...tasks];
        projects.forEach(p => {
            // Read from meetings array first, fall back to legacy meetingDateTime
            const meetingsArr = (p as any).meetings;
            if (meetingsArr && meetingsArr.length > 0) {
                meetingsArr.forEach((m: any, idx: number) => {
                    if (m.dateTime) {
                        list.push({
                            id: `meeting-${p.id}-${idx}`,
                            projectId: p.id,
                            title: `[約見 #${idx + 1}] ${p.clientName}${m.location ? ` @ ${m.location}` : ''}`,
                            type: 'meeting',
                            date: m.dateTime,
                            status: 'pending',
                            assigneeId: p.pmResponsible || undefined,
                            createdAt: p.createdAt
                        });
                    }
                });
            } else if (p.meetingDateTime) {
                list.push({
                    id: `meeting-${p.id}`,
                    projectId: p.id,
                    title: `[約見] ${p.clientName}`,
                    type: 'meeting',
                    date: p.meetingDateTime,
                    status: 'pending',
                    assigneeId: p.pmResponsible || undefined,
                    createdAt: p.createdAt
                });
            }

            // Sync Construction Start Date
            if (p.startDate) {
                list.push({
                    id: `start-${p.id}`,
                    projectId: p.id,
                    title: `[開工] ${p.clientName}`,
                    type: 'milestone',
                    date: p.startDate,
                    status: 'pending',
                    assigneeId: p.pmResponsible || undefined,
                    createdAt: p.createdAt
                });
            }

            // Sync Construction End Date
            if (p.endDate) {
                list.push({
                    id: `end-${p.id}`,
                    projectId: p.id,
                    title: `[完工交場] ${p.clientName}`,
                    type: 'milestone',
                    date: p.endDate,
                    status: 'pending',
                    assigneeId: p.pmResponsible || undefined,
                    createdAt: p.createdAt
                });
            }

            // Sync Construction Phases (Gantt timeline)
            const timeline = p.ganttTimeline && p.ganttTimeline.length > 0 
                ? p.ganttTimeline 
                : CONSTRUCTION_PHASES.map((c, i) => ({ id: `default-${i}`, key: c.key, name: c.label, isIncluded: true, duration: 5 }));

            timeline.filter((ph: any) => ph.isIncluded).forEach((phase: any) => {
                const startStr = phase.manualStartDate || phase.calculatedStartDate;
                const endStr = phase.calculatedEndDate || startStr;
                
                if (!startStr) return;
                
                const startD = new Date(`${startStr}T00:00:00`);
                const endD = new Date(`${endStr}T00:00:00`);
                const durationDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                if (startStr === endStr) {
                    list.push({
                        id: `gantt-${p.id}-${phase.key || phase.id}`,
                        originalId: `gantt-${p.id}-${phase.key || phase.id}`,
                        projectId: p.id,
                        title: `${phase.name} - ${p.clientName}`,
                        type: 'gantt_single',
                        date: startStr,
                        ganttStartDate: startStr,
                        ganttDuration: 1,
                        status: 'pending',
                        assigneeId: p.pmResponsible || undefined,
                        createdAt: p.createdAt,
                        phaseKey: phase.key || phase.id,
                    } as TaskEvent);
                } else {
                    let currentDate = new Date(startD);
                    while (currentDate <= endD) {
                        const yyyy = currentDate.getFullYear();
                        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(currentDate.getDate()).padStart(2, '0');
                        const dateString = `${yyyy}-${mm}-${dd}`;
                        
                        let spanStatus: 'start' | 'middle' | 'end' = 'middle';
                        if (dateString === startStr) spanStatus = 'start';
                        if (dateString === endStr) spanStatus = 'end';
                        
                        list.push({
                            id: `gantt-${p.id}-${phase.key || phase.id}-${dateString}`,
                            originalId: `gantt-${p.id}-${phase.key || phase.id}`,
                            projectId: p.id,
                            title: `${phase.name} - ${p.clientName}`,
                            type: 'gantt_span',
                            spanStatus: spanStatus,
                            ganttStartDate: startStr,
                            ganttDuration: durationDays,
                            date: dateString,
                            status: 'pending',
                            assigneeId: p.pmResponsible || undefined,
                            createdAt: p.createdAt,
                            phaseKey: phase.key || phase.id,
                        } as TaskEvent);
                        
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
            });
        });
        return list;
    }, [tasks, projects]);

    /* Apply department filter AND Track Packing */
    const filteredEvents = useMemo(() => {
        let events = allEvents;
        if (deptFilter !== 'all') {
            events = allEvents.filter(ev => {
                // Force specific generated events to belong to specific departments
                if (ev.type === 'meeting' || ev.title.includes('[約見]')) {
                    return deptFilter === 'frontend';
                }
                if (ev.type.startsWith('gantt') || ev.title.includes('[開工]') || ev.title.includes('[完工交場]')) {
                    return deptFilter === 'engineering';
                }
    
                // Fallback to project-level stage filtering
                const project = projects.find(p => p.id === ev.projectId);
                if (!project) return true; // show orphaned events regardless
                const stage = project.stage || '';
                if (deptFilter === 'frontend') return FRONTEND_STAGES.includes(stage);
                if (deptFilter === 'engineering') return ENGINEERING_STAGES.includes(stage);
                return true;
            });
        }

        // --- Track Packing Algorithm ensures Gantt Spans never jump vertically ---
        const ganttSpans = new Map<string, { id: string, start: Date, end: Date, duration: number }>();
        events.forEach(e => {
            if (e.type.startsWith('gantt')) {
                const startD = new Date(e.ganttStartDate || e.date);
                const endD = new Date(e.ganttStartDate || e.date);
                endD.setDate(endD.getDate() + (e.ganttDuration || 1) - 1);
                
                const oId = e.originalId || e.id;
                if (!ganttSpans.has(oId)) {
                    ganttSpans.set(oId, { id: oId, start: startD, end: endD, duration: e.ganttDuration || 1 });
                } else {
                    const g = ganttSpans.get(oId)!;
                    if (startD < g.start) g.start = startD;
                    if (endD > g.end) g.end = endD;
                }
            }
        });
        
        const sortedSpans = Array.from(ganttSpans.values()).sort((a, b) => {
            if (a.start.getTime() !== b.start.getTime()) return a.start.getTime() - b.start.getTime();
            if (a.duration !== b.duration) return b.duration - a.duration;
            return a.id.localeCompare(b.id);
        });
        
        const trackEnds: number[] = [];
        const assignedTracks = new Map<string, number>();
        
        sortedSpans.forEach(span => {
            const startT = span.start.getTime();
            let trackIndex = -1;
            for (let i = 0; i < trackEnds.length; i++) {
                if (trackEnds[i] < startT) {
                    trackIndex = i;
                    break;
                }
            }
            if (trackIndex === -1) {
                trackIndex = trackEnds.length;
                trackEnds.push(span.end.getTime());
            } else {
                trackEnds[trackIndex] = span.end.getTime();
            }
            assignedTracks.set(span.id, trackIndex);
        });
        
        // Finalize list with slot indexes
        events.forEach(e => {
            if (e.type.startsWith('gantt')) {
                const oId = e.originalId || e.id;
                (e as any).ganttSlotIndex = assignedTracks.get(oId);
            }
        });
        
        return events;
    }, [allEvents, deptFilter, projects]);



    const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
    const firstDay = useMemo(() => getFirstDayOfWeek(year, month), [year, month]);
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const monthLabel = new Date(year, month).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' });

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
        setSelectedDay(null);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
        setSelectedDay(null);
    };
    const goToday = () => {
        setYear(now.getFullYear());
        setMonth(now.getMonth());
        setSelectedDay(now.getDate());
    };

    const isToday = (day: number) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

    // Compute events mapped to calendar layout
    const getEventsForDay = (day: number) => {
        const targetDate = new Date(year, month, day);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        const dayEvents = filteredEvents.filter(t => t.date.startsWith(dateString));
        
        // Isolate Gantt tasks which have fixed Slot Indexes to maintain visual sequence
        const ganttEvents = dayEvents.filter(e => (e as any).ganttSlotIndex !== undefined);
        const regularEvents = dayEvents.filter(e => (e as any).ganttSlotIndex === undefined);
        
        const packedEvents: TaskEvent[] = [];
        if (ganttEvents.length > 0) {
            const maxSlot = Math.max(...ganttEvents.map(e => (e as any).ganttSlotIndex));
            for (let i = 0; i <= maxSlot; i++) {
                const ev = ganttEvents.find(e => (e as any).ganttSlotIndex === i);
                if (ev) packedEvents.push(ev);
                else packedEvents.push({
                    id: `spacer-${dateString}-${i}`,
                    projectId: '',
                    title: '',
                    type: 'spacer',
                    date: dateString,
                    status: 'pending',
                    createdAt: ''
                });
            }
        }
        
        return [...packedEvents, ...regularEvents];
    };

    const selectedEvents = selectedDay ? getEventsForDay(selectedDay).filter(e => e.type !== 'spacer') : [];

    // Sort upcoming events (only from today onwards), respecting filter
    const upcomingEvents = filteredEvents.filter(t => new Date(t.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

    if (loading) {
        return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <motion.div className="max-w-[1600px] mx-auto space-y-8 pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="apple-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#1D1D1F]">日程與任務</h2>
                    </div>
                    <p className="text-[14px] text-[#86868B] mt-1">查看專案大綱、指派任務及即將到期的事項</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Department Filter */}
                    <div className="flex items-center bg-[#F5F5F7] rounded-xl p-1 gap-0.5">
                        <button
                            onClick={() => setDeptFilter('all')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${deptFilter === 'all'
                                ? 'bg-white text-[#1D1D1F] shadow-sm'
                                : 'text-[#86868B] hover:text-[#424245]'
                                }`}
                        >
                            全部
                        </button>
                        <button
                            onClick={() => setDeptFilter('frontend')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${deptFilter === 'frontend'
                                ? 'bg-white text-[#0071E3] shadow-sm'
                                : 'text-[#86868B] hover:text-[#424245]'
                                }`}
                        >
                            前端部門
                        </button>
                        <button
                            onClick={() => setDeptFilter('engineering')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${deptFilter === 'engineering'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-[#86868B] hover:text-[#424245]'
                                }`}
                        >
                            工程部門
                        </button>
                    </div>


                    <button onClick={() => window.print()} className="h-[36px] px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm">
                        <Inbox className="w-4 h-4" /> 匯出排程 (PDF)
                    </button>

                    {(userRole === 'admin' || userRole === 'staff') && (
                        <button onClick={() => setIsCreateModalOpen(true)} className="h-[40px] px-5 rounded-[980px] bg-[#0071e3] hover:bg-[#0077ED] text-white text-[15px] font-normal flex items-center gap-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]">
                            <Plus className="w-4 h-4" /> 新增排程
                        </button>
                    )}
                </div>
            </div>

            {/* Active filter indicator */}
            {deptFilter !== 'all' && (
                <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-[#86868B]" />
                    <span className="text-xs font-semibold text-[#86868B]">
                        正在篩選：{deptFilter === 'frontend' ? '前端部門 (S01-S05 查詢/準備/報價/跟進/會面)' : '工程部門 (P06-P08 啟動/進行中/完成)'}
                    </span>
                    <button onClick={() => setDeptFilter('all')} className="text-xs font-bold text-[#0071E3] hover:underline">清除篩選</button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                    {/* Left: Calendar Grid */}
                    <Card className="xl:col-span-3 border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] overflow-hidden bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-6 pt-6 px-8 bg-white border-b border-[#F5F5F7]">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-[#86868B]" />
                                <CardTitle className="apple-display text-[21px] font-semibold text-[#1D1D1F] tracking-tight">{monthLabel}</CardTitle>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button onClick={goToday} className="px-3 py-1.5 rounded-[980px] text-[13px] font-semibold bg-white border border-[#E8E8ED] text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]">
                                    回到今天
                                </button>
                                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 border-b border-slate-100">
                                {WEEKDAYS.map((day, idx) => (
                                    <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 bg-slate-100/30">
                                {Array.from({ length: totalCells }, (_, i) => {
                                    const dayNum = i - firstDay + 1;
                                    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                                    const today = inMonth && isToday(dayNum);
                                    const selected = inMonth && dayNum === selectedDay;
                                    const events = inMonth ? getEventsForDay(dayNum) : [];

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => inMonth && setSelectedDay(dayNum)}
                                            className={`min-h-[120px] p-2 border-r border-b border-slate-100 cursor-pointer overflow-hidden transition-all ${!inMonth ? 'bg-slate-50/60' : 'bg-white hover:bg-slate-50/50'} ${selected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/10' : ''}`}
                                        >
                                            {inMonth && (
                                                <div className="h-full flex flex-col">
                                                    <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-lg mb-1 ${today ? 'bg-blue-600 text-white shadow-sm' : selected ? 'text-blue-700 bg-blue-100/50' : 'text-slate-600'}`}>
                                                        {dayNum}
                                                    </span>

                                                    {/* Events List for Day */}
                                                    <div className="flex-1 space-y-1 overflow-visible pr-0 custom-scrollbar mt-1">
                                                        {events.map((e, j) => {
                                                            if (e.type === 'spacer') {
                                                                return <div key={e.id} className="h-[22px] min-h-[22px] w-full" />;
                                                            }
                                                            if (e.type === 'gantt_span') {
                                                                const isStartDay = e.spanStatus === 'start';
                                                                const isEndDay = e.spanStatus === 'end';
                                                                const showText = isStartDay; // Only show text on the very first day
                                                                
                                                                const leftMargin = isStartDay ? '0' : '-8px';
                                                                const rightMargin = isEndDay ? '0' : '-13px';
                                                                const radius = isStartDay && isEndDay ? 'rounded-md' : isStartDay ? 'rounded-l-md rounded-r-none' : isEndDay ? 'rounded-l-none rounded-r-md' : 'rounded-none';
                                                                const borderStyle = isStartDay ? 'border-l-[3px] border-blue-500' : 'border-l-0';
                                                                
                                                                return (
                                                                    <div key={e.id} className="relative z-10" style={{ marginLeft: leftMargin, marginRight: rightMargin }}>
                                                                        <div className={`h-[22px] flex items-center ${radius} ${borderStyle} bg-blue-500/15 hover:bg-blue-500/25 transition-colors cursor-pointer`}>
                                                                            {showText && (
                                                                                <span className="text-[10px] font-semibold text-blue-700 pl-1.5 truncate select-none tracking-[0.01em]">
                                                                                    {e.title}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            if (e.type === 'gantt_single') {
                                                                return (
                                                                    <div key={e.id} className="h-[22px] flex items-center rounded-md border-l-[3px] border-blue-500 bg-blue-500/15 hover:bg-blue-500/25 transition-colors cursor-pointer relative z-10">
                                                                        <span className="text-[10px] font-semibold text-blue-700 pl-1.5 truncate select-none tracking-[0.01em]">{e.title}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            const style = EVENT_STYLES[e.type] || EVENT_STYLES.task;
                                                            const time = formatTime(e.date);
                                                            const displayTitle = time ? `${time} ${e.title}` : e.title;
                                                            return (
                                                                <div key={j} className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1.5 rounded-lg truncate border ${style.bg} ${style.text} border-${style.text.replace('text-', '')}/15 shadow-sm`}>
                                                                    <style.icon className="w-3 h-3 shrink-0 opacity-80" />
                                                                    <span className="truncate">{e.status === 'completed' ? <span className="line-through opacity-70">{displayTitle}</span> : displayTitle}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Summary Panels */}
                    <div className="space-y-6">
                        {/* Selected Day Panel */}
                        <Card className="border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] bg-white overflow-hidden">
                            <CardHeader className="pb-5 pt-6 px-6 bg-white border-b border-[#F5F5F7]">
                                <CardTitle className="apple-display text-[17px] font-semibold text-[#1D1D1F]">
                                    {selectedDay ? `${month + 1}月${selectedDay}日 詳情` : '選擇日期'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5 px-6 bg-white">
                                {selectedEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedEvents.map((e, i) => {
                                            const style = EVENT_STYLES[e.type];
                                            const project = projects.find(p => p.id === e.projectId);
                                            const assignee = employees.find(emp => emp.id === e.assigneeId);

                                            return (
                                                <div key={e.id} className={`p-4 rounded-2xl border transition-all ${e.status === 'completed' ? 'opacity-60 bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md'}`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                                                                <style.icon className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <p className={`text-[14px] font-bold truncate leading-tight ${e.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{e.title}</p>
                                                                {formatTime(e.date) && (
                                                                    <p className="text-[11px] font-semibold text-amber-600 mt-1 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" /> {formatTime(e.date)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                                            {e.type !== 'meeting' && !e.type.startsWith('gantt') && (
                                                                <>
                                                                    <button onClick={() => toggleTaskStatus(e)} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                                                        {e.status === 'completed' ? '還原' : '完成'}
                                                                    </button>
                                                                    {(userRole === 'admin') && <button onClick={() => handleDeleteTask(e.id)} className="text-[10px] text-red-500 hover:underline">刪除</button>}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                                                        <Badge variant="outline" className={`bg-slate-50 text-[10px] font-bold px-2 py-0.5 text-slate-600 border-slate-200 rounded-md`}>{project?.projectCode || '未知項目'}</Badge>
                                                        {e.type === 'task' && assignee && (
                                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-[10px] px-2 py-0.5 rounded-md">
                                                                @ {assignee.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center">
                                        <Calendar className="h-8 w-8 mx-auto text-slate-200 mb-3" />
                                        <p className="text-xs font-semibold text-slate-400">當日沒有事項紀錄</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Upcoming Panel */}
                        <Card className="border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] bg-white">
                            <CardHeader className="pb-5 pt-6 px-6 border-b border-[#F5F5F7]">
                                <CardTitle className="apple-display text-[17px] font-semibold text-[#1D1D1F] flex items-center gap-2"><Clock className="h-4 w-4 text-[#86868B]" /> 即將到來</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5 px-6 bg-white">
                                {upcomingEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingEvents.map((e, i) => {
                                            const style = EVENT_STYLES[e.type];
                                            return (
                                                <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                                    <div className="w-10 h-11 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                                        <div className="bg-slate-200/60 w-full text-center py-0.5">
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                        </div>
                                                        <span className="text-[15px] font-bold text-slate-800 leading-none mt-1 mb-1">{new Date(e.date).getDate()}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-800 text-[13px] truncate">{e.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {formatTime(e.date) && (
                                                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                                    <Clock className="w-3 h-3" /> {formatTime(e.date)}
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>{style.label}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <Inbox className="h-6 w-6 mx-auto text-slate-200 mb-2" />
                                        <p className="text-xs text-slate-400 font-medium">尚無近期事項</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[480px] p-6 sm:p-8">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="flex items-center gap-2 text-[#1D1D1F] tracking-tight font-bold text-[18px]">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <Plus className="w-5 h-5 text-[#0071E3]" />
                            </div>
                            新增排程或任務
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">事項類型 <span className="text-red-500">*</span></label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v, assigneeId: '' })}>
                                <SelectTrigger className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] transition-colors rounded-xl px-4 shadow-none focus:ring-2 focus:ring-[#0071E3]/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#E8E8ED] shadow-lg">
                                    <SelectItem value="milestone" className="rounded-lg my-1">📌 專案里程碑 (如: 開工日)</SelectItem>
                                    <SelectItem value="task" className="rounded-lg my-1">💼 員工任務 (如: 訂網)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">標題 <span className="text-red-500">*</span></label>
                            <Input placeholder="輸入事項名稱" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] transition-colors rounded-xl px-4 shadow-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/20" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">關聯項目 <span className="text-red-500">*</span></label>
                            <Select value={createForm.projectId} onValueChange={v => setCreateForm({ ...createForm, projectId: v })}>
                                <SelectTrigger className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] transition-colors rounded-xl px-4 shadow-none focus:ring-2 focus:ring-[#0071E3]/20">
                                    <SelectValue placeholder="選擇關聯的專案..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#E8E8ED] shadow-lg">
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="rounded-lg my-0.5">{p.projectCode} - {p.clientName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">日期 <span className="text-red-500">*</span></label>
                            <Input type="date" value={createForm.date} onChange={e => setCreateForm({ ...createForm, date: e.target.value })} className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] transition-colors rounded-xl px-4 shadow-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/20" />
                        </div>

                        {createForm.type === 'task' && (
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">指派給</label>
                                <Select value={createForm.assigneeId} onValueChange={v => setCreateForm({ ...createForm, assigneeId: v })}>
                                    <SelectTrigger className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] transition-colors rounded-xl px-4 shadow-none focus:ring-2 focus:ring-[#0071E3]/20">
                                        <SelectValue placeholder="選擇指派員工 (可選)..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-[#E8E8ED] shadow-lg">
                                        <SelectItem value="unassigned" className="rounded-lg my-0.5">未指派</SelectItem>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id} className="rounded-lg my-0.5">{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="pt-4 border-t border-[#E8E8ED]/60 mt-2">
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl h-11 px-6 font-bold text-[#424245] border-transparent hover:bg-[#F5F5F7]">取消</Button>
                        <Button onClick={handleCreateTask} disabled={saving} className="bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl h-11 px-8 font-bold border-none transition-all shadow-[0_2px_10px_rgba(0,113,227,0.2)] hover:shadow-[0_4px_16px_rgba(0,113,227,0.4)]">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            儲存事項
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </motion.div>
    );
}

