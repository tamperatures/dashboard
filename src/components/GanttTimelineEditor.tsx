import React, { useState, useEffect, useRef } from 'react';
import { GanttPhase } from '@/types';
import { Customer } from '@/types';
import { X, Save, ArrowUp, ArrowDown, Plus, Trash2, RefreshCw } from 'lucide-react';
import { getNextWorkingDay, calculateEndDate } from '@/lib/dateUtils';
import { parseISO, format, addDays } from 'date-fns';
import { CONSTRUCTION_PHASES, PHASE_COLORS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GanttTimelineEditorProps {
    project: Customer;
    isOpen: boolean;
    onClose: () => void;
    onSave: (newTimeline: GanttPhase[], overallEndDate: string, globalStartDate: string) => void;
}

export function GanttTimelineEditor({ project, isOpen, onClose, onSave }: GanttTimelineEditorProps) {
    const [timeline, setTimeline] = useState<GanttPhase[]>([]);
    const [autoSchedule, setAutoSchedule] = useState(true);
    const [tradeFilter, setTradeFilter] = useState('all');
    const [globalStartDate, setGlobalStartDate] = useState(project.startDate || format(new Date(), 'yyyy-MM-dd'));
    const listEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize from project or defaults
        if (project.ganttTimeline && project.ganttTimeline.length > 0) {
            setTimeline(JSON.parse(JSON.stringify(project.ganttTimeline)));
        } else {
            setTimeline(CONSTRUCTION_PHASES.map((p, idx) => ({
                id: `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                key: p.key,
                name: p.label,
                duration: 5,
                isIncluded: true,
            })));
        }
    }, [project]);

    // Auto-calculate dates when timeline changes
    useEffect(() => {
        if (!timeline.length || !autoSchedule || !globalStartDate) return;

        let currentStart = getNextWorkingDay(parseISO(globalStartDate));
        const newTimeline = [...timeline];
        let hasChanges = false;

        for (let i = 0; i < newTimeline.length; i++) {
            const st = newTimeline[i];
            if (st.isIncluded && st.duration > 0) {
                const actualStart = st.manualStartDate ? parseISO(st.manualStartDate) : currentStart;
                const end = calculateEndDate(actualStart, st.duration);
                const newStartStr = format(actualStart, 'yyyy-MM-dd');
                const newEndStr = format(end, 'yyyy-MM-dd');

                if (st.calculatedStartDate !== newStartStr || st.calculatedEndDate !== newEndStr) {
                    st.calculatedStartDate = newStartStr;
                    st.calculatedEndDate = newEndStr;
                    hasChanges = true;
                }
                currentStart = getNextWorkingDay(addDays(end, 1));
            } else {
                const actualStart = st.manualStartDate ? parseISO(st.manualStartDate) : currentStart;
                const newStartStr = format(actualStart, 'yyyy-MM-dd');
                if (st.calculatedStartDate !== newStartStr || st.calculatedEndDate !== newStartStr) {
                    st.calculatedStartDate = newStartStr;
                    st.calculatedEndDate = newStartStr;
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            setTimeline(newTimeline);
        }
    }, [timeline, autoSchedule, globalStartDate]);



    const overallEndDate = timeline.filter(t => t.isIncluded && t.duration > 0).pop()?.calculatedEndDate || globalStartDate;

    const handlePhaseChange = (id: string, field: keyof GanttPhase, value: any) => {
        setTimeline(prev => prev.map(st => st.id === id ? { ...st, [field]: value } : st));
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        setTimeline(prev => {
            const newArr = [...prev];
            const temp = newArr[index - 1];
            newArr[index - 1] = newArr[index];
            newArr[index] = temp;
            return newArr;
        });
    };

    const moveDown = (index: number) => {
        if (index === timeline.length - 1) return;
        setTimeline(prev => {
            const newArr = [...prev];
            const temp = newArr[index + 1];
            newArr[index + 1] = newArr[index];
            newArr[index] = temp;
            return newArr;
        });
    };

    const addPhase = () => {
        const newPhase: GanttPhase = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            key: `custom_${Date.now()}`,
            name: '新增項目',
            duration: 5,
            isIncluded: true,
            calculatedStartDate: overallEndDate,
            calculatedEndDate: overallEndDate,
        };
        setTimeline(prev => [...prev, newPhase]);
        setTimeout(() => {
            listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    };

    const removePhase = (id: string) => {
        setTimeline(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="bg-white rounded-[16px] shadow-sm border border-[#E8E8ED] w-full flex flex-col mb-10 overflow-hidden print:border-none print:shadow-none">
            {/* Header matching the screenshot */}
            <div className="p-6 sm:p-8 flex items-start justify-between border-b border-[#F5F5F7]">
                <div className="flex gap-4">
                    <div className="w-[4px] bg-[#0071E3] rounded-full shrink-0" />
                    <div>
                        <h2 className="text-[20px] font-bold text-[#1D1D1F] tracking-tight">工程排程甘特圖</h2>
                        <p className="text-[13px] text-[#86868B] mt-1.5 font-medium max-w-lg">
                            獨立地盤的生命週期排程。輸入預計開工日及天數自動計算完工日 (避開星期日與特定公眾假期)。
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 text-right">
                    <button onClick={() => window.print()} className="h-8 px-4 rounded-lg bg-white border border-[#D1D1D6] hover:bg-[#F5F5F7] text-[#424245] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[#0071E3] outline-none">
                        <Save className="w-3.5 h-3.5" /> 匯出 PDF
                    </button>
                    <label className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider flex items-center gap-1">系統預設開工日 <span className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded-[4px] text-[9px] leading-none">可手動</span></span>
                        <input 
                            type="date" 
                            className="text-[14px] font-bold text-[#1D1D1F] px-2.5 py-1.5 border border-[#D1D1D6] rounded-md focus:ring-2 focus:ring-[#0071E3] outline-none shadow-sm cursor-pointer"
                            value={globalStartDate}
                            onChange={(e) => setGlobalStartDate(e.target.value)}
                        />
                    </label>
                </div>
            </div>

            <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-[#86868B] uppercase tracking-wider">工程類別 / 工種篩選</label>
                        <div className="flex items-center gap-3">
                            <Select value={tradeFilter} onValueChange={setTradeFilter}>
                                <SelectTrigger className="h-9 px-3 w-[200px] border border-[#E8E8ED] bg-[#F5F5F7] rounded-lg text-[13px] font-medium text-[#1D1D1F] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] outline-none shadow-none">
                                    <SelectValue placeholder="全部">
                                        {tradeFilter === 'all' ? '全部工種' : CONSTRUCTION_PHASES.find(p => p.label.startsWith(tradeFilter))?.label || tradeFilter}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部工種</SelectItem>
                                    {CONSTRUCTION_PHASES.map(p => {
                                        const prefixCode = p.label.split(' ')[0];
                                        return (
                                            <SelectItem key={p.key} value={prefixCode}>
                                                {p.label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <button onClick={addPhase} className="h-9 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100/80 text-[12px] font-bold transition-colors border border-blue-200/50 flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5" /> 新增自訂階段
                            </button>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-[13px] font-bold text-[#424245] cursor-pointer group">
                        <RefreshCw className={`w-4 h-4 transition-transform ${autoSchedule ? 'text-[#0071E3] rotate-180' : 'text-[#86868B]'}`} />
                        <input type="checkbox" checked={autoSchedule} onChange={(e) => setAutoSchedule(e.target.checked)} className="rounded border-[#D1D1D6] text-[#0071E3] focus:ring-[#0071E3]/20 w-4 h-4 cursor-pointer" />
                        系統自動避開假日計算
                    </label>
                </div>

                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-[#E8E8ED] px-4 text-[12px] font-bold text-[#86868B] tracking-wider mb-4">
                    <div className="col-span-12 md:col-span-5">工序 / 階段名稱</div>
                    <div className="col-span-12 md:col-span-3">預計開工日期</div>
                    <div className="col-span-12 md:col-span-1 text-center">工作天數</div>
                    <div className="col-span-12 md:col-span-3 pl-4">自動推算完工日期</div>
                </div>


                <div className="space-y-2">
                    {timeline.map((st, idx) => {
                        if (tradeFilter !== 'all' && !st.name.includes(tradeFilter)) return null;
                        const phaseData = CONSTRUCTION_PHASES.find(p => p.key === st.key);
                        const defaultColor = PHASE_COLORS[st.key] || '#0071E3';
                        const currentColor = st.color || defaultColor;
                        return (
                        <div key={st.id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-[12px] border transition-all ${st.isIncluded ? 'bg-white border-transparent hover:bg-slate-50 hover:shadow-sm group' : 'bg-[#F5F5F7] border border-dashed border-[#D1D1D6] opacity-60'}`}>
                            <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                                <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-[#86868B] hover:text-[#0071E3] disabled:opacity-30 p-1 rounded hover:bg-blue-50 transition-colors">
                                        <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => moveDown(idx)} disabled={idx === timeline.length - 1} className="text-[#86868B] hover:text-[#0071E3] disabled:opacity-30 p-1 rounded hover:bg-blue-50 transition-colors">
                                        <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-sm font-semibold bg-white border border-[#E8E8ED] shadow-sm relative">
                                    {phaseData?.icon || '🚧'}
                                    <input
                                        type="checkbox"
                                        checked={st.isIncluded}
                                        onChange={(e) => handlePhaseChange(st.id, 'isIncluded', e.target.checked)}
                                        className="absolute -top-1.5 -right-1.5 rounded text-[#0071E3] focus:ring-[#0071E3]/20 w-4 h-4 cursor-pointer bg-white border-[#D1D1D6] shadow-sm transform transition-transform hover:scale-110"
                                        title="包含 / 排除此階"
                                    />
                                </div>
                                {/* Color picker */}
                                <label className="relative shrink-0 cursor-pointer group/color" title="自訂顏色">
                                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 hover:ring-2 hover:ring-blue-300 transition-all" style={{ backgroundColor: currentColor }} />
                                    <input
                                        type="color"
                                        value={currentColor}
                                        onChange={(e) => handlePhaseChange(st.id, 'color', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </label>
                                <input
                                    type="text"
                                    value={st.name}
                                    onChange={(e) => handlePhaseChange(st.id, 'name', e.target.value)}
                                    className={`w-full bg-transparent border border-transparent hover:border-[#D1D1D6] focus:border-[#0071E3] rounded-md px-2 py-1.5 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all ${st.isIncluded ? 'text-[#1D1D1F]' : 'text-[#86868B] line-through'}`}
                                />
                            </div>

                            {st.isIncluded ? (
                                <>
                                    <div className="md:col-span-3 flex items-center gap-2">
                                        {autoSchedule ? (
                                            <div className="relative w-full">
                                                <input
                                                    type="date"
                                                    value={st.manualStartDate || st.calculatedStartDate || ''}
                                                    onChange={(e) => handlePhaseChange(st.id, 'manualStartDate', e.target.value)}
                                                    className={`w-full px-3 py-2 border rounded-lg text-[13px] font-semibold focus:outline-none focus:ring-2 transition-colors ${st.manualStartDate ? 'border-amber-300 bg-amber-50 text-amber-800 focus:ring-amber-500/20' : 'border-[#E8E8ED] bg-white text-[#424245] focus:border-[#0071E3] focus:ring-[#0071E3]/20'}`}
                                                />
                                                {st.manualStartDate && (
                                                    <button onClick={() => handlePhaseChange(st.id, 'manualStartDate', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700 bg-amber-100 rounded-full p-0.5 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                type="date"
                                                value={st.calculatedStartDate || ''}
                                                onChange={(e) => handlePhaseChange(st.id, 'calculatedStartDate', e.target.value)}
                                                className="w-full px-3 py-2 border border-[#E8E8ED] bg-white rounded-lg text-[13px] font-semibold focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 text-[#424245] transition-colors"
                                            />
                                        )}
                                    </div>

                                    <div className="md:col-span-1 flex justify-center">
                                        <input
                                            type="number"
                                            min="0"
                                            value={st.duration || 0}
                                            onChange={(e) => handlePhaseChange(st.id, 'duration', parseInt(e.target.value) || 0)}
                                            className="w-16 px-2 py-2 border border-[#E8E8ED] rounded-lg text-[13px] font-semibold focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 font-mono text-center text-[#424245]"
                                        />
                                    </div>

                                    <div className="md:col-span-3 flex items-center justify-between gap-3 pl-4">
                                        <input
                                            type="date"
                                            value={st.calculatedEndDate || ''}
                                            disabled={autoSchedule}
                                            onChange={(e) => handlePhaseChange(st.id, 'calculatedEndDate', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg text-[13px] font-semibold focus:outline-none transition-colors ${autoSchedule ? 'border-transparent bg-[#F5F5F7] text-[#86868B] cursor-not-allowed' : 'border-[#E8E8ED] bg-white text-[#424245] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'}`}
                                        />
                                        <button onClick={() => removePhase(st.id)} className="shrink-0 p-2 text-[#D1D1D6] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="刪除項目">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="md:col-span-6 flex items-center justify-center">
                                        <div className="px-4 py-2 bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg text-[12px] font-semibold text-[#86868B] flex items-center gap-2">
                                            🚫 此階段已排除
                                        </div>
                                    </div>
                                    <div className="md:col-span-1 flex justify-end">
                                        <button onClick={() => removePhase(st.id)} className="p-2 text-[#D1D1D6] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )})}
                    <div ref={listEndRef} className="h-1" />
                </div>
            </div>
            <div className="p-6 border-t border-[#F5F5F7] bg-white flex justify-between items-center sm:rounded-b-[16px]">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <span className="text-[13px] font-bold text-blue-800">預計整體完工日:</span>
                    <span className="text-[14px] font-black text-blue-600">{overallEndDate || '未定'}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onSave(timeline, overallEndDate, globalStartDate)} className="h-10 px-6 text-[14px] font-bold text-white bg-[#0071E3] rounded-full hover:bg-[#0077ED] transition-colors flex items-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0071E3]">
                        <Save className="w-4 h-4" /> 儲存變更
                    </button>
                </div>
            </div>
        </div>
    );
}
