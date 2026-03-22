'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
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
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
        });
        return list;
    }, [tasks, projects]);

    /* Apply department filter */
    const filteredEvents = useMemo(() => {
        if (deptFilter === 'all') return allEvents;
        return allEvents.filter(ev => {
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
                    <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">工程日程與任務</h2>
                    <p className="text-sm text-[#86868B] mt-1">查看專案大綱、指派任務及即將到期的事項</p>
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
                        <Button onClick={() => setIsCreateModalOpen(true)} className="h-9 gap-2 text-sm font-semibold">
                            <Plus className="w-4 h-4" /> 新增排程
                        </Button>
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
                <Card className="xl:col-span-3 shadow-sm border-slate-200/60 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 bg-slate-50/50 border-b border-slate-100/60 px-6">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-slate-600" />
                            <CardTitle className="text-lg font-semibold text-slate-900">{monthLabel}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
                                回到今天
                            </button>
                            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors">
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
                    <Card className="shadow-sm border-slate-200/60 overflow-hidden">
                        <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-900">
                                {selectedDay ? `${month + 1}月${selectedDay}日 詳情` : '選擇日期'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-4 bg-white">
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
                    <Card className="shadow-sm border-slate-200/60">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> 即將到來</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-4 bg-white">
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

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>新增排程或任務</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">事項類型 <span className="text-red-500">*</span></label>
                            <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v, assigneeId: '' })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="milestone">📌 專案里程碑 (如: 開工日)</SelectItem>
                                    <SelectItem value="task">💼 員工任務 (如: 訂網)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">標題 <span className="text-red-500">*</span></label>
                            <Input placeholder="輸入事項名稱" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">關聯項目 <span className="text-red-500">*</span></label>
                            <Select value={createForm.projectId} onValueChange={v => setCreateForm({ ...createForm, projectId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選擇關聯的專案..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.projectCode} - {p.clientName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">日期 <span className="text-red-500">*</span></label>
                            <Input type="date" value={createForm.date} onChange={e => setCreateForm({ ...createForm, date: e.target.value })} />
                        </div>

                        {createForm.type === 'task' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600">指派給</label>
                                <Select value={createForm.assigneeId} onValueChange={v => setCreateForm({ ...createForm, assigneeId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選擇指派員工 (可選)..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">未指派</SelectItem>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>取消</Button>
                        <Button onClick={handleCreateTask} disabled={saving} className="bg-slate-900 text-white">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            儲存事項
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </motion.div>
    );
}

