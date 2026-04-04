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

/* ───────── Types ───────── */
interface TaskEvent {
    id: string;
    projectId: string;
    title: string;
    type: 'milestone' | 'task' | 'meeting';
    date: string;
    assigneeId?: string;
    status: 'pending' | 'completed';
    createdAt: string;
}

const EVENT_STYLES: Record<string, { dot: string; bg: string; text: string; label: string, icon: any }> = {
    milestone: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '里程碑', icon: Flag },
    task: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: '分派任務', icon: Briefcase },
    meeting: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: '約見', icon: Clock },
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* Department filter — S01-S05 = 前端 (frontend/sales), S06-S08 = 工程 (engineering) */
const FRONTEND_STAGES = ['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進', 'S05_後續會面'];
const ENGINEERING_STAGES = ['S06_工程啟動', 'S07_工程進行中', 'S08_工程完成'];
type DeptFilter = 'all' | 'frontend' | 'engineering';

/* ───────── Helpers ───────── */
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
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
        });
        return list;
    }, [tasks, projects]);

    /* Apply department filter */
    const filteredEvents = useMemo(() => {
        if (deptFilter === 'all') return allEvents;
        return allEvents.filter(ev => {
            // Force specific generated events to belong to specific departments
            if (ev.type === 'meeting' || ev.title.includes('[約見]')) {
                return deptFilter === 'frontend';
            }
            if (ev.title.includes('[開工]') || ev.title.includes('[完工交場]')) {
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
        return filteredEvents.filter(t => t.date.startsWith(dateString));
    };

    const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

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
                    <h2 className="apple-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#1D1D1F]">日程與任務</h2>
                    <p className="text-[14px] text-[#86868B] mt-1">查看專案大綱、指派任務及即將到期的事項</p>
                </div>
                <div className="flex items-center gap-3">
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
                        正在篩選：{deptFilter === 'frontend' ? '前端部門 (S01-S05 查詢/準備/報價/跟進/會面)' : '工程部門 (S06-S08 啟動/進行中/完成)'}
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
                                                <div className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                                                    {events.map((e, j) => {
                                                        const style = EVENT_STYLES[e.type];
                                                        return (
                                                            <div key={j} className={`text-[10px] font-semibold px-2 py-1 rounded truncate border ${style.bg} ${style.text} border-${style.text.replace('text-', '')}/10`}>
                                                                {e.status === 'completed' ? <span className="line-through opacity-70">{e.title}</span> : e.title}
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
                                            <div key={e.id} className={`p-3 rounded-xl border transition-all ${e.status === 'completed' ? 'opacity-60 bg-slate-50 border-slate-200' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'}`}>
                                                <div className="flex items-start justify-between mb-1.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <style.icon className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                                                        <p className={`text-[13px] font-semibold truncate ${e.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{e.title}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {e.type !== 'meeting' && (
                                                            <>
                                                                <button onClick={() => toggleTaskStatus(e)} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                                                                    {e.status === 'completed' ? '還原' : '完成'}
                                                                </button>
                                                                {(userRole === 'admin') && <button onClick={() => handleDeleteTask(e.id)} className="text-[10px] text-red-500 hover:underline">刪除</button>}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 mt-2">
                                                    <Badge variant="outline" className={`w-fit text-[9px] font-bold px-1.5 py-0 `}>{project?.projectCode || '未知項目'}</Badge>
                                                    {e.type === 'task' && assignee && <span className="text-[10px] text-slate-500 font-medium">@ {assignee.name}</span>}
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
                                            <div key={e.id} className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex flex-col items-center justify-center shrink-0 border border-slate-200/50">
                                                    <span className="text-[9px] font-semibold text-slate-400 uppercase leading-none">{new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    <span className="text-sm font-bold text-slate-700 leading-tight">{new Date(e.date).getDate()}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <p className="font-semibold text-slate-800 text-xs truncate">{e.title}</p>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${style.bg} ${style.text}`}>{style.label}</span>
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

