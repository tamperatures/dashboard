'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Hammer, Droplets, Paintbrush, Zap, Sofa, Wrench,
    MapPin, User, Clock, ChevronRight, Plus, AlertCircle, Loader2,
    Home, DollarSign, Users, Tag, CalendarDays, FileText, X,
    UploadCloud, Trash2, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/toast';

/* ───────── Types ───────── */
interface Project {
    id: string;
    projectCode: string;
    clientName: string;
    estate: string;
    address: string;
    propertyType: string;
    renovationType: string;
    pmResponsible: string;
    budget: number;
    stage: string;
    progress: number;
    startDate: string;
    endDate: string;
    area?: string;
    meetingDateTime?: string;
    status?: string;
}

const STAGES = [
    'S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進',
    'S05_後續會面', 'S06_工程啟動', 'S07_工程進行中', 'S08_工程完成'
];

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    'S01_客戶查詢': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'S01 查詢' },
    'S02_見客前準備': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400', label: 'S02 準備' },
    'S03_初步報價': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400', label: 'S03 報價' },
    'S04_見客後跟進': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-400', label: 'S04 跟進' },
    'S05_後續會面': { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-400', label: 'S05 會面' },
    'S06_工程啟動': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'S06 啟動' },
    'S07_工程進行中': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'S07 進行中' },
    'S08_工程完成': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'S08 完成' },
};

const STAGE_DEPARTMENTS: Record<string, string> = {
    'S01_客戶查詢': '推廣部',
    'S02_見客前準備': '設計部',
    'S03_初步報價': '銷售部',
    'S04_見客後跟進': '設計部',
    'S05_後續會面': '銷售部',
    'S06_工程啟動': '工程部',
    'S07_工程進行中': '工程部',
    'S08_工程完成': '工程部',
};

/* ───────── Animation ───────── */
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

export default function ProjectsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const userDept = (session?.user as any)?.department;

    const [projects, setProjects] = useState<Project[]>([]);
    const toast = useToast();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [formClient, setFormClient] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formPropertyType, setFormPropertyType] = useState('私樓 (Private)');
    const [formType, setFormType] = useState('全屋裝修');
    const [formBudget, setFormBudget] = useState('');
    const [formArea, setFormArea] = useState('');
    const [formFamilyStructure, setFormFamilyStructure] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formPm, setFormPm] = useState('未指派');
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // File upload in modal
    const modalFileRef = useRef<HTMLInputElement>(null);
    const [modalFiles, setModalFiles] = useState<{ name: string; url: string; type: string }[]>([]);
    const [uploadingModal, setUploadingModal] = useState(false);



    const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setUploadingModal(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('上傳失敗');
            const data = await res.json();
            setModalFiles(prev => [...prev, { name: data.fileName, url: data.url, type: file.type.startsWith('image/') ? 'photo' : 'other' }]);
        } catch (err: any) {
            toast.error(err.message || '上傳失敗');
        } finally {
            setUploadingModal(false);
            if (modalFileRef.current) modalFileRef.current.value = '';
        }
    };

    const resetForm = () => {
        setFormClient(''); setFormAddress(''); setFormBudget('');
        setFormArea(''); setFormNotes(''); setFormPm('未指派');
        setFormPropertyType('私樓 (Private)'); setFormType('全屋裝修');
        setFormFamilyStructure(''); setFormStartDate('');
        setModalFiles([]);
    };

    useEffect(() => {
        fetchProjects();
        fetchEmployees();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.users || []);
            }
        } catch {
            // ignore
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: formClient,
                    estate: formAddress.split(' ')[0] || formClient,
                    address: formAddress,
                    renovationType: formType,
                    budget: Number(formBudget) || 0,
                    propertyType: formPropertyType.split(' ')[0],
                    area: formArea,
                    familyStructure: formFamilyStructure,
                    status: 'In Progress',
                    startDate: formStartDate,
                    notes: formNotes,
                    pmResponsible: formPm !== '未指派' ? formPm : ''
                })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Failed to create');
            }

            const newProjectId = result.project?.id;

            // Upload attached files to the new project
            if (newProjectId && modalFiles.length > 0) {
                for (const f of modalFiles) {
                    await fetch(`/api/projects/${newProjectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newFile: { name: f.name, url: f.url, type: f.type, size: 0 } })
                    });
                }
            }

            setShowCreateModal(false);
            fetchProjects();
            resetForm();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteProject = async (id: string, name: string) => {
        if (!confirm(`確定要刪除項目「${name}」嗎？此操作無法還原。`)) return;
        try {
            const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            fetchProjects();
        } catch {
            toast.error('刪除失敗，請稍後再試');
        }
    };

    const viewableProjects = projects.filter(p => {
        if (userRole === 'admin') return true;
        const requiredDept = STAGE_DEPARTMENTS[p.stage];
        return !requiredDept || requiredDept === userDept;
    });

    const filtered = selectedStage ? viewableProjects.filter(p => p.stage === selectedStage) : viewableProjects;

    const availableStages = STAGES.filter(s => {
        if (userRole === 'admin') return true;
        return STAGE_DEPARTMENTS[s] === userDept;
    });

    const stageCounts = availableStages.map(s => ({
        name: s,
        count: viewableProjects.filter(p => p.stage === s).length,
        ...STAGE_COLORS[s],
    }));

    return (
        <motion.div className="max-w-[1600px] mx-auto space-y-8 pb-12" initial="hidden" animate="show" variants={container}>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">項目管理</h2>
                    <p className="text-sm text-slate-500 mt-1">追蹤所有裝修工程進度及工種狀態</p>
                </div>
                {userRole === 'admin' && (
                    <Button onClick={() => setShowCreateModal(true)} className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-md text-sm">
                        <Plus className="h-4 w-4" /> 新增項目
                    </Button>
                )}
            </motion.div>

            {/* Stage Filter Pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedStage(null)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${!selectedStage ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    全部 <span className="ml-1 opacity-70">{viewableProjects.length}</span>
                </button>
                {stageCounts.map(s => (
                    <button
                        key={s.name}
                        onClick={() => setSelectedStage(selectedStage === s.name ? null : s.name)}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedStage === s.name ? `${s.bg} ${s.text} ring-1 ring-current/20` : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {s.label} <span className="opacity-70">{s.count}</span>
                    </button>
                ))}
            </motion.div>

            {/* Project Cards Grid */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    <div className="col-span-full py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filtered.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-slate-400">尚無項目資料</div>
                        ) : filtered.map((project, idx) => {
                            const stageStyle = STAGE_COLORS[project.stage] || STAGE_COLORS['S01_客戶查詢'];

                            return (
                                <motion.div key={project.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
                                    <Card className="overflow-hidden group">
                                        <CardContent className="p-5">
                                            {/* Top Row */}
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-mono font-semibold text-slate-400">{project.projectCode}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={`text-[11px] font-semibold border-transparent ${stageStyle.bg} ${stageStyle.text}`}>
                                                        {stageStyle.label}
                                                    </Badge>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id, project.clientName); }}
                                                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-150 shadow-sm hover:shadow"
                                                            title="刪除項目"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Client + Status + Address */}
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-slate-900 leading-tight">{project.clientName}</h3>
                                                {project.status && project.status !== 'In Progress' && (
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${project.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' :
                                                        project.status === 'Lost' ? 'bg-slate-100 text-slate-500' : ''
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'Signed' ? 'bg-emerald-500' : 'bg-slate-400'
                                                            }`} />
                                                        {project.status === 'Signed' ? '已簽單' : '未成交'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{project.estate} {project.address}</span>
                                            </div>

                                            {/* Meta Row */}
                                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3" /> {project.pmResponsible || '未指派負責人'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Wrench className="h-3 w-3" /> {project.renovationType}
                                                </span>
                                            </div>

                                            {/* Info block based on stage */}
                                            {['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價'].includes(project.stage) ? (
                                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100/50">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs font-medium text-slate-500">預計面積</span>
                                                        <span className="text-xs font-semibold text-slate-700">{project.area || '未提供'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-slate-500">約見時間</span>
                                                        <span className="text-xs font-semibold text-slate-700">{project.meetingDateTime ? new Date(project.meetingDateTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未定'}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Budget + Progress */}
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <span className="text-sm font-bold text-slate-900">HK${(project.budget / 1000).toFixed(0)}k</span>
                                                        <span className="text-xs font-semibold text-slate-500">{project.progress}%</span>
                                                    </div>
                                                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className={`h-full rounded-full ${project.progress >= 90 ? 'bg-emerald-500' : project.progress >= 50 ? 'bg-blue-500' : project.progress >= 25 ? 'bg-amber-400' : 'bg-slate-300'}`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${project.progress}%` }}
                                                            transition={{ duration: 0.8, delay: 0.2 + idx * 0.05 }}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* Go to Details */}
                                            <Button
                                                variant="outline"
                                                onClick={() => router.push(`/projects/${project.id}`)}
                                                className="w-full h-8 mt-5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center gap-1"
                                            >
                                                查看詳情 <ChevronRight className="h-3 w-3" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </motion.div>

            {/* Create Modal — Redesigned to match screenshot */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-xl border-slate-200">
                    {/* Modal Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <Home className="h-5 w-5 text-blue-600" />
                            <DialogTitle className="text-base font-bold text-slate-900">新增銷售項目</DialogTitle>
                        </div>
                    </div>

                    <form onSubmit={handleCreateProject} className="px-6 py-5 space-y-6 bg-slate-50/30">
                        {formError && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
                            </div>
                        )}

                        {/* Section 1: 負責同事 */}
                        <div className="bg-white rounded-[20px] border border-black/[0.04] p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <FileText className="h-4 w-4 text-blue-500" />
                                負責同事指派
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-500">負責同事 (PM/Designer)</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Select value={formPm} onValueChange={setFormPm}>
                                        <SelectTrigger className="h-10 pl-9 bg-white">
                                            <SelectValue placeholder="例如: Kenneth Wu" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="未指派">未指派</SelectItem>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">狀態、簽約日期等資料可在建立後於「查看詳情」頁面編輯</p>
                            </div>
                        </div>

                        {/* Section 2: 基本資料 */}
                        <div className="bg-white rounded-[20px] border border-black/[0.04] p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                基本資料
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">客戶名稱 / 項目代號 <span className="text-red-500">*</span></label>
                                    <Input value={formClient} onChange={e => setFormClient(e.target.value)} required placeholder="陳先生 (海之戀)" className="h-10 bg-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">地盤地址 <span className="text-red-500">*</span></label>
                                    <Input value={formAddress} onChange={e => setFormAddress(e.target.value)} required placeholder="菃灣海之戀 3 座高層 A 室" className="h-10 bg-white" />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: 物業詳情 */}
                        <div className="bg-white rounded-[20px] border border-black/[0.04] p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <Home className="h-3.5 w-3.5" />
                                物業詳情 (必須填寫)
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">物業類型</label>
                                    <Select value={formPropertyType} onValueChange={setFormPropertyType}>
                                        <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="私樓 (Private)">私樓 (Private)</SelectItem>
                                            <SelectItem value="居屋 (HOS)">居屋 (HOS)</SelectItem>
                                            <SelectItem value="公屋 (Public)">公屋 (Public)</SelectItem>
                                            <SelectItem value="村屋 (Village)">村屋 (Village)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">裝修類別</label>
                                    <Select value={formType} onValueChange={setFormType}>
                                        <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="全屋裝修">全屋裝修</SelectItem>
                                            <SelectItem value="局部裝修">局部裝修</SelectItem>
                                            <SelectItem value="廚廁翻新">廚廁翻新</SelectItem>
                                            <SelectItem value="訂造傢係">訂造傢係</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">實用面積 (平方呎) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input value={formArea} onChange={e => setFormArea(e.target.value)} placeholder="730" className="h-10 pl-9 bg-white" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">家庭成員結構 <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input value={formFamilyStructure} onChange={e => setFormFamilyStructure(e.target.value)} placeholder="2大人 2小孩" className="h-10 pl-9 bg-white" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: 工程規劃 */}
                        <div className="bg-white rounded-[20px] border border-black/[0.04] p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <Wrench className="h-3.5 w-3.5" />
                                工程規劃
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">預計開工 <span className="text-red-500">*</span></label>
                                    <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="h-10 bg-white" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">預算 (HKD) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)} placeholder="450000" className="h-10 pl-9 bg-white" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 5: 檔案上傳 */}
                        <div className="bg-white rounded-[20px] border border-black/[0.04] p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    檔案上傳
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => modalFileRef.current?.click()} disabled={uploadingModal} className="h-7 gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
                                    {uploadingModal ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />} 上傳檔案
                                </Button>
                                <input ref={modalFileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleModalFileUpload} />
                            </div>
                            {modalFiles.length > 0 ? (
                                <div className="space-y-2">
                                    {modalFiles.map((f, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 truncate">
                                                <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </div>
                                            <button type="button" onClick={() => setModalFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/30">
                                    <UploadCloud className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                                    <p className="text-[11px] text-slate-400 font-medium">點擊上方按鈕上傳報價單、圖則或其他檔案</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-2 pb-1">
                            <Button type="button" variant="outline" className="h-10 px-6" onClick={() => { setShowCreateModal(false); resetForm(); }}>取消</Button>
                            <Button type="submit" disabled={formLoading} className="h-10 px-6 bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-semibold">
                                {formLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} 建立項目
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
