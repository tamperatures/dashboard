import React, { useMemo, useState, useEffect } from 'react';
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  min,
  max,
  isWeekend,
  addDays,
  subDays,
  differenceInDays,
  startOfDay,
  isValid
} from 'date-fns';
import { isHKHoliday } from '@/lib/dateUtils';
import { Filter, ExternalLink } from 'lucide-react';
import { CONSTRUCTION_PHASES, PHASE_COLORS as CONSTANT_PHASE_COLORS } from '@/lib/constants';
import Link from 'next/link';

const DEFAULT_PHASES = CONSTRUCTION_PHASES.map(p => p.label);

// Dynamically map labels to hex color values based on the source of truth
const PHASE_COLORS_BY_LABEL = CONSTRUCTION_PHASES.reduce((acc, phase) => {
  acc[phase.label] = CONSTANT_PHASE_COLORS[phase.key] || '#0071E3';
  return acc;
}, {} as Record<string, string>);

// Resolve color for a gantt task: custom override → key lookup → name lookup → fallback
function resolveBarColor(st: any): string {
  if (st.color) return st.color; // user custom color
  if (st.key && CONSTANT_PHASE_COLORS[st.key]) return CONSTANT_PHASE_COLORS[st.key]; // key-based (stable)
  if (st.name && PHASE_COLORS_BY_LABEL[st.name]) return PHASE_COLORS_BY_LABEL[st.name]; // name-based (legacy)
  return '#0071E3'; // fallback blue
}

interface AdvancedGanttChartProps {
  projects: any[]; // Supports Mongoose Document format (Customer / Project)
}

export function AdvancedGanttChart({ projects }: AdvancedGanttChartProps) {
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredProjects = useMemo(() => {
    if (phaseFilter === 'ALL') return projects;
    return projects.filter(p => 
      p.ganttTimeline?.some((st: any) => st.isIncluded !== false && st.name === phaseFilter)
    );
  }, [projects, phaseFilter]);

  const { days, minDate } = useMemo(() => {
    if (filteredProjects.length === 0) {
      const today = new Date();
      return {
        days: eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) }),
        minDate: startOfMonth(today),
      };
    }

    const allStartDates: Date[] = [];
    const allEndDates: Date[] = [];

    filteredProjects.forEach((p) => {
      // Collect dates from ganttTimeline
      p.ganttTimeline?.forEach((st: any) => {
        if (st.isIncluded !== false && (phaseFilter === 'ALL' || st.name === phaseFilter)) {
          if (st.calculatedStartDate) {
            const parsed = parseISO(st.calculatedStartDate);
            if (isValid(parsed)) allStartDates.push(parsed);
          }
          if (st.calculatedEndDate) {
            const parsed = parseISO(st.calculatedEndDate);
            if (isValid(parsed)) allEndDates.push(parsed);
          }
        }
      });
    });

    const minStart = allStartDates.length > 0 ? min(allStartDates) : new Date();
    const maxEnd = allEndDates.length > 0 ? max(allEndDates) : addDays(new Date(), 30);

    // Add some padding
    const chartStart = subDays(minStart, 3);
    const chartEnd = addDays(maxEnd, 7);

    return {
      days: eachDayOfInterval({ start: chartStart, end: chartEnd }),
      minDate: chartStart,
    };
  }, [filteredProjects, phaseFilter]);

  // Group days by month for the header
  const months = useMemo(() => {
    const result: { month: string; colSpan: number }[] = [];
    if (days.length === 0) return result;

    let currentMonth = format(days[0], 'MMM yyyy');
    let count = 0;

    days.forEach((day) => {
      const monthStr = format(day, 'MMM yyyy');
      if (monthStr === currentMonth) {
        count++;
      } else {
        result.push({ month: currentMonth, colSpan: count });
        currentMonth = monthStr;
        count = 1;
      }
    });
    result.push({ month: currentMonth, colSpan: count });

    return result;
  }, [days]);

  if (!mounted) return null;

  if (projects.length === 0) {
    return (
      <div className="bg-white p-12 rounded-[24px] shadow-sm border border-[#E8E8ED] text-center text-[#86868B] font-semibold text-sm">
        目前沒有工程 (No projects available)
      </div>
    );
  }

  const CELL_WIDTH = 40; // px
  const SIDEBAR_WIDTH = 250; // px

  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-[#E8E8ED] overflow-hidden flex flex-col font-sans">
      {/* Header and Legend */}
      <div className="p-5 border-b border-[#F5F5F7] bg-slate-50/50 flex flex-col gap-4 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-[17px] font-bold text-[#1D1D1F] tracking-tight">工程進度表 (Gantt Chart)</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-[13px] font-bold text-[#86868B]">顯示工序 (Filter):</span>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="text-[13px] font-semibold text-[#1D1D1F] border border-[#D1D1D6] rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] shadow-sm cursor-pointer"
            >
              <option value="ALL">全部顯示 (Show All)</option>
              {DEFAULT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-semibold">
          <div className="flex items-center mr-1">
            <span className="text-[#86868B] tracking-wider uppercase">圖例 (Legend):</span>
          </div>
          {DEFAULT_PHASES.map((p, idx) => {
             const hexColor = CONSTANT_PHASE_COLORS[CONSTRUCTION_PHASES[idx]?.key] || '#6366f1';
             return (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: hexColor }}></div>
                <span className="text-slate-600">{p}</span>
              </div>
            );
          })}
          <div className="w-px h-4 bg-slate-300 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-rose-50 border border-rose-200 rounded-[3px]"></div>
            <span className="text-slate-600">公眾假期</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-[3px]"></div>
            <span className="text-slate-600">週末</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-[#D1D1D6] scrollbar-track-transparent">
        <div className="inline-block min-w-full align-middle">
          {/* Header Rows */}
          <div className="flex border-b border-[#F5F5F7]">
            {/* Sidebar Header */}
            <div
              className="sticky left-0 z-20 bg-white border-r border-[#E8E8ED] flex-shrink-0 flex items-end pb-2 px-6 font-bold text-[#86868B] text-[12px] tracking-wider uppercase"
              style={{ width: SIDEBAR_WIDTH }}
            >
              工程名稱 (Project Name)
            </div>

            {/* Timeline Header */}
            <div className="flex flex-col">
              {/* Months */}
              <div className="flex border-b border-[#F5F5F7]">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="text-center text-[12px] font-bold text-[#1D1D1F] py-1 border-r border-[#F5F5F7] bg-slate-50/50"
                    style={{ width: m.colSpan * CELL_WIDTH }}
                  >
                    {m.month}
                  </div>
                ))}
              </div>
              {/* Days */}
              <div className="flex">
                {days.map((day, i) => {
                  const isWknd = isWeekend(day);
                  const isHol = isHKHoliday(format(day, 'yyyy-MM-dd'));
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center py-1.5 border-r border-[#F5F5F7] text-[11px] font-semibold
                        ${isHol ? 'bg-rose-50 text-rose-600' : isWknd ? 'bg-slate-50 text-slate-500' : 'text-slate-700'}
                        ${isToday ? 'font-black text-white bg-[#0071E3] rounded-t-sm shadow-inner' : ''}
                      `}
                      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                    >
                      <span>{format(day, 'd')}</span>
                      <span className="text-[9px] opacity-70 uppercase tracking-widest leading-none mt-0.5">{format(day, 'EEEEE')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Project Rows */}
          <div className="relative">
            {filteredProjects.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                沒有符合條件的工程。(No projects match the selected filter.)
              </div>
            )}
            {filteredProjects.map((project) => {
              
              // Only consider subtasks with valid dates
              const validTasks = (project.ganttTimeline || []).filter((st: any) => 
                st.isIncluded !== false && 
                st.calculatedStartDate && 
                st.calculatedEndDate && 
                (phaseFilter === 'ALL' || st.name === phaseFilter)
              );

              // Overall project boundary for this rendering (just visual faint bar maybe)
              // We compute bounding min/max from actual tasks
              let rowStart = new Date();
              let rowEnd = new Date();
              if (validTasks.length > 0) {
                 const starts = validTasks.map((t: any) => parseISO(t.calculatedStartDate));
                 const ends = validTasks.map((t: any) => parseISO(t.calculatedEndDate));
                 rowStart = min(starts);
                 rowEnd = max(ends);
              } else if (project.startDate) {
                 rowStart = parseISO(project.startDate);
                 rowEnd = project.completionDate ? parseISO(project.completionDate) : addDays(rowStart, 30);
              }

              // Calculate overall offset and width
              const offsetDays = differenceInDays(startOfDay(rowStart), startOfDay(minDate));
              const durationDays = differenceInDays(startOfDay(rowEnd), startOfDay(rowStart)) + 1; 

              const left = offsetDays * CELL_WIDTH;
              const width = durationDays * CELL_WIDTH;

              // Calculate tracks for overlapping subtasks
              const tracks: { start: Date, end: Date }[][] = [];
              
              // Sort subtasks by start date
              const sortedSubTasks = [...validTasks].sort((a, b) => {
                const startA = parseISO(a.calculatedStartDate).getTime();
                const startB = parseISO(b.calculatedStartDate).getTime();
                return startA - startB;
              });
              
              const placedTasks = sortedSubTasks.map(st => {
                const stStart = parseISO(st.calculatedStartDate);
                const stEnd = parseISO(st.calculatedEndDate);
                
                let trackIndex = 0;
                while (true) {
                  if (!tracks[trackIndex]) {
                    tracks[trackIndex] = [];
                  }
                  const overlaps = tracks[trackIndex].some(t => {
                    // Overlap check
                    return stStart <= t.end && stEnd >= t.start;
                  });
                  
                  if (!overlaps) {
                    tracks[trackIndex].push({ start: stStart, end: stEnd });
                    break;
                  }
                  trackIndex++;
                }
                return { st, trackIndex, stStart, stEnd };
              });

              const numTracks = Math.max(1, tracks.length);
              const TRACK_HEIGHT = 28; 
              const ROW_PADDING_TOP = 16;
              const ROW_PADDING_BOTTOM = 16;
              const calculatedHeight = ROW_PADDING_TOP + ROW_PADDING_BOTTOM + (numTracks * TRACK_HEIGHT);
              const rowMinHeight = Math.max(76, calculatedHeight);

              return (
                <React.Fragment key={project._id || project.id}>
                  <div className="flex border-b border-[#F5F5F7] hover:bg-slate-50/40 group transition-colors" style={{ minHeight: `${rowMinHeight}px` }}>
                    {/* Sidebar */}
                    <div
                      className="sticky left-0 z-20 bg-white group-hover:bg-[#F9F9FB] border-r border-[#E8E8ED] flex-shrink-0 px-6 py-4 flex items-center justify-between transition-colors"
                      style={{ width: SIDEBAR_WIDTH }}
                    >
                      <div className="flex flex-col pr-2 w-full min-w-0">
                        <Link 
                            href={`/projects/${project._id || project.id}`}
                            className="text-[14px] font-semibold text-[#1D1D1F] truncate hover:text-[#0071E3] transition-colors flex items-center gap-1.5" 
                            title={project.clientName}
                        >
                          {project.clientName}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="text-[11px] font-bold text-[#86868B] mt-1 uppercase tracking-wider">
                          {validTasks.length > 0 ? (
                              <>{format(rowStart, 'MMM d')} - {format(rowEnd, 'MMM d')}</>
                          ) : '未配置排程'}
                        </div>
                      </div>
                    </div>

                    {/* Timeline Row */}
                    <div className="relative flex flex-1 overflow-hidden">
                      {/* Background Grid */}
                      {days.map((day, i) => {
                        const isWknd = isWeekend(day);
                        const isHol = isHKHoliday(format(day, 'yyyy-MM-dd'));
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                        return (
                          <div
                            key={i}
                            className={`border-r border-[#F5F5F7] absolute top-0 bottom-0
                              ${isHol ? 'bg-rose-50/40' : isWknd ? 'bg-slate-50/40' : ''}
                              ${isToday ? 'bg-blue-500/5' : ''}
                            `}
                            style={{ left: `${i * CELL_WIDTH}px`, width: CELL_WIDTH }}
                          />
                        );
                      })}

                      {/* Overall Project Background (Faint) */}
                      {phaseFilter === 'ALL' && validTasks.length > 0 && (
                        <div
                          className="absolute rounded-lg overflow-hidden pointer-events-none"
                          style={{
                            top: '8px',
                            bottom: '8px',
                            left: `${left}px`,
                            width: `${width}px`,
                          }}
                        >
                          <div className={`absolute inset-0 opacity-[0.03] bg-black`} />
                        </div>
                      )}

                      {/* Subtask Segments */}
                      {placedTasks.map(({ st, trackIndex, stStart, stEnd }) => {
                        const stOffsetDays = differenceInDays(startOfDay(stStart), startOfDay(minDate));
                        const stDurationDays = differenceInDays(startOfDay(stEnd), startOfDay(stStart)) + 1;
                        const stLeft = stOffsetDays * CELL_WIDTH;
                        const stWidth = stDurationDays * CELL_WIDTH;
                        
                        const stColor = resolveBarColor(st);

                        return (
                          <div
                            key={st.id}
                            className={`absolute h-[22px] rounded-[6px] shadow-sm overflow-hidden group/stbar border-r border-white/20 last:border-r-0 hover:ring-2 hover:ring-white/50 hover:z-10 transition-all cursor-default select-none`}
                            style={{
                              top: `${ROW_PADDING_TOP + trackIndex * TRACK_HEIGHT}px`,
                              left: `${stLeft}px`,
                              width: `${stWidth}px`,
                              backgroundColor: stColor,
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center px-2 text-[10px] font-bold tracking-wide text-white truncate drop-shadow-sm">
                              {st.name}
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 bg-[#1D1D1F] font-semibold text-white text-[11px] rounded-lg opacity-0 group-hover/stbar:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none shadow-lg">
                              {st.name} ({st.duration}天) <br/> <span className="text-[#A1A1A6] font-medium">{format(stStart, 'yyyy-MM-dd')} 至 {format(stEnd, 'yyyy-MM-dd')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
