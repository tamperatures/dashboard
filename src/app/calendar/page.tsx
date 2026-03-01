'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Calendar, ChevronLeft, ChevronRight, Clock,
    MapPin, Hammer, Paintbrush, Droplets, Sofa, Zap, Wrench,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ───────── Types ───────── */
interface CalendarEvent {
    day: number;
    title: string;
    type: 'milestone' | 'visit' | 'delivery' | 'deadline';
    time?: string;
}

/* ───────── Mock Events ───────── */
const EVENTS: CalendarEvent[] = [
    { day: 3, title: '陳先生 泥水驗收', type: 'milestone', time: '10:00' },
    { day: 5, title: '王太 傢俬安裝', type: 'delivery', time: '09:00' },
    { day: 7, title: '張先生 現場約見', type: 'visit', time: '14:30' },
    { day: 10, title: '黃小姐 油漆完工', type: 'milestone', time: '16:00' },
    { day: 12, title: '李太 設計會議', type: 'visit', time: '11:00' },
    { day: 15, title: '陳先生 工程完工', type: 'deadline', time: '—' },
    { day: 18, title: '新項目 現場度尺', type: 'visit', time: '10:30' },
    { day: 20, title: '黃小姐 材料送達', type: 'delivery', time: '08:00' },
    { day: 22, title: '王太 最終驗收', type: 'deadline', time: '15:00' },
    { day: 25, title: '張先生 報價跟進', type: 'visit', time: '14:00' },
    { day: 28, title: '李太 平面圖確認', type: 'milestone', time: '16:00' },
];

const EVENT_STYLES: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    milestone: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: '里程碑' },
    visit: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: '約見' },
    delivery: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: '送貨' },
    deadline: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', label: '截止' },
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* ───────── Helpers ───────── */
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

/* ───────── Animation ───────── */
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

/* ───────── Page ───────── */
export default function CalendarPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

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
    const getEventsForDay = (day: number) => EVENTS.filter(e => e.day === day);

    const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];
    const upcomingEvents = EVENTS.filter(e => e.day >= (now.getDate())).slice(0, 5);

    return (
        <motion.div
            className="max-w-[1600px] mx-auto space-y-8 pb-12"
            initial="hidden" animate="show" variants={container}
        >
            {/* ─── Header ─── */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">工程日程</h2>
                    <p className="text-sm text-slate-500 mt-1">查看約見、工程里程碑及重要日期</p>
                </div>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* ─── Calendar Grid ─── */}
                <Card className="xl:col-span-3 shadow-sm border-slate-200/60">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-slate-600" />
                            <CardTitle className="text-lg font-semibold text-slate-900">{monthLabel}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                今天
                            </button>
                            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pb-1 px-1">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7">
                            {WEEKDAYS.map((day, idx) => (
                                <div
                                    key={day}
                                    className={`py-2.5 text-center text-xs font-bold uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-rose-400' : 'text-slate-400'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-px bg-slate-100/50 rounded-xl overflow-hidden">
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
                                        className={`min-h-[90px] p-2 bg-white cursor-pointer transition-colors ${!inMonth ? 'bg-slate-50/50' : ''
                                            } ${selected ? 'bg-slate-900/[0.03] ring-1 ring-inset ring-slate-900/10' : 'hover:bg-slate-50'}`}
                                    >
                                        {inMonth && (
                                            <>
                                                <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-lg transition-colors ${today
                                                        ? 'bg-slate-900 text-white shadow-sm'
                                                        : selected
                                                            ? 'text-slate-900'
                                                            : 'text-slate-600'
                                                    }`}>
                                                    {dayNum}
                                                </span>
                                                {/* Event Dots */}
                                                {events.length > 0 && (
                                                    <div className="mt-1 space-y-0.5">
                                                        {events.slice(0, 2).map((e, j) => (
                                                            <div key={j} className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${EVENT_STYLES[e.type].bg} ${EVENT_STYLES[e.type].text}`}>
                                                                {e.title.split(' ').slice(-1)[0]}
                                                            </div>
                                                        ))}
                                                        {events.length > 2 && (
                                                            <div className="text-[10px] text-slate-400 pl-1.5">+{events.length - 2} 更多</div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 px-4 py-3 text-xs text-slate-500">
                            {Object.entries(EVENT_STYLES).map(([key, style]) => (
                                <span key={key} className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                    {style.label}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Side Panel ─── */}
                <div className="space-y-6">
                    {/* Selected Day Detail */}
                    <Card className="shadow-sm border-slate-200/60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-slate-900">
                                {selectedDay ? `${month + 1}月${selectedDay}日` : '選擇日期'}
                            </CardTitle>
                            <CardDescription>
                                {selectedDay ? `${selectedEvents.length} 個事項` : '點擊日曆查看詳情'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedEvents.map((e, i) => {
                                        const style = EVENT_STYLES[e.type];
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.08 }}
                                                className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
                                            >
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{e.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className={`text-[10px] font-bold border-transparent ${style.bg} ${style.text}`}>
                                                            {style.label}
                                                        </Badge>
                                                        {e.time && (
                                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" /> {e.time}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-400">
                                        {selectedDay ? '當日沒有事項' : '請選擇日期'}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Events */}
                    <Card className="shadow-sm border-slate-200/60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-slate-900">即將到來</CardTitle>
                            <CardDescription>本月接下來的事項</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {upcomingEvents.map((e, i) => {
                                    const style = EVENT_STYLES[e.type];
                                    return (
                                        <div key={i} className="flex items-center gap-3 text-sm">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${style.bg} ${style.text} shrink-0`}>
                                                {e.day}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-700 truncate text-sm">{e.title}</p>
                                                <p className="text-[11px] text-slate-400">{e.time}</p>
                                            </div>
                                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </motion.div>
    );
}
