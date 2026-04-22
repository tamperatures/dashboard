'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    unreadDepartments?: string[];
}

const STAGES = [
    'S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進',
    'S05_後續會面', 'P06_工程啟動', 'P07_工程進行中', 'P08_工程完成'
];

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    'S01_客戶查詢': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'S01 查詢' },
    'S02_見客前準備': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400', label: 'S02 準備' },
    'S03_初步報價': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400', label: 'S03 報價' },
    'S04_見客後跟進': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-400', label: 'S04 跟進' },
    'S05_後續會面': { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-400', label: 'S05 會面' },
    'P06_工程啟動': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'P06 啟動' },
    'P07_工程進行中': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'P07 進行中' },
    'P08_工程完成': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'P08 完成' },
};

const STAGE_DEPARTMENTS: Record<string, string> = {
    'S01_客戶查詢': '推廣部',
    'S02_見客前準備': '設計部',
    'S03_初步報價': '銷售部',
    'S04_見客後跟進': '設計部',
    'S05_後續會面': '銷售部',
    'P06_工程啟動': '工程部',
    'P07_工程進行中': '工程部',
    'P08_工程完成': '工程部',
};

// 用於推算當下子任務
const CONSTRUCTION_PHASES = [
    { key: 'phase1SitePrep', label: '1. 工地準備', fields: [ { key: 'adminApplication', label: '入則申請' }, { key: 'insurance', label: '保險' }, { key: 'tempUtilities', label: '臨時水電' }, { key: 'publicProtection', label: '公眾保護' }, { key: 'itemProtection', label: '物品保護' } ] },
    { key: 'phase2Demolition', label: '2. 清拆廢物', fields: [ { key: 'survey', label: '勘查' }, { key: 'execution', label: '清拆執行' }, { key: 'noiseControl', label: '噪音控制' }, { key: 'wasteDisposal', label: '廢物處理' } ] },
    { key: 'phase3Plumbing', label: '3. 水電煤', fields: [ { key: 'brickwork', label: '砌磚' }, { key: 'trenching', label: '開坑' }, { key: 'positioning', label: '定位' }, { key: 'gasWork', label: '煤氣' } ] },
    { key: 'phase4Masonry', label: '4. 泥水防水', fields: [ { key: 'plastering', label: '批盪' }, { key: 'waterproofing', label: '防水' }, { key: 'tiling', label: '鋪磚' }, { key: 'leveling', label: '找平' } ] },
    { key: 'phase5Carpentry', label: '5. 木工油漆', fields: [ { key: 'ceilingFeature', label: '天花' }, { key: 'wallPreparation', label: '牆身' }, { key: 'woodworkPainting', label: '油漆' } ] },
    { key: 'phase6Installation', label: '6. 後期安裝', fields: [ { key: 'furnitureAssembly', label: '傢俬組裝' }, { key: 'doorFloor', label: '門板' }, { key: 'fixtures', label: '潔具' } ] },
    { key: 'phase7PreInspection', label: '7. 預驗收', fields: [ { key: 'internalCheck', label: '內檢' }, { key: 'defectFix', label: '修復' }, { key: 'basicCleaning', label: '清潔' } ] },
    { key: 'phase8OfficialInspection', label: '8. 客戶驗收', fields: [ { key: 'jointInspection', label: '聯驗' }, { key: 'defectList', label: '缺陷清單' }, { key: 'rectification', label: '執漏' } ] },
    { key: 'phase9Handover', label: '9. 結算尾款', fields: [ { key: 'finalSettlement', label: '尾款' }, { key: 'docHandover', label: '交接' } ] },
    { key: 'phase10Maintenance', label: '10. 保養', fields: [ { key: 'warrantyPeriod', label: '保養' }, { key: 'maintenanceRecord', label: '維修' } ] },
];

function getActiveTask(p: any) {
    if (!['P06_工程啟動', 'P07_工程進行中', 'P08_工程完成'].includes(p.stage)) return null;
    for (const phase of CONSTRUCTION_PHASES) {
        for (const field of phase.fields) {
            if (!p[phase.key]?.[field.key]) {
                return { phaseLabel: phase.label, taskLabel: field.label };
            }
        }
    }
    return { phaseLabel: '10. 保養', taskLabel: '全部完成' };
}

/* ───────── Animation ───────── */
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

export default function ProjectsPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#F5F5F7]"><Loader2 className="w-8 h-8 animate-spin text-[#0071E3]" /></div>}>
            <ProjectsPageContent />
        </React.Suspense>
    );
}

function ProjectsPageContent() {
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
    const [selectedTechPhase, setSelectedTechPhase] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [statusTab, setStatusTab] = useState<'Active' | 'Lost'>('Active');
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('new') === '1') {
            setShowCreateModal(true);
        }
    }, [searchParams]);

    // Form state
    const [formClient, setFormClient] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formPropertyType, setFormPropertyType] = useState('私樓 (Private)');
    const [formType, setFormType] = useState('全屋裝修');
    const [formBudget, setFormBudget] = useState('');
    const [formArea, setFormArea] = useState('');
    const [familyConfig, setFamilyConfig] = useState({ elder: 0, adult: 0, child: 0, helper: 0 });
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
            toast.success(`✔️ 成功上傳：${data.fileName}`);
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
        setFamilyConfig({ elder: 0, adult: 0, child: 0, helper: 0 }); setFormStartDate('');
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
                    budget: Number(formBudget) * 10000 || 0,
                    propertyType: formPropertyType.split(' ')[0],
                    area: formArea,
                    familyStructure: [
                        familyConfig.elder > 0 && `${familyConfig.elder}長者`,
                        familyConfig.adult > 0 && `${familyConfig.adult}大人`,
                        familyConfig.child > 0 && `${familyConfig.child}小孩`,
                        familyConfig.helper > 0 && `${familyConfig.helper}工人`
                    ].filter(Boolean).join(' ') || '未提供',
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

    const viewableProjects = projects.filter(p => statusTab === 'Active' ? p.status !== 'Lost' : p.status === 'Lost');

    const filteredByStage = selectedStage ? viewableProjects.filter(p => p.stage === selectedStage) : viewableProjects;
    
    const filtered = selectedTechPhase 
        ? filteredByStage.filter(p => {
             const activeTask = getActiveTask(p);
             if (!activeTask) return false;
             return activeTask.phaseLabel.includes(selectedTechPhase);
          })
        : filteredByStage;

    const availableStages = STAGES;

    const stageCounts = availableStages.map(s => ({
        name: s,
        count: viewableProjects.filter(p => p.stage === s).length,
        ...STAGE_COLORS[s],
    }));

    return (
        <motion.div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4 sm:px-6 lg:px-8 mt-2" initial="hidden" animate="show" variants={container}>
            {/* Header / Hero Section */}
            <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[24px] bg-[#000000] text-white p-8 sm:p-12 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="apple-display text-[40px] font-semibold tracking-tight leading-[1.10]">項目管理</h2>
                    <p className="text-[17px] text-[#86868B] mt-2 max-w-xl">
                        追蹤所有裝修工程進度、工程狀態及跟進項目，確保每項工程如期進行。
                    </p>
                    <div className="mt-6 flex items-center gap-2">
                        <button onClick={() => setStatusTab('Active')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${statusTab === 'Active' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>活躍項目</button>
                        <button onClick={() => setStatusTab('Lost')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${statusTab === 'Lost' ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>歸檔 / 未成交</button>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="shrink-0 h-[44px] px-[20px] rounded-[980px] bg-[#0071e3] hover:bg-[#0077ED] text-white text-[17px] font-normal flex items-center gap-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] self-start sm:self-center"
                >
                    新增項目
                </button>
            </motion.div>

            {/* Filter Bar Row */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 relative z-10 w-full">
                {/* Construction Tech Phase Filter (Dropdown) */}
                <motion.div variants={fadeUp} className="shrink-0 w-full sm:w-auto">
                    <Select value={selectedTechPhase || 'all'} onValueChange={(val) => setSelectedTechPhase(val === 'all' ? null : val)}>
                        <SelectTrigger className="h-[36px] rounded-full bg-white border border-[#E5E5EA] text-[14px] font-medium w-full sm:w-[180px] shadow-sm hover:shadow-md hover:bg-[#F5F5F7] transition-all focus:ring-2 focus:ring-[#0071e3]/20 flex items-center justify-between px-4 ring-offset-0">
                            <span className="truncate">{selectedTechPhase || '所有工程進度'}</span>
                        </SelectTrigger>
                        <SelectContent className="rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-slate-100/50 p-1.5 bg-white/95 backdrop-blur-xl">
                            <SelectItem value="all" className="text-[14px] font-medium rounded-xl focus:bg-[#0071e3]/10 focus:text-[#0071e3] py-2 cursor-pointer">所有工程進度</SelectItem>
                            {CONSTRUCTION_PHASES.map(phase => {
                                const cleanName = phase.label.replace(/^\d+\.\s*/, '');
                                return <SelectItem key={phase.key} value={cleanName} className="text-[14px] font-medium rounded-xl focus:bg-[#0071e3]/10 focus:text-[#0071e3] py-2 cursor-pointer">{cleanName}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </motion.div>

                {/* Vertical Divider (Hidden on mobile/tablet) */}
                <div className="hidden xl:block w-[1px] h-6 bg-[#E5E5EA] shrink-0"></div>

                {/* Stage Filter Pills (Wrapped for easy viewing) */}
                <motion.div variants={fadeUp} className="flex-1 w-full">
                    <div className="flex w-full flex-wrap gap-2 items-center">
                        <button
                            onClick={() => setSelectedStage(null)}
                            className={`shrink-0 px-[16px] h-[36px] rounded-full text-[14px] font-medium transition-all shadow-sm ${!selectedStage ? 'bg-[#1D1D1F] text-white shadow-md' : 'bg-white text-[#1D1D1F] border border-[#E5E5EA] hover:bg-[#F5F5F7]'}`}
                        >
                            全部階段 <span className={!selectedStage ? 'text-white/70 ml-1.5 text-[12px]' : 'text-[#86868B] ml-1.5 text-[12px]'}>{viewableProjects.length}</span>
                        </button>
                        {stageCounts.map(s => (
                            <button
                                key={s.name}
                                onClick={() => setSelectedStage(selectedStage === s.name ? null : s.name)}
                                className={`shrink-0 px-[16px] h-[36px] rounded-full text-[14px] font-medium transition-all flex items-center gap-2 shadow-sm border ${selectedStage === s.name ? `bg-white border-[#0071e3] text-[#0071e3] shadow-md ring-1 ring-[#0071e3]/20` : 'bg-white border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                                {s.label} <span className={`text-[12px] ${selectedStage === s.name ? 'text-[#0071e3]/70' : 'text-[#86868B]'}`}>{s.count}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

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
                            const isUserDept = userDepts.includes(STAGE_DEPARTMENTS[project.stage]);

                            return (
                                <motion.div key={project.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
                                    <div className="bg-white rounded-[12px] overflow-hidden hover:shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] transition-all duration-300 group flex flex-col h-full border-none">
                                        <div className="p-6 flex-1 flex flex-col">
                                            {/* Top Row: Code & Actions */}
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="text-[12px] font-mono text-[#86868B] tracking-wider">
                                                    {project.projectCode}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {project.pendingStageRequest && (
                                                        <div className="px-2 py-0.5 rounded-[5px] text-[11px] font-medium bg-amber-50 text-amber-600 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> 待審批
                                                        </div>
                                                    )}
                                                    {project.unreadDepartments?.some((d: string) => userDepts.includes(d)) && (
                                                        <div className="px-2 py-0.5 rounded-[5px] text-[11px] font-bold bg-blue-50 text-blue-600 flex items-center gap-1.5 shadow-sm border border-blue-100">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                            新交接
                                                        </div>
                                                    )}
                                                    {isUserDept && statusTab === 'Active' && (
                                                        <div className="px-2 py-0.5 rounded-[5px] text-[11px] font-bold bg-rose-50 text-rose-600 flex items-center gap-1.5 shadow-sm border border-rose-100">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                            需跟進
                                                        </div>
                                                    )}
                                                    <div className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium ${stageStyle.bg} ${stageStyle.text}`}>
                                                        {stageStyle.label}
                                                    </div>
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={(e) => handleDeleteProjectClick(e, project.id, project.clientName)}
                                                            className="p-1 rounded-md text-[#86868B] hover:text-red-500 hover:bg-red-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                                                            title="刪除項目"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title & Location */}
                                            <div className="mb-5">
                                                <h3 className="apple-display text-[21px] font-bold text-[#1D1D1F] leading-[1.19] tracking-tight mb-2 line-clamp-2">
                                                    {project.clientName}
                                                    {project.status && project.status !== 'In Progress' && (
                                                        <span className={`ml-2 inline-flex items-center gap-1 text-[12px] font-medium px-1.5 py-0.5 rounded-[5px] align-middle ${project.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F5F5F7] text-[#86868B]'}`}>
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

                                            {/* Quick Download Links */}
                                            {(() => {
                                                const pFiles = (project as any).files || [];
                                                const quotes = pFiles.filter((f: any) => f.type === 'quotation');
                                                const drawings = pFiles.filter((f: any) => f.type === 'drawing');
                                                const latestQuote = quotes.length > 0 ? quotes[quotes.length - 1] : null;
                                                const latestDrawing = drawings.length > 0 ? drawings[drawings.length - 1] : null;

                                                if (!latestQuote && !latestDrawing) return null;
                                                
                                                return (
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {latestQuote && (
                                                            <a href={latestQuote.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors border border-blue-100">
                                                                <FileText className="w-3.5 h-3.5" />
                                                                <span className="truncate max-w-[100px]">{latestQuote.name}</span>
                                                            </a>
                                                        )}
                                                        {latestDrawing && (
                                                            <a href={latestDrawing.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition-colors border border-emerald-100">
                                                                <FileText className="w-3.5 h-3.5" />
                                                                <span className="truncate max-w-[100px]">{latestDrawing.name}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div className="mt-6 p-5 bg-[#F5F5F7] rounded-[8px] space-y-3">
                                                {['S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價'].includes(project.stage) ? (
                                                    <>
                                                        <div className="flex justify-between items-center text-[12px]">
                                                            <span className="text-[rgba(0,0,0,0.8)] font-normal">預計面積</span>
                                                            <span className="text-[#1D1D1F] font-semibold">{project.area || '未提供'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[12px]">
                                                            <span className="text-[rgba(0,0,0,0.8)] font-normal">約見時間</span>
                                                            <span className="text-[#1D1D1F] font-semibold">{project.meetingDateTime ? new Date(project.meetingDateTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未定'}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-center text-[12px]">
                                                            <span className="text-[rgba(0,0,0,0.8)] font-normal leading-none">工程預算</span>
                                                            <span className="text-[#1D1D1F] font-semibold leading-none block pt-0.5">HK${(project.budget / 10000).toFixed(1)}萬</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[12px] pt-1.5 flex-wrap gap-2">
                                                            <span className="text-[rgba(0,0,0,0.8)] font-normal leading-none shrink-0">總進度</span>
                                                            <div className="flex items-center gap-2">
                                                                {getActiveTask(project) && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}?openProgress=true`); }}
                                                                        className="inline-flex items-center gap-1 px-1.5 py-1 rounded-[6px] bg-blue-50 text-[#0071e3] hover:bg-blue-100/80 text-[10px] font-bold transition-colors border border-[#0071e3]/20"
                                                                        title={`點擊直接更新（${getActiveTask(project)?.phaseLabel}）`}
                                                                    >
                                                                        ▶ 進行中: {getActiveTask(project)?.taskLabel}
                                                                    </button>
                                                                )}
                                                                <span className="text-[#1D1D1F] font-semibold leading-none">{project.progress}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-1.5 bg-[#E8E8ED] rounded-full overflow-hidden mt-2 border-none cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}?openProgress=true`); }}>
                                                            <motion.div
                                                                className={`h-full rounded-full ${project.progress >= 90 ? 'bg-[#0071E3]' : project.progress >= 50 ? 'bg-[#0071E3]' : project.progress >= 25 ? 'bg-[#0071E3]' : 'bg-[#86868B]'}`}
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
                                <label className="text-xs font-semibold text-slate-500">負責同事 (Sales)</label>
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
                                <p className="text-[10px] text-slate-400 mt-1">S01 客戶查詢階段預設由「銷售部」跟進，PM 與設計師可於後續階段指派。</p>
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
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        {(Object.entries({ elder: '長者', adult: '大人', child: '小孩', helper: '工人' }) as [keyof typeof familyConfig, string][]).map(([k, label]) => (
                                            <div key={k} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/60 rounded-xl px-3 py-1.5">
                                                <span className="text-xs font-medium text-slate-600">{label}</span>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => setFamilyConfig(prev => ({ ...prev, [k]: Math.max(0, prev[k] - 1) }))} className="text-slate-400 hover:text-slate-700 w-4 h-4 flex items-center justify-center font-medium bg-white rounded shadow-sm border border-slate-100">-</button>
                                                    <span className="text-xs font-bold text-slate-700 w-2 text-center">{familyConfig[k]}</span>
                                                    <button type="button" onClick={() => setFamilyConfig(prev => ({ ...prev, [k]: prev[k] + 1 }))} className="text-slate-400 hover:text-slate-700 w-4 h-4 flex items-center justify-center font-medium bg-white rounded shadow-sm border border-slate-100">+</button>
                                                </div>
                                            </div>
                                        ))}
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
                                    <label className="text-xs font-semibold text-slate-600">預算 (萬元) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)} placeholder="45" className="h-10 pl-9 bg-white" />
                                    </div>
                                </div>
                            </div>
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
