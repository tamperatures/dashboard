'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
import { PieChart, Pie, ResponsiveContainer, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, DollarSign, HardHat, FolderKanban, Plus, Clock, CheckCircle2,
  Inbox, PenTool, CheckSquare, Briefcase, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ───────────── Types ───────────── */
interface Project {
  id: string; projectCode: string; clientName: string; estate: string;
  address: string; stage: string; progress: number; budget: number;
  startDate: string; endDate: string; renovationType: string; pmResponsible: string;
}

interface TaskEvent {
  id: string; projectId: string; title: string;
  type: 'milestone' | 'task' | 'meeting'; date: string;
  assigneeId?: string; status: 'pending' | 'completed'; createdAt: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } } };

const STAGE_COLORS: Record<string, string> = {
  'S01_客戶查詢': '#F5A623', 'S02_見客前準備': '#8B5CF6', 'S03_初步報價': '#6366F1',
  'S04_見客後跟進': '#D946EF', 'S05_後續會面': '#EC4899', 'S06_工程啟動': '#3B82F6',
  'S07_工程進行中': '#10B981', 'S08_工程完成': '#86868B',
};
const STAGE_LABELS: Record<string, string> = {
  'S01_客戶查詢': 'S01 查詢', 'S02_見客前準備': 'S02 準備', 'S03_初步報價': 'S03 報價',
  'S04_見客後跟進': 'S04 跟進', 'S05_後續會面': 'S05 會面', 'S06_工程啟動': 'S06 啟動',
  'S07_工程進行中': 'S07 進行中', 'S08_工程完成': 'S08 完成',
};

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, [userId]); // eslint-disable-line

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes] = await Promise.all([fetch('/api/projects'), fetch('/api/tasks')]);
      if (projRes.ok) { const d = await projRes.json(); setProjects(d.projects || []); }
      if (tasksRes.ok) { const d = await tasksRes.json(); setTasks(d.tasks || []); }
    } finally { setLoading(false); }
  };

  const toggleTaskStatus = async (task: TaskEvent) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) fetchDashboardData();
    } catch { }
  };

  /* ── Derived data ── */
  const activeProjects = projects.filter(p => p.stage === 'S06_工程啟動' || p.stage === 'S07_工程進行中');
  const completedThisMonth = projects.filter(p => p.stage === 'S08_工程完成');
  const pendingQuotes = projects.filter(p => ['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進', 'S05_後續會面'].includes(p.stage));
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  const allEvents: TaskEvent[] = (() => {
    const list: TaskEvent[] = [...tasks];
    projects.forEach((p: any) => {
      const meetingsArr = p.meetings;
      if (meetingsArr && meetingsArr.length > 0) {
        meetingsArr.forEach((m: any, idx: number) => {
          if (m.dateTime) list.push({ id: `meeting-${p.id}-${idx}`, projectId: p.id, title: `[約見 #${idx + 1}] ${p.clientName}${m.location ? ` @ ${m.location}` : ''}`, type: 'meeting', date: m.dateTime, status: 'pending', assigneeId: p.pmResponsible || undefined, createdAt: p.createdAt });
        });
      } else if (p.meetingDateTime) {
        list.push({ id: `meeting-${p.id}`, projectId: p.id, title: `[約見] ${p.clientName}`, type: 'meeting', date: p.meetingDateTime, status: 'pending', assigneeId: p.pmResponsible || undefined, createdAt: p.createdAt });
      }
    });
    return list;
  })();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pendingTasks = allEvents.filter(t => t.status === 'pending' && new Date(t.date) >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 6);
  const stageData = Object.entries(projects.reduce<Record<string, number>>((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: STAGE_LABELS[name] || name, value, color: STAGE_COLORS[name] || '#86868B' }));
  const hasData = projects.length > 0;

  const KpiCard = ({ label, value, icon: Icon, gradient }: { label: string; value: string | number; icon: React.ElementType; gradient: string }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 sm:p-5 flex flex-row items-center gap-3 sm:gap-4">
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${gradient}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-medium text-[#86868B] uppercase tracking-wider truncate">{label}</p>
          <p className="text-lg sm:text-2xl font-bold text-[#1D1D1F] tracking-tight mt-0.5 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div className="space-y-7 max-w-[1600px] mx-auto pb-12" initial="hidden" animate="show" variants={container}>
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">工程總覽</h2>
          <p className="text-sm text-[#86868B] mt-1">適度裝修設計 · 工程管理系統</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-2 text-sm" onClick={() => router.push('/projects')}>
            <FolderKanban className="h-4 w-4" /> 所有項目
          </Button>
          <Button className="h-9 gap-2 text-sm" onClick={() => router.push('/projects')}>
            <Plus className="h-4 w-4" /> 新增項目
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-[#86868B]" /></div>
      ) : !hasData ? (
        <motion.div variants={item} className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#F5F5F7] flex items-center justify-center mb-6">
            <Inbox className="h-10 w-10 text-[#D1D1D6]" />
          </div>
          <h3 className="text-lg font-bold text-[#1D1D1F]">尚無項目資料</h3>
          <p className="text-sm text-[#86868B] mt-2 max-w-md">開始建立你的第一個裝修工程項目，所有數據將在此自動更新。</p>
          <Button className="mt-6 gap-2" onClick={() => router.push('/projects')}>
            <Plus className="h-4 w-4" /> 建立第一個項目
          </Button>
        </motion.div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="施工中項目" value={activeProjects.length} icon={HardHat} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <KpiCard label="總預算額" value={totalBudget > 0 ? `HK$${(totalBudget / 1000).toFixed(0)}k` : '—'} icon={DollarSign} gradient="bg-gradient-to-br from-blue-400 to-blue-600" />
            <KpiCard label="前端跟進中" value={pendingQuotes.length} icon={PenTool} gradient="bg-gradient-to-br from-amber-400 to-amber-600" />
            <KpiCard label="已完工" value={completedThisMonth.length} icon={CheckSquare} gradient="bg-gradient-to-br from-[#86868B] to-[#424245]" />
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-7 gap-5">
            {/* Project Table */}
            <Card className="lg:col-span-5">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>所有項目</CardTitle>
                  <CardDescription>目前的裝修工程</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push('/projects')}>
                  查看全部 <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y border-[#E8E8ED] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">項目編號</th>
                      <th className="px-4 py-3 text-left">客戶 / 地址</th>
                      <th className="px-4 py-3 text-left">階段</th>
                      <th className="px-4 py-3 text-left">進度</th>
                      <th className="px-4 py-3 text-right">預算</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F7]">
                    {projects.slice(0, 5).map((p, idx) => {
                      const stageColor = STAGE_COLORS[p.stage] || '#86868B';
                      return (
                        <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + idx * 0.05 }} className="hover:bg-[#F5F5F7] transition-colors cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#424245]">{p.projectCode}</td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-[#1D1D1F] text-sm">{p.clientName}</p>
                            <p className="text-xs text-[#86868B] mt-0.5">{p.estate} {p.address}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: `${stageColor}1A`, color: stageColor }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageColor }} />
                              {STAGE_LABELS[p.stage] || p.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 w-28">
                              <div className="flex-1 h-1.5 bg-[#E8E8ED] rounded-full overflow-hidden">
                                <motion.div className={`h-full rounded-full ${p.progress >= 80 ? 'bg-emerald-500' : p.progress >= 50 ? 'bg-[#0071E3]' : 'bg-amber-400'}`} initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ duration: 1, delay: 0.5 + idx * 0.1 }} />
                              </div>
                              <span className="text-[11px] font-bold text-[#424245] w-8 text-right">{p.progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-sm font-bold text-[#1D1D1F]">HK${(p.budget / 1000).toFixed(0)}k</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Sidebar Widgets */}
            <div className="lg:col-span-2 space-y-5">
              {/* Tasks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0071E3]/10 flex items-center justify-center">
                      <Briefcase className="w-3.5 h-3.5 text-[#0071E3]" />
                    </div>
                    我的待辦任務
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  {pendingTasks.length > 0 ? (
                    <div className="space-y-2">
                      {pendingTasks.map(t => {
                        const p = projects.find(proj => proj.id === t.projectId);
                        return (
                          <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F5F7] hover:bg-[#E8E8ED] transition-colors">
                            {t.type === 'meeting' ? (
                              <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><Clock className="w-3 h-3 text-amber-600" /></div>
                            ) : (
                              <button onClick={() => toggleTaskStatus(t)} className="w-5 h-5 rounded-md border-2 border-[#D1D1D6] shrink-0 mt-0.5 hover:border-[#0071E3] transition-colors" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1D1D1F] line-clamp-2">{t.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{p?.projectCode || '未知'}</Badge>
                                <span className="text-[10px] text-red-500 font-semibold">{new Date(t.date).toLocaleDateString()}到期</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <Button variant="ghost" size="sm" className="w-full text-xs text-[#0071E3]" onClick={() => router.push('/calendar')}>
                        查看完整排程 <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                      <p className="text-[13px] font-bold text-[#1D1D1F]">目前沒有待辦任務</p>
                      <p className="text-[11px] text-[#86868B]">太棒啦！一切都在進度中</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stage Distribution */}
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">項目階段分佈</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-center my-2">
                    <div className="w-[140px] h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stageData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {stageData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                          </Pie>
                          <RechartsTooltip formatter={(value: any, name: any) => [value, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-2.5 mt-2">
                    {stageData.slice(0, 4).map((stage) => (
                      <div key={stage.name} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="font-medium text-[#424245]">{stage.name}</span>
                        </div>
                        <span className="font-bold text-[#1D1D1F]">{stage.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
