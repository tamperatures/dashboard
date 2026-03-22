'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
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
    UploadCloud, Trash2, Paperclip, Briefcase
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
    pendingStageRequest?: any;
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
    const { user, userData } = useAuth();
    const userRole = userData?.role || 'staff';
    const userName = userData?.name || user?.displayName;
    const userDepts = userData?.departments || (userData?.department ? [userData.department] : []);

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

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);



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
            const res = await fetch('/api/projects?t=' + Date.now(), { cache: 'no-store' });
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

    const handleDeleteProjectClick = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        setProjectToDelete({ id, name });
        setDeleteModalOpen(true);
    };

    const confirmDeleteProject = async () => {
        if (!projectToDelete) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectToDelete.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            fetchProjects();
            setDeleteModalOpen(false);
            setProjectToDelete(null);
            toast.success('項目已成功刪除');
        } catch {
            toast.error('刪除失敗，請稍後再試');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Staff can see all projects now. Permissions will be restricted at the detail/edit level.
    const viewableProjects = projects;

    const filtered = selectedStage ? viewableProjects.filter(p => p.stage === selectedStage) : viewableProjects;

    const availableStages = STAGES;

    const stageCounts = availableStages.map(s => ({
        name: s,
        count: viewableProjects.filter(p => p.stage === s).length,
        ...STAGE_COLORS[s],
    }));

    return (
        <motion.div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4 sm:px-6 lg:px-8 mt-2" initial="hidden" animate="show" variants={container}>
            {/* Header / Hero Section */}
            <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1c2331] via-[#2c3545] to-[#1c2331] text-white p-8 sm:p-10 shadow-lg mb-6">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
                            <Briefcase className="w-4 h-4 text-blue-300" />
                            <span className="text-[11px] font-bold tracking-wider text-blue-100">項目總覽</span>
                        </div>
                        <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight mb-2">項目管理</h2>
                        <p className="text-[13px] sm:text-[14px] font-medium text-slate-300 max-w-xl leading-relaxed">
                            追蹤所有裝修工程進度、工程狀態及跟進項目，確保每項工程如期進行。
                        </p>
                    </div>
                    {userRole === 'admin' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="shrink-0 h-11 px-6 rounded-2xl bg-white text-[#1c2331] font-bold text-[13px] hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center gap-2 self-start sm:self-center"
                        >
                            <Plus className="w-4 h-4" />
                            新增項目
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Stage Filter Pills */}
            <motion.div variants={fadeUp} className="flex w-full max-w-full overflow-x-auto flex-nowrap gap-2.5 pt-2 pb-2 scrollbar-hide sm:flex-wrap">
                <button
                    onClick={() => setSelectedStage(null)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm ${!selectedStage ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#86868B] border border-[#E8E8ED] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'}`}
                >
                    全部 <span className={!selectedStage ? 'opacity-80 ml-1.5 font-normal' : 'text-[#86868B] ml-1.5 font-normal'}>{viewableProjects.length}</span>
                </button>
                {stageCounts.map(s => (
                    <button
                        key={s.name}
                        onClick={() => setSelectedStage(selectedStage === s.name ? null : s.name)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 shadow-sm ${selectedStage === s.name ? `bg-white ring-2 ring-current ring-inset ${s.text}` : 'bg-white text-[#86868B] border border-[#E8E8ED] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'}`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label} <span className="font-normal opacity-70">{s.count}</span>
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
                                    <div className="bg-white rounded-[24px] overflow-hidden border border-[#E8E8ED] shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                                        <div className="p-6 flex-1 flex flex-col">
                                            {/* Top Row: Code & Actions */}
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="px-3 py-1 rounded-lg bg-[#F5F5F7] text-[11px] font-mono font-bold text-[#86868B] tracking-wider border border-[#E8E8ED]/70">
                                                    {project.projectCode}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {project.pendingStageRequest && (
                                                        <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-600 flex items-center gap-1 shadow-sm border border-amber-100/50">
                                                            <Clock className="w-3 h-3" /> 待審批
                                                        </div>
                                                    )}
                                                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${stageStyle.bg} ${stageStyle.text}`}>
                                                        {stageStyle.label}
                                                    </div>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={(e) => handleDeleteProjectClick(e, project.id, project.clientName)}
                                                            className="p-1 rounded-lg text-[#86868B] hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="刪除項目"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title & Location */}
                                            <div className="mb-5">
                                                <h3 className="text-[19px] font-bold text-[#1D1D1F] leading-snug mb-2 line-clamp-2">
                                                    {project.clientName}
                                                    {project.status && project.status !== 'In Progress' && (
                                                        <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md align-middle ${project.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F5F5F7] text-[#86868B]'}`}>
                                                            {project.status === 'Signed' ? '已簽單' : '未成交'}
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868B]">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{project.estate} {project.address}</span>
                                                </div>
                                            </div>

                                            {/* Meta tags */}
                                            <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold text-[#86868B] mt-auto">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-300" />
                                                    {project.pmResponsible || '未指派'}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Wrench className="w-3.5 h-3.5 text-slate-300" />
                                                    {project.renovationType}
                                                </div>
                                            </div>

                                            {/* Bottom Info Section (Grey box) */}
                                            <div className="mt-6 p-4 bg-[#F5F5F7] rounded-[16px] space-y-2.5">
                                                {['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價'].includes(project.stage) ? (
                                                    <>
                                                        <div className="flex justify-between items-center text-[12px]">
                                                            <span className="text-[#86868B] font-semibold">預計面積</span>
                                                            <span className="text-[#1D1D1F] font-bold">{project.area || '未提供'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[12px]">
                                                            <span className="text-[#86868B] font-semibold">約見時間</span>
                                                            <span className="text-[#1D1D1F] font-bold">{project.meetingDateTime ? new Date(project.meetingDateTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未定'}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-center text-[12px]">
                                                            <span className="text-[#86868B] font-semibold leading-none">工程預算</span>
                                                            <span className="text-[#1D1D1F] font-bold leading-none block pt-0.5">HK${(project.budget / 1000).toFixed(0)}k</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[12px] pt-1.5">
                                                            <span className="text-[#86868B] font-semibold leading-none">總進度</span>
                                                            <span className="text-[#1D1D1F] font-bold leading-none">{project.progress}%</span>
                                                        </div>
                                                        <div className="h-2 bg-[#E8E8ED] rounded-full overflow-hidden mt-1.5 border border-black/[0.02]">
                                                            <motion.div
                                                                className={`h-full rounded-full ${project.progress >= 90 ? 'bg-emerald-500' : project.progress >= 50 ? 'bg-[#0071E3]' : project.progress >= 25 ? 'bg-amber-400' : 'bg-[#86868B]'}`}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${project.progress}%` }}
                                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => router.push(`/projects/${project.id}`)}
                                            className="w-[calc(100%-48px)] mx-auto mb-6 h-10 rounded-xl font-bold text-[13px] text-[#424245] bg-[#F5F5F7] hover:bg-[#E8E8ED] hover:text-[#1D1D1F] flex items-center justify-center gap-1 transition-colors"
                                        >
                                            查看詳情 <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
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
                                    <label className="text-xs font-semibold text-slate-600">預計開工</label>
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

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="max-w-md p-6 rounded-3xl border border-[#E8E8ED] shadow-xl">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-[20px] font-bold text-[#1D1D1F] flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            確定刪除項目？
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 mb-2">
                        <p className="text-[14px] leading-relaxed text-[#424245]">
                            即將永久刪除項目 <span className="font-bold text-[#1D1D1F] bg-[#F5F5F7] px-1.5 py-0.5 rounded-md">「{projectToDelete?.name}」</span>。
                            <br className="mb-2" />
                            <span className="text-[#86868B]">此操作無法還原，所有相關的圖紙、時間表及會議記錄將一併移除。</span>
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 px-6 rounded-2xl text-[13px] font-bold text-[#424245] border-[#E8E8ED] bg-white hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
                            onClick={() => { setDeleteModalOpen(false); setProjectToDelete(null); }}
                            disabled={deleteLoading}
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            className="h-11 px-6 rounded-2xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 border-none transition-colors shadow-sm"
                            onClick={confirmDeleteProject}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            確認刪除
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
