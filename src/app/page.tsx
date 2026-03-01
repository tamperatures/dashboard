'use client';

import React from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  ArrowRight,
  TrendingUp,
  DollarSign,
  HardHat,
  FolderKanban,
  ClipboardList,
  Hammer,
  Paintbrush,
  Droplets,
  Zap,
  Sofa,
  Plus,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

/* ───────────── Mock Data ───────────── */

const MONTHLY_REVENUE = [
  { name: '9月', income: 380000, expense: 220000 },
  { name: '10月', income: 420000, expense: 310000 },
  { name: '11月', income: 350000, expense: 280000 },
  { name: '12月', income: 510000, expense: 350000 },
  { name: '1月', income: 480000, expense: 320000 },
  { name: '2月', income: 390000, expense: 260000 },
];

const STAGE_DATA = [
  { name: '初步報價', value: 4, color: '#3b82f6' },
  { name: '設計中', value: 6, color: '#8b5cf6' },
  { name: '已簽約', value: 3, color: '#f59e0b' },
  { name: '施工中', value: 8, color: '#10b981' },
  { name: '已完工', value: 12, color: '#64748b' },
];

const ACTIVE_PROJECTS = [
  { id: 'P-2026-031', client: '陳先生', address: '太古城 海棠閣 12A', stage: '施工中', trade: '泥水', progress: 65, budget: 580000, daysLeft: 18 },
  { id: 'P-2026-028', client: '黃小姐', address: '沙田第一城 52座 3B', stage: '施工中', trade: '油漆', progress: 82, budget: 420000, daysLeft: 7 },
  { id: 'P-2026-035', client: '李太', address: '將軍澳 日出康城 領都', stage: '設計中', trade: '—', progress: 25, budget: 750000, daysLeft: 45 },
  { id: 'P-2026-033', client: '張先生', address: '荃灣 映日灣 2座 18F', stage: '初步報價', trade: '—', progress: 10, budget: 320000, daysLeft: 60 },
  { id: 'P-2026-030', client: '王太', address: '天水圍 濕地公園路 嘉湖', stage: '施工中', trade: '傢俬', progress: 90, budget: 680000, daysLeft: 4 },
];

const RECENT_ACTIVITIES = [
  { icon: Hammer, title: '清拆工程完成', project: 'P-2026-031 太古城', time: '2 小時前', status: '已完成', color: 'emerald' },
  { icon: Droplets, title: '泥水材料已送達', project: 'P-2026-031 太古城', time: '3 小時前', status: '進行中', color: 'blue' },
  { icon: ClipboardList, title: '報價單已發送', project: 'P-2026-033 映日灣', time: '5 小時前', status: '待確認', color: 'amber' },
  { icon: Paintbrush, title: '油漆工程驗收', project: 'P-2026-028 沙田', time: '昨天', status: '已通過', color: 'emerald' },
  { icon: Sofa, title: '傢俬訂單確認', project: 'P-2026-030 嘉湖', time: '昨天', status: '已下單', color: 'violet' },
];

const TRADE_PROGRESS = [
  { trade: '清拆', icon: Hammer, completed: 12, total: 14 },
  { trade: '水電', icon: Zap, completed: 8, total: 11 },
  { trade: '泥水', icon: Droplets, completed: 5, total: 9 },
  { trade: '油漆', icon: Paintbrush, completed: 7, total: 10 },
  { trade: '傢俬', icon: Sofa, completed: 3, total: 8 },
];

/* ───────────── Animation Variants ───────────── */

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
};

/* ───────────── Helper ───────────── */
const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;

/* ═══════════════════════════════════════════════ */
export default function Dashboard() {
  return (
    <motion.div
      className="space-y-8 max-w-[1600px] mx-auto pb-12"
      initial="hidden"
      animate="show"
      variants={container}
    >
      {/* ─── Header ─── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">工程總覽</h2>
          <p className="text-sm text-slate-500 mt-1">適度裝修設計 · 工程管理系統</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 gap-2 shadow-sm text-sm">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            本月
          </Button>
          <Button className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md text-sm">
            <Plus className="h-4 w-4" />
            新增項目
          </Button>
        </div>
      </motion.div>

      {/* ─── KPI Cards ─── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

        <Card className="shadow-sm border-slate-200/60 overflow-hidden relative group hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">進行中項目</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <HardHat className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">8</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +2 <span className="text-slate-400 font-normal">較上月</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60 overflow-hidden relative group hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">本月收入</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">$1.48M</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +18% <span className="text-slate-400 font-normal">較上月</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60 overflow-hidden relative group hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">待確認報價</CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <ClipboardList className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">5</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +1 <span className="text-slate-400 font-normal">較上月</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60 overflow-hidden relative group hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 relative z-10">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">本月完工</CardTitle>
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">3</div>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +1 <span className="text-slate-400 font-normal">較上月</span>
            </p>
          </CardContent>
        </Card>

      </motion.div>

      {/* ─── Middle Row: Revenue Chart + Pipeline ─── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-7 gap-6">

        {/* Revenue Chart */}
        <Card className="lg:col-span-4 shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">收支趨勢</CardTitle>
              <CardDescription>月度收入與支出對比</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_REVENUE} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }}
                    formatter={(value: any, name: any) => [`HK$${Number(value).toLocaleString()}`, name === 'income' ? '收入' : '支出']}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Bar dataKey="income" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={32} name="income" />
                  <Bar dataKey="expense" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={32} name="expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-900" /> 收入</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-300" /> 支出</span>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Stage */}
        <Card className="lg:col-span-3 shadow-sm border-slate-200/60 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">項目階段分佈</CardTitle>
            <CardDescription>按工作流程階段統計</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-center my-4">
              <div className="w-[180px] h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={STAGE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {STAGE_DATA.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-3 mt-2">
              {STAGE_DATA.map((stage, i) => (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="font-medium text-slate-700">{stage.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{stage.value} 個</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Bottom Row: Projects Table + Activity + Trade Progress ─── */}
      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Active Projects Table */}
        <Card className="xl:col-span-2 shadow-sm border-slate-200/60 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">進行中項目</CardTitle>
              <CardDescription>目前所有活躍的裝修工程</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white shadow-sm">
              查看全部 <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">項目編號</th>
                  <th className="px-4 py-3.5">客戶 / 地址</th>
                  <th className="px-4 py-3.5">階段</th>
                  <th className="px-4 py-3.5">工種</th>
                  <th className="px-4 py-3.5">進度</th>
                  <th className="px-4 py-3.5 text-right">預算</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {ACTIVE_PROJECTS.map((p, idx) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + idx * 0.06 }}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">{p.id}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 text-sm">{p.client}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.address}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className={`font-semibold text-[11px] border-transparent ${p.stage === '施工中' ? 'bg-emerald-50 text-emerald-700' :
                        p.stage === '設計中' ? 'bg-violet-50 text-violet-700' :
                          p.stage === '初步報價' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        {p.stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{p.trade}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${p.progress >= 80 ? 'bg-emerald-500' : p.progress >= 50 ? 'bg-blue-500' : 'bg-amber-400'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${p.progress}%` }}
                            transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 w-8">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-900">HK${(p.budget / 1000).toFixed(0)}k</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" /> {p.daysLeft}天
                      </p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Column: Activity + Trade Progress */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">最近動態</CardTitle>
              <CardDescription>項目更新與通知</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {RECENT_ACTIVITIES.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="flex items-start gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5 group-hover:bg-slate-200 transition-colors">
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{a.project}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="secondary" className={`text-[10px] font-bold border-transparent ${a.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                        a.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                          a.color === 'amber' ? 'bg-amber-50 text-amber-700' :
                            a.color === 'violet' ? 'bg-violet-50 text-violet-700' :
                              'bg-slate-100 text-slate-600'
                        }`}>
                        {a.status}
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trade Progress */}
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">工種進度</CardTitle>
              <CardDescription>各工種已完成 / 總數</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {TRADE_PROGRESS.map((t, i) => (
                <motion.div
                  key={t.trade}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <t.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{t.trade}</span>
                      <span className="text-xs font-semibold text-slate-900">{t.completed}/{t.total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-slate-900"
                        initial={{ width: 0 }}
                        animate={{ width: `${(t.completed / t.total) * 100}%` }}
                        transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
