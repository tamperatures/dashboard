'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    MapPin, User, Clock, ChevronLeft, ChevronDown, Calendar as CalIcon,
    Wallet, HardHat, FileText, UploadCloud, File, Image as ImageIcon,
    Download, Trash2, CheckCircle2, Circle, Loader2, Link as LinkIcon,
    Save, Plus, Users, X, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

const ALL_PHASES = [
    { key: 'S01_客戶查詢', label: 'S01 客戶查詢', dept: '推廣部' },
    { key: 'S02_見客前準備', label: 'S02 見客前準備', dept: '設計部' },
    { key: 'S03_初步報價', label: 'S03 初步報價', dept: '銷售部' },
    { key: 'S04_見客後跟進', label: 'S04 見客後跟進', dept: '設計部' },
    { key: 'S05_後續會面', label: 'S05 後續會面', dept: '銷售部' },
    { key: 'S06_工程啟動', label: 'S06 工程啟動', dept: '工程部' },
    { key: 'S07_工程進行中', label: 'S07 工程進行中', dept: '工程部' },
    { key: 'S08_工程完成', label: 'S08 工程完成', dept: '工程部' }
];

// Stage → visible widget mapping
const STAGE_WIDGETS: Record<string, string[]> = {
    'S01_客戶查詢': ['overview', 'meetings', 'notes'],
    'S02_見客前準備': ['design_links', 'meetings', 'notes'],
    'S03_初步報價': ['status', 'meetings', 'notes'],
    'S04_見客後跟進': ['design_links', 'meetings', 'notes'],
    'S05_後續會面': ['status', 'meetings', 'notes'],
    'S06_工程啟動': ['status', 'construction_team', 'construction_progress', 'notes'],
    'S07_工程進行中': ['status', 'construction_team', 'construction_progress', 'notes'],
    'S08_工程完成': ['status', 'construction_team', 'construction_progress', 'notes'],
};

// 工程進度 — 10 construction phases with sub-tasks
const CONSTRUCTION_PHASES = [
    {
        key: 'phase1SitePrep', icon: '☑️', label: '1. 工地準備', fields: [
            { key: 'adminApplication', label: '入則申請' },
            { key: 'insurance', label: '保險' },
            { key: 'tempUtilities', label: '臨時水電' },
            { key: 'publicProtection', label: '公眾保護' },
            { key: 'itemProtection', label: '物品保護' },
        ]
    },
    {
        key: 'phase2Demolition', icon: '🗑️', label: '2. 清拆及廢物處理', fields: [
            { key: 'survey', label: '勘查' },
            { key: 'execution', label: '清拆執行' },
            { key: 'noiseControl', label: '噪音控制' },
            { key: 'wasteDisposal', label: '廢物處理' },
        ]
    },
    {
        key: 'phase3Plumbing', icon: '⚡', label: '3. 間隔及水電煤工程 (基建)', fields: [
            { key: 'brickwork', label: '砌磚工程' },
            { key: 'trenching', label: '開坑佈線' },
            { key: 'positioning', label: '定位安裝' },
            { key: 'gasWork', label: '煤氣工程' },
        ]
    },
    {
        key: 'phase4Masonry', icon: '🧱', label: '4. 泥水及防水工程', fields: [
            { key: 'plastering', label: '批盪' },
            { key: 'waterproofing', label: '防水工程' },
            { key: 'tiling', label: '鋪磚' },
            { key: 'leveling', label: '找平' },
        ]
    },
    {
        key: 'phase5Carpentry', icon: '🔧', label: '5. 木工及油漆工程', fields: [
            { key: 'ceilingFeature', label: '天花造型' },
            { key: 'wallPreparation', label: '牆身處理' },
            { key: 'woodworkPainting', label: '木工油漆' },
        ]
    },
    {
        key: 'phase6Installation', icon: '🔩', label: '6. 後期安裝及裝嵌', fields: [
            { key: 'furnitureAssembly', label: '傢俬組裝' },
            { key: 'doorFloor', label: '門/地板安裝' },
            { key: 'fixtures', label: '燈具潔具' },
        ]
    },
    {
        key: 'phase7PreInspection', icon: '📋', label: '7. 內部預驗收及清潔', fields: [
            { key: 'internalCheck', label: '內部檢查' },
            { key: 'defectFix', label: '缺陷修復' },
            { key: 'basicCleaning', label: '基本清潔' },
        ]
    },
    {
        key: 'phase8OfficialInspection', icon: '👥', label: '8. 正式客戶驗收 (交場) 及執漏', fields: [
            { key: 'jointInspection', label: '聯合驗收' },
            { key: 'defectList', label: '缺陷清單' },
            { key: 'rectification', label: '執漏修正' },
        ]
    },
    {
        key: 'phase9Handover', icon: '💰', label: '9. 結算尾款及文件交接', fields: [
            { key: 'finalSettlement', label: '尾款結算' },
            { key: 'docHandover', label: '文件交接' },
        ]
    },
    {
        key: 'phase10Maintenance', icon: '🛡️', label: '10. 提供保養期服務', fields: [
            { key: 'warrantyPeriod', label: '保養期' },
            { key: 'maintenanceRecord', label: '維修記錄' },
        ]
    },
];

const STAGE_HINTS: Record<string, string> = {
    'S01_客戶查詢': '收集客戶基本資料、安排約見',
    'S02_見客前準備': '準備平面圖、SketchUp 3D 模型',
    'S03_初步報價': '提供初步報價、安排下次約見',
    'S04_見客後跟進': '修改設計圖、更新 3D 模型',
    'S05_後續會面': '跟進簽單、更新報價',
    'S06_工程啟動': '確認合約、啟動工程',
    'S07_工程進行中': '工程管理、進度追蹤',
    'S08_工程完成': '驗收、完工確認',
};

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user, userData } = useAuth();
    const userRole: string = userData?.role || 'staff';
    const userDepts: string[] = userData?.departments || (userData?.department ? [userData.department] : []);

    const [projectId, setProjectId] = useState<string | null>(null);
    const [project, setProject] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const toast = useToast();

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const [floorPlanLink, setFloorPlanLink] = useState('');
    const [sketchUpLink, setSketchUpLink] = useState('');
    // Dynamic meetings
    interface MeetingEntry { dateTime: string; location: string; }
    const [meetings, setMeetings] = useState<MeetingEntry[]>([]);
    const [notes, setNotes] = useState('');
    const [savingDetails, setSavingDetails] = useState(false);
    // 工程進度 accordion state
    const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
    const [expandedStageLogs, setExpandedStageLogs] = useState<Record<string, boolean>>({});

    const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
    const [newMeeting, setNewMeeting] = useState({ dateTime: '', location: '' });

    // Progress Modal State
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [tempProgressData, setTempProgressData] = useState<Record<string, Record<string, boolean>>>({});
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    const [savingProgress, setSavingProgress] = useState(false);

    const openProgressModal = () => {
        const currentData: any = {};
        CONSTRUCTION_PHASES.forEach(phase => {
            currentData[phase.key] = project?.[phase.key] || {};
        });
        setTempProgressData(currentData);
        setTempStartDate(project?.startDate || '');
        setTempEndDate(project?.endDate || '');
        setIsProgressModalOpen(true);
    };

    const handleSaveProgressDetails = async () => {
        setSavingProgress(true);
        try {
            await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...tempProgressData,
                    startDate: tempStartDate,
                    endDate: tempEndDate
                })
            });
            toast.success('工程進度已更新');
            setIsProgressModalOpen(false);
            fetchProject();
        } catch (e) {
            toast.error('儲存失敗');
        } finally {
            setSavingProgress(false);
        }
    };

    const toggleTempPhaseTask = (phaseKey: string, fieldKey: string, currentVal: boolean) => {
        setTempProgressData(prev => ({
            ...prev,
            [phaseKey]: {
                ...prev[phaseKey],
                [fieldKey]: !currentVal
            }
        }));
    };

    // Helpers for datetime-local
    const toLocalDatetimeString = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const tzoffset = d.getTimezoneOffset() * 60000;
        return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    };

    // Fetch param
    useEffect(() => {
        params.then(p => setProjectId(p.id));
    }, [params]);

    // Fetch project and employees
    useEffect(() => {
        if (!projectId) return;
        fetchProject();
        if (userRole === 'admin' || userRole === 'staff') {
            fetchEmployees();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, userRole]);

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}?t=` + Date.now(), { cache: 'no-store' });
            if (!res.ok) {
                if (res.status === 403) {
                    toast.error('權限不足或項目不存在');
                    router.push('/projects');
                    return;
                }
                throw new Error('Failed to load');
            }
            const data = await res.json();
            setProject(data.project);
            setFloorPlanLink(data.project.floorPlanLink || '');
            setSketchUpLink(data.project.sketchUpLink || '');
            // Load meetings: prefer meetings array, fall back to legacy single meeting
            if (data.project.meetings && data.project.meetings.length > 0) {
                setMeetings(data.project.meetings.map((m: any) => ({
                    dateTime: toLocalDatetimeString(m.dateTime),
                    location: m.location || ''
                })));
            } else if (data.project.meetingDateTime) {
                setMeetings([{
                    dateTime: toLocalDatetimeString(data.project.meetingDateTime),
                    location: data.project.meetingLocation || ''
                }]);
            } else {
                setMeetings([]);
            }
            setNotes(data.project.notes || data.project.description || '');
        } catch {
            toast.error('無法載入項目資料');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees?t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.users || []);
            }
        } catch {
            // silent fail
        }
    };

    const handleAddMeeting = async () => {
        if (!newMeeting.dateTime) {
            toast.error('請選擇約定時間');
            return;
        }

        const updatedMeetings = [...meetings, newMeeting];
        setMeetings(updatedMeetings);
        setSavingDetails(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetings: updatedMeetings }),
            });
            if (res.ok) {
                toast.success('已新增約見記錄');
                setIsAddMeetingOpen(false);
                setNewMeeting({ dateTime: '', location: '' });
                fetchProject();
            } else {
                throw new Error();
            }
        } catch (e) {
            toast.error('儲存失敗，請重試');
        } finally {
            setSavingDetails(false);
        }
    };

    const handleSaveMeetingList = async () => {
        try {
            await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetings }),
            });
        } catch (e) {
            console.error('Failed to auto-save meetings', e);
        }
    };

    const handleDeleteMeeting = async (idx: number) => {
        const updatedMeetings = meetings.filter((_, i) => i !== idx);
        setMeetings(updatedMeetings);
        try {
            await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetings: updatedMeetings }),
            });
            toast.success('已刪除約見記錄');
            fetchProject();
        } catch (e) {
            toast.error('刪除失敗');
        }
    };

    const currentPhaseDept = ALL_PHASES.find(p => p.key === project?.stage)?.dept || '';
    const isCurrentStageEditable = userRole === 'admin' || userDepts.includes(currentPhaseDept);

    const updateStage = async (newStageKey: string) => {
        if (userRole !== 'admin' && userRole !== 'staff') return;

        const targetPhase = ALL_PHASES.find(p => p.key === newStageKey);
        const targetIdx = ALL_PHASES.findIndex(p => p.key === newStageKey);
        const currentIdx = ALL_PHASES.findIndex(p => p.key === project?.stage);

        if (userRole === 'staff') {
            if (targetIdx <= currentIdx) {
                toast.error('員工無法回退或重選當前階段');
                return;
            }
            if (!isCurrentStageEditable) {
                toast.error('您非當前階段負責部門，無法提交推進請求');
                return;
            }

            const confirmed = await confirm({
                title: '提出推進請求',
                description: `確定要向管理員申請將項目推進至「${targetPhase?.label}」嗎？`,
                variant: 'info',
                confirmText: '提交申請',
            });
            if (!confirmed) return;

            try {
                const res = await fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestStage: newStageKey })
                });
                if (res.ok) {
                    toast.success('已發送推進請求，等待管理員審批');
                    fetchProject();
                } else {
                    const data = await res.json();
                    toast.error(data.error || '請求失敗');
                }
            } catch {
                toast.error('請求失敗');
            }
            return;
        }

        const isGoingBack = targetIdx < currentIdx;

        const confirmed = await confirm({
            title: isGoingBack ? '回退階段' : '更新階段',
            description: isGoingBack
                ? `確定要將階段回退至「${targetPhase?.label}」嗎？`
                : `確定要將階段推進至「${targetPhase?.label}」嗎？`,
            variant: isGoingBack ? 'warning' : 'info',
            confirmText: isGoingBack ? '確定回退' : '確定推進',
        });
        if (!confirmed) return;

        // Compute rough progress based on stage
        const newProgress = Math.round(((targetIdx + 1) / ALL_PHASES.length) * 100);

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStageKey, progress: newProgress })
            });
            if (res.ok) {
                toast.success(`已更新至 ${targetPhase?.label}`);
                fetchProject();
            }
        } catch {
            toast.error('更新失敗');
        }
    };


    const saveDetails = async () => {
        if (!isCurrentStageEditable && userRole !== 'admin') return;
        setSavingDetails(true);
        try {
            // Convert meetings to ISO format for storage
            const meetingsPayload = meetings
                .filter(m => m.dateTime || m.location)
                .map(m => ({
                    dateTime: m.dateTime ? new Date(m.dateTime).toISOString() : '',
                    location: m.location
                }));
            // Also set legacy fields from first meeting for calendar compatibility
            const firstMeeting = meetingsPayload[0];
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    floorPlanLink,
                    sketchUpLink,
                    meetings: meetingsPayload,
                    meetingDateTime: firstMeeting?.dateTime || '',
                    meetingLocation: firstMeeting?.location || '',
                    notes
                })
            });
            if (res.ok) fetchProject();
        } finally {
            setSavingDetails(false);
        }
    };

    // Toggle a construction phase sub-task checkbox and auto-save
    const togglePhaseTask = async (phaseKey: string, fieldKey: string, currentValue: boolean) => {
        if (!isCurrentStageEditable && userRole !== 'admin') return;
        const phaseData = { ...(project[phaseKey] || {}) };
        phaseData[fieldKey] = !currentValue;
        // Optimistic update
        setProject((prev: any) => ({ ...prev, [phaseKey]: phaseData }));
        try {
            await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [phaseKey]: phaseData })
            });
        } catch {
            // revert on failure
            fetchProject();
        }
    };

    const handlePmChange = async (newPm: string) => {
        try {
            const pmValue = newPm === '未指派' ? '' : newPm;
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pmResponsible: pmValue })
            });
            if (res.ok) fetchProject();
        } catch {
            // silent fail
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isCurrentStageEditable && userRole !== 'admin') return;
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (projectId) formData.append('projectId', projectId);
            const r2Res = await fetch('/api/media/upload', {
                method: 'POST',
                body: formData,
            });

            if (!r2Res.ok) throw new Error('上傳至 R2 失敗');
            const fileData = await r2Res.json();

            let fileType = 'other';
            if (file.type.startsWith('image/')) fileType = 'photo';
            else if (file.type === 'application/pdf' ||
                file.type === 'application/msword' ||
                file.type.includes('officedocument')) {
                if (file.name.includes('報價') || file.name.includes('Quotation')) fileType = 'quotation';
                else if (file.name.includes('圖則') || file.name.includes('Drawing')) fileType = 'drawing';
                else fileType = 'contract';
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newFile: {
                        name: fileData.fileName,
                        url: fileData.url,
                        size: fileData.size,
                        type: fileType,
                    }
                })
            });

            if (!res.ok) throw new Error('綁定至項目失敗');
            fetchProject();
        } catch (err: any) {
            toast.error(err.message || '上傳失敗');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteFile = async (fileId: string, fileName: string) => {
        if (!isCurrentStageEditable && userRole !== 'admin') {
            toast.error('您目前為唯讀模式，無法刪除檔案');
            return;
        }
        const confirmed = await confirm({
            title: '刪除檔案',
            description: `確定要刪除「${fileName}」嗎？此操作無法撤銷。`,
            variant: 'danger',
            confirmText: '刪除',
        });
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleteFileId: fileId })
            });
            if (res.ok) fetchProject();
        } catch {
            toast.error('刪除失敗');
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    if (!project) return null;

    const currentStageIdx = ALL_PHASES.findIndex(p => p.key === project.stage);

    return (
        <>
            <motion.div className="max-w-[1240px] mx-auto pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

                {/* Redesigned Header */}
                <div className="bg-white border-b border-slate-200 sticky top-0 z-30 mb-6">
                    <div className="px-6 sm:px-8 pt-5 pb-5">
                        {/* Row 1: Back + Title + Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => router.push('/projects')} className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100/80 -ml-2">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{project.clientName}的{project.renovationType}</h1>
                                        <Badge className="bg-slate-100 text-slate-500 px-2 py-0 border border-slate-200/60 text-[10px] font-mono font-semibold">
                                            {project.projectCode}
                                        </Badge>
                                        {project.status && project.status !== 'In Progress' && (
                                            <Badge className={`px-2 py-0.5 text-[10px] font-bold border-0 ${project.status === 'Signed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {project.status === 'Signed' ? '✓ 已簽單' : '未成交'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Circular Progress */}
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">總進度</p>
                                    <p className="text-sm font-bold text-slate-800">{ALL_PHASES[currentStageIdx]?.label.split(' ').slice(1).join(' ') || '—'}</p>
                                </div>
                                <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                        <circle cx="24" cy="24" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                        <circle cx="24" cy="24" r="20" fill="none" stroke="#3b82f6" strokeWidth="4"
                                            strokeDasharray={`${(project.progress / 100) * 125.6} 125.6`}
                                            strokeLinecap="round" className="transition-all duration-700"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{project.progress}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Info chips */}
                        <div className="flex items-center gap-2 mt-3 ml-10 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                <MapPin className="w-3 h-3 text-slate-400" /> {project.estate} {project.address}
                            </span>
                            {project.area && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                    <HardHat className="w-3 h-3 text-slate-400" /> {project.area} 呎
                                </span>
                            )}
                            {project.budget > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50">
                                    <Wallet className="w-3 h-3" /> HK${project.budget.toLocaleString()}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                <User className="w-3 h-3 text-slate-400" /> PM:
                                {(userRole === 'admin' || userRole === 'staff') ? (
                                    <Select value={project.pmResponsible || '未指派'} onValueChange={handlePmChange}>
                                        <SelectTrigger className="h-5 px-1 border-none shadow-none bg-transparent hover:bg-white text-xs font-semibold focus:ring-0 w-auto min-w-[50px] p-0 text-slate-700 data-[state=open]:bg-white">
                                            <SelectValue placeholder="選擇 PM" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            <SelectItem value="未指派">未指派</SelectItem>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="font-semibold text-slate-700">{project.pmResponsible || '未指派'}</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="px-6 sm:px-8">
                    {/* Admin Approval Banner */}
                    {project.pendingStageRequest && userRole === 'admin' && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4">
                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900">審批請求：推進至 {ALL_PHASES.find(p => p.key === project.pendingStageRequest.requestedStage)?.label}</h4>
                                    <p className="text-xs text-amber-700 mt-0.5">由 {project.pendingStageRequest.requestedBy} 於 {new Date(project.pendingStageRequest.createdAt).toLocaleString('zh-HK')} 提出</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm" variant="outline"
                                    className="border-amber-200 text-amber-700 hover:bg-amber-100"
                                    onClick={async () => {
                                        await fetch(`/api/projects/${projectId}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ resolveStageRequest: 'deny' })
                                        });
                                        fetchProject();
                                        toast.success('已拒絕請求');
                                    }}
                                >拒絕</Button>
                                <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                                    onClick={async () => {
                                        await fetch(`/api/projects/${projectId}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ resolveStageRequest: 'approve' })
                                        });
                                        fetchProject();
                                        toast.success('已批准請求並更新階段');
                                    }}
                                >批准並更新</Button>
                            </div>
                        </div>
                    )}

                    {project.pendingStageRequest && userRole === 'staff' && (
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <p className="text-xs font-medium text-blue-800">已提交推進至「{ALL_PHASES.find(p => p.key === project.pendingStageRequest.requestedStage)?.label}」的請求，等待管理員審批中。</p>
                        </div>
                    )}

                    {/* Clean Pill Tabs */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="flex w-fit bg-slate-50/50 p-1 border border-slate-100 shadow-sm rounded-lg mb-8">
                            <TabsTrigger value="overview" className="px-5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-md data-[state=active]:shadow-sm">工作流程與資訊</TabsTrigger>
                            <TabsTrigger value="documents" className="px-5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-md data-[state=active]:shadow-sm">文件與圖則</TabsTrigger>
                            <TabsTrigger value="photos" className="px-5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-md data-[state=active]:shadow-sm">現場照片</TabsTrigger>
                        </TabsList>

                        {/* Tab: Overview (The Main Workflow Page) */}
                        <TabsContent value="overview" className="mt-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

                                {/* LEFT COLUMN: 8-Step Workflow Tracker (Strict Line Layout) */}
                                <Card className="shadow-sm border-slate-200/80 rounded-xl overflow-hidden bg-white">
                                    <CardHeader className="pl-8 pt-7 pb-2">
                                        <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">工程進度追蹤 (S01 - S08)</CardTitle>
                                        <CardDescription className="text-xs text-slate-400">點擊階段以更新項目狀態</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-4 py-8 sm:px-12">
                                        <div className="relative border-l-2 border-slate-100/80 ml-7 space-y-8 pb-4">
                                            {ALL_PHASES.map((phase, idx) => {
                                                const isDone = idx < currentStageIdx;
                                                const isActive = idx === currentStageIdx;

                                                return (
                                                    <div key={phase.key} className="relative pl-10 w-full transition-all duration-300">

                                                        {/* Dot Indicator on the line */}
                                                        <div className="absolute left-[-9px] top-5 flex items-center justify-center">
                                                            {isActive ? (
                                                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-white shadow-sm">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                                </div>
                                                            ) : isDone ? (
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 ring-4 ring-white flex items-center justify-center" />
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 ring-4 ring-white flex items-center justify-center border border-slate-200/80" />
                                                            )}
                                                        </div>

                                                        {/* Phase Card */}
                                                        <button
                                                            onClick={() => updateStage(phase.key)}
                                                            className={`block w-full text-left rounded-xl transition-all max-w-[500px] border ${isActive
                                                                ? 'bg-blue-50/30 border-blue-200 shadow-[0_2px_8px_-4px_rgba(59,130,246,0.2)] hover:border-blue-300'
                                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between px-5 py-4">
                                                                <h3 className={`font-bold text-sm tracking-tight ${isActive ? 'text-blue-900' : isDone ? 'text-slate-800' : 'text-slate-600'}`}>{phase.label}</h3>

                                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider ${isActive ? 'bg-blue-100/50 text-blue-700' : 'bg-slate-100/60 text-slate-500'
                                                                    }`}>
                                                                    {phase.dept}
                                                                </span>
                                                            </div>
                                                        </button>

                                                        {/* Stage Activity Logs (Admin only) */}
                                                        {userRole === 'admin' && (() => {
                                                            const logs = (project.stageLogs || []).filter((l: any) => l.stage === phase.key)
                                                                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                                                            if (logs.length === 0) return null;
                                                            const isExpanded = expandedStageLogs[phase.key];
                                                            const visibleLogs = isExpanded ? logs : logs.slice(0, 3);
                                                            const hasMore = logs.length > 3;

                                                            return (
                                                                <div className="mt-1.5 ml-2 max-w-[480px] relative">
                                                                    <div className="space-y-0.5">
                                                                        {visibleLogs.map((log: any, li: number) => {
                                                                            const logUser = employees.find((e: any) => e.id === log.userId);
                                                                            const usernameColor = logUser?.role === 'staff' ? 'text-orange-500' : 'text-[#0071E3]';

                                                                            return (
                                                                                <div
                                                                                    key={log.id}
                                                                                    className={`group/log flex items-start gap-2 pl-3 pr-1 py-1 rounded-lg text-[11px] hover:bg-slate-50 transition-colors ${li === 0 ? 'bg-slate-50/60' : 'bg-transparent'
                                                                                        }`}
                                                                                >
                                                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5 font-mono">
                                                                                        {new Date(log.timestamp).toLocaleDateString('zh-HK', { month: '2-digit', day: '2-digit' })}{' '}
                                                                                        {new Date(log.timestamp).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
                                                                                    </span>
                                                                                    <span className={`text-[10px] font-bold ${usernameColor} whitespace-nowrap`}>{log.userName}</span>
                                                                                    <span className="text-[11px] text-slate-600 flex-1">{log.description}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={async (e) => {
                                                                                            e.stopPropagation();
                                                                                            const confirmed = await confirm({
                                                                                                title: '刪除日誌',
                                                                                                description: '確定刪除此活動記錄嗎？',
                                                                                                variant: 'danger',
                                                                                                confirmText: '刪除',
                                                                                            });
                                                                                            if (!confirmed) return;
                                                                                            try {
                                                                                                const res = await fetch(`/api/projects/${projectId}`, {
                                                                                                    method: 'PUT',
                                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                                    body: JSON.stringify({ deleteLogId: log.id }),
                                                                                                });
                                                                                                if (res.ok) fetchProject();
                                                                                            } catch { /* ignore */ }
                                                                                        }}
                                                                                        className="opacity-0 group-hover/log:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 shrink-0"
                                                                                        title="刪除日誌"
                                                                                    >
                                                                                        <X className="h-3 w-3" />
                                                                                    </button>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                    {hasMore && !isExpanded && (
                                                                        <div className="relative">
                                                                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setExpandedStageLogs(prev => ({ ...prev, [phase.key]: true }));
                                                                                }}
                                                                                className="flex items-center gap-1 text-[10px] font-semibold text-[#0071E3] hover:underline mt-1 ml-3 relative z-10"
                                                                            >
                                                                                <ChevronDown className="h-3 w-3" /> 查看更多 ({logs.length - 3} 條)
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    {hasMore && isExpanded && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setExpandedStageLogs(prev => ({ ...prev, [phase.key]: false }));
                                                                            }}
                                                                            className="flex items-center gap-1 text-[10px] font-semibold text-[#86868B] hover:text-[#0071E3] mt-1 ml-3"
                                                                        >
                                                                            收起
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* RIGHT COLUMN: Stage-Contextual Sidebar */}
                                <div className="space-y-5">
                                    {!isCurrentStageEditable && userRole === 'staff' && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                            <p className="text-xs text-red-700 font-medium">您目前為唯讀模式：只有當前階段負責部門（{currentPhaseDept}）的員工才能進行操作及修改資料。</p>
                                        </div>
                                    )}

                                    {/* Stage Context Banner */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/50 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                                                {ALL_PHASES[currentStageIdx]?.label || '—'}
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-400">•</span>
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                                {ALL_PHASES[currentStageIdx]?.dept}
                                            </span>
                                        </div>
                                        <p className="text-xs text-blue-700 font-medium">
                                            {STAGE_HINTS[project.stage] || '管理項目資訊'}
                                        </p>
                                    </div>

                                    {/* Widget: 項目概覽 — S01 */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('overview') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 px-6 pt-6">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                    <HardHat className="h-5 w-5 text-emerald-500" /> 項目概覽
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-6 pt-3 pb-6">
                                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">物業類型</p>
                                                        <p className="text-xs font-semibold text-slate-700">{project.propertyType || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">裝修類別</p>
                                                        <p className="text-xs font-semibold text-slate-700">{project.renovationType || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">實用面積</p>
                                                        <p className="text-xs font-semibold text-slate-700">{project.area ? `${project.area} 呎` : '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">家庭結構</p>
                                                        <p className="text-xs font-semibold text-slate-700">{project.familyStructure || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">預算</p>
                                                        <p className="text-xs font-semibold text-emerald-600">{project.budget ? `HK$${project.budget.toLocaleString()}` : '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">開工日期</p>
                                                        <p className="text-xs font-semibold text-slate-700">{project.startDate || '—'}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 項目狀態 — S03, S05-S08 */}
                                    {userRole === 'admin' && (STAGE_WIDGETS[project.stage] || []).includes('status') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 px-6 pt-6">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                    <FileText className="h-5 w-5 text-violet-500" /> 項目狀態
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-5 px-6 pt-3 pb-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide">目前狀態</label>
                                                    <Select
                                                        value={project.status || 'In Progress'}
                                                        onValueChange={async (val) => {
                                                            await fetch(`/api/projects/${projectId}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ status: val })
                                                            });
                                                            fetchProject();
                                                        }}
                                                    >
                                                        <SelectTrigger className={`h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-violet-500/20 ${!isCurrentStageEditable && userRole !== 'admin' ? 'pointer-events-none opacity-50' : ''}`}>
                                                            <span className="truncate font-semibold text-slate-700">
                                                                {(project.status || 'In Progress') === 'Signed' ? (
                                                                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 成功簽單</span>
                                                                ) : (project.status || 'In Progress') === 'Lost' ? (
                                                                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" /> 未能成交</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> 進行中</span>
                                                                )}
                                                            </span>
                                                        </SelectTrigger>
                                                        <SelectContent className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/95 backdrop-blur-md p-1.5">
                                                            <SelectItem value="In Progress" className="rounded-xl text-xs font-semibold focus:bg-slate-100/80 my-0.5 cursor-pointer py-2">
                                                                <span className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> 進行中</span>
                                                            </SelectItem>
                                                            <SelectItem value="Signed" className="rounded-xl text-xs font-semibold focus:bg-slate-100/80 my-0.5 cursor-pointer py-2">
                                                                <span className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 成功簽單</span>
                                                            </SelectItem>
                                                            <SelectItem value="Lost" className="rounded-xl text-xs font-semibold focus:bg-slate-100/80 my-0.5 cursor-pointer py-2">
                                                                <span className="flex items-center gap-2.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> 未能成交</span>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide">簽約日期</label>
                                                    <Input
                                                        type="date"
                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                        defaultValue={project.contractDate || ''}
                                                        onBlur={async (e) => {
                                                            await fetch(`/api/projects/${projectId}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ contractDate: e.target.value })
                                                            });
                                                            fetchProject();
                                                        }}
                                                        className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-violet-500/20 disabled:opacity-50"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 施工組合 — S06, S07, S08 */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('construction_team') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 px-6 pt-6">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                    <Users className="h-5 w-5 text-blue-500" /> 施工組合
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-6 pt-3 pb-6">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                                                    {[
                                                        { key: 'pmResponsible', label: 'PM 負責同事', icon: '👤' },
                                                        { key: 'designerResponsible', label: 'Designer 負責同事', icon: '🎨' },
                                                        { key: 'demolitionContractor', label: '打拆', icon: '🔨' },
                                                        { key: 'plumbingContractor', label: '水電', icon: '⚡' },
                                                        { key: 'masonryContractor', label: '泥水', icon: '🧱' },
                                                        { key: 'furnitureContractor', label: '傢俬', icon: '🛋️' },
                                                    ].map((item) => (
                                                        <div key={item.key} className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-500 tracking-wide">{item.label}</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px]">{item.icon}</span>
                                                                <Input
                                                                    disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                                    defaultValue={project[item.key] || ''}
                                                                    placeholder="未指派"
                                                                    onBlur={async (e) => {
                                                                        if (e.target.value !== (project[item.key] || '')) {
                                                                            await fetch(`/api/projects/${projectId}`, {
                                                                                method: 'PUT',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ [item.key]: e.target.value })
                                                                            });
                                                                            fetchProject();
                                                                        }
                                                                    }}
                                                                    className="h-10 text-xs pl-9 bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl pr-3 shadow-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {(STAGE_WIDGETS[project.stage] || []).includes('construction_progress') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
                                                <div>
                                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                        <HardHat className="h-5 w-5 text-orange-500" /> 工程進度
                                                    </CardTitle>
                                                    <CardDescription className="text-xs text-slate-400 mt-1">查看專案各階段工序的完成狀況</CardDescription>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                                        <Button
                                                            variant="default" size="sm"
                                                            onClick={openProgressModal}
                                                            className="h-8 gap-1.5 text-xs font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800 rounded-lg px-3 shadow-sm border border-orange-200/50"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" /> 更新進度
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-5 pt-3 pb-5">
                                                {/* Start/End Dates moved to Modal */}


                                                <div className="space-y-3">
                                                    {CONSTRUCTION_PHASES.map((phase) => {
                                                        const phaseData = project[phase.key] || {};
                                                        const doneCount = phase.fields.filter(f => phaseData[f.key] === true).length;
                                                        const totalCount = phase.fields.length;
                                                        const allDone = doneCount === totalCount;
                                                        const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

                                                        return (
                                                            <div key={phase.key} className="flex flex-col gap-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
                                                                <div className="flex items-center justify-between min-w-0">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="text-sm shrink-0">{phase.icon}</span>
                                                                        <span className={`text-[11px] font-semibold truncate ${allDone ? 'text-emerald-700' : 'text-slate-600'}`}>{phase.label}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 shrink-0 ${allDone ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {doneCount}/{totalCount}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-200/60 rounded-full h-1 mt-0.5 overflow-hidden">
                                                                    <div className={`h-full transition-all duration-500 ease-out ${allDone ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${progressPercent}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 約見記錄 — S01-S05 */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('meetings') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 px-6 pt-6">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                    <Clock className="h-5 w-5 text-amber-500" /> 約見記錄
                                                </CardTitle>
                                                <div className="flex items-center gap-1">
                                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                                        <Button
                                                            variant="default" size="sm"
                                                            onClick={() => setIsAddMeetingOpen(true)}
                                                            className="h-8 gap-1.5 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 rounded-lg px-3 shadow-sm border border-amber-200/50"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" /> 新增約見
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-6 pt-3 pb-6">
                                                <div className="space-y-4">
                                                    {meetings.length === 0 ? (
                                                        <div className="text-center py-6 text-[13px] font-semibold text-slate-400 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                                                            尚無約見記錄
                                                        </div>
                                                    ) : meetings.map((m, idx) => (
                                                        <div key={idx} className="bg-slate-50 hover:bg-slate-100/50 transition-colors border-transparent rounded-2xl p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-semibold text-slate-500 tracking-wide">第 {idx + 1} 次約見{idx === 0 ? ' (初次)' : ''}</span>
                                                                {meetings.length > 1 && (isCurrentStageEditable || userRole === 'admin') && (
                                                                    <button
                                                                        onClick={() => handleDeleteMeeting(idx)}
                                                                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold text-slate-500 tracking-wide">約定時間</label>
                                                                <Input
                                                                    type="datetime-local"
                                                                    disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                                    value={m.dateTime}
                                                                    onChange={e => setMeetings(prev => prev.map((item, i) => i === idx ? { ...item, dateTime: e.target.value } : item))}
                                                                    onBlur={handleSaveMeetingList}
                                                                    className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold text-slate-500 tracking-wide">見面地點</label>
                                                                <Input
                                                                    type="text"
                                                                    disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                                    value={m.location}
                                                                    onChange={e => setMeetings(prev => prev.map((item, i) => i === idx ? { ...item, location: e.target.value } : item))}
                                                                    onBlur={handleSaveMeetingList}
                                                                    placeholder="例如: 荃灣海之戀 / 辦公室"
                                                                    className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {project.googleFormLink && (
                                                    <a href={project.googleFormLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-lg border border-blue-100/50 transition-colors mt-3">
                                                        <FileText className="h-3.5 w-3.5" /> 檢視客戶填寫表單
                                                    </a>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 設計連結 — S02, S04 */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('design_links') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 px-6 pt-6">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                    <LinkIcon className="h-5 w-5 text-blue-500" /> 設計連結
                                                </CardTitle>
                                                {(isCurrentStageEditable || userRole === 'admin') && (
                                                    <Button variant="ghost" size="icon" onClick={saveDetails} disabled={savingDetails} className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md">
                                                        {savingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    </Button>
                                                )}
                                            </CardHeader>
                                            <CardContent className="space-y-4 px-6 pt-3 pb-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide">平面圖連結</label>
                                                    <Input
                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                        value={floorPlanLink}
                                                        onChange={e => setFloorPlanLink(e.target.value)}
                                                        placeholder="https://drive.google.com/..."
                                                        className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50"
                                                    />
                                                    {project.floorPlanLink && <a href={project.floorPlanLink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-blue-600 hover:underline inline-block mt-0.5 ml-1">前往連結 ↗</a>}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide">SketchUp 3D</label>
                                                    <Input
                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                        value={sketchUpLink}
                                                        onChange={e => setSketchUpLink(e.target.value)}
                                                        placeholder="https://drive.google.com/..."
                                                        className="h-9 text-xs bg-slate-50 border-slate-200/60 shadow-none focus-visible:ring-blue-500/20 disabled:opacity-50"
                                                    />
                                                    {project.sketchUpLink && <a href={project.sketchUpLink} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-blue-600 hover:underline inline-block mt-0.5 ml-1">前往連結 ↗</a>}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 附加備註 — all stages */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('notes') && (
                                        <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white">
                                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 px-6 pt-6">
                                                <CardTitle className="text-sm font-bold text-slate-800">附加備註</CardTitle>
                                                {(isCurrentStageEditable || userRole === 'admin') && (
                                                    <Button variant="ghost" size="icon" onClick={saveDetails} disabled={savingDetails} className="h-7 w-7 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-md">
                                                        {savingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    </Button>
                                                )}
                                            </CardHeader>
                                            <CardContent className="px-6 pt-3 pb-6">
                                                <textarea
                                                    disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                    value={notes}
                                                    onChange={e => setNotes(e.target.value)}
                                                    placeholder="沒有備註內容"
                                                    className="w-full min-h-[120px] text-[13px] text-slate-700 leading-relaxed bg-slate-100/80 hover:bg-slate-200/50 transition-colors rounded-xl border-transparent p-4 focus:outline-none focus:ring-2 focus:ring-slate-300/50 resize-none placeholder:italic placeholder:text-slate-400 disabled:opacity-50"
                                                />
                                            </CardContent>
                                        </Card>
                                    )}

                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab: Documents */}
                        < TabsContent value="documents" className="mt-0 outline-none" >
                            <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white h-full min-h-[500px]">
                                <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                                    <div>
                                        <CardTitle className="text-base font-semibold">文件檔案</CardTitle>
                                        <CardDescription>集中管理報價單及合約 (<span className="text-xs">PDF/圖片</span>)</CardDescription>
                                    </div>
                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-9 gap-2 bg-slate-900 text-white hover:bg-slate-800 text-sm shadow-sm ring-1 ring-slate-900/10">
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                            快速上傳
                                        </Button>
                                    )}
                                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx" onChange={handleFileUpload} />
                                </CardHeader>
                                <CardContent className="p-0">
                                    {project.files.filter((f: any) => f.type !== 'photo').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                                <FileText className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-500">尚無文件紀錄</h3>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">點擊上方按鈕上傳與此工程相關的設計圖則或報價合約</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {project.files.filter((f: any) => f.type !== 'photo').map((file: any) => (
                                                <div key={file.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors group">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50/50 border border-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
                                                            <File className="w-5 h-5 text-blue-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors line-clamp-1">{file.name}</a>
                                                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 mt-1">
                                                                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                <span className="uppercase text-slate-500">{file.type === 'quotation' ? '報價單' : file.type === 'drawing' ? '圖則' : file.type === 'contract' ? '合約' : '文件'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <a href={file.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                        {(isCurrentStageEditable || userRole === 'admin') && (
                                                            <button
                                                                onClick={() => handleDeleteFile(file.id, file.name)}
                                                                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="刪除檔案"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent >

                        {/* Tab: Photos */}
                        < TabsContent value="photos" className="mt-0 outline-none" >
                            <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl bg-white p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-800">現場照片與影片相簿</h3>
                                        <p className="text-xs text-slate-500 mt-1">紀錄工程前後及各種損耗細節</p>
                                    </div>
                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                        <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={uploading} className="h-9 gap-2 text-sm shadow-sm">
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} 上傳媒體
                                        </Button>
                                    )}
                                    <input ref={photoInputRef} type="file" className="hidden" accept="image/*,video/mp4,video/quicktime" onChange={handleFileUpload} />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {project.files.filter((f: any) => f.type === 'photo').map((photo: any) => (
                                        <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                                            <a href={photo.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                                                {photo.url.includes('.mp4') ? (
                                                    <video src={photo.url} className="w-full h-full object-cover" muted />
                                                ) : (
                                                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end h-1/2">
                                                    <p className="text-white text-[11px] font-medium line-clamp-2 leading-relaxed">{photo.name}</p>
                                                </div>
                                            </a>
                                            {/* Delete button */}
                                            {(isCurrentStageEditable || userRole === 'admin') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(photo.id, photo.name); }}
                                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/80 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                                                    title="刪除"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {project.files.filter((f: any) => f.type === 'photo').length === 0 && (
                                        <div className="col-span-full py-20 mt-4 text-center border border-dashed border-slate-300 bg-slate-50/50 rounded-2xl">
                                            <div className="w-14 h-14 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <ImageIcon className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-600 block mb-1">相簿是空的</p>
                                            <p className="text-xs font-medium text-slate-400">目前還沒有上傳任何相片</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </TabsContent >
                    </Tabs >
                </div >
            </motion.div >

            {/* 新增約見 Dialog (Auto-Save) */}
            <Dialog open={isAddMeetingOpen} onOpenChange={setIsAddMeetingOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Clock className="w-5 h-5 text-amber-500" /> 新增約見記錄
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">約定時間 <span className="text-red-500">*</span></label>
                            <Input
                                type="datetime-local"
                                value={newMeeting.dateTime}
                                onChange={e => setNewMeeting({ ...newMeeting, dateTime: e.target.value })}
                                className="bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20 rounded-xl h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">見面地點 (選填)</label>
                            <Input
                                type="text"
                                placeholder="例如: 荃灣海之戀 / 辦公室"
                                value={newMeeting.location}
                                onChange={e => setNewMeeting({ ...newMeeting, location: e.target.value })}
                                className="bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20 rounded-xl h-11"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddMeetingOpen(false)} className="rounded-xl h-10 px-5">取消</Button>
                        <Button onClick={handleAddMeeting} disabled={savingDetails || !newMeeting.dateTime} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 px-6 font-semibold shadow-sm">
                            {savingDetails ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 儲存記錄
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* 工程進度 Bulk Edit Modal */}
            <Dialog open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
                <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[85vh] custom-scrollbar p-6 sm:p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="flex items-center gap-2 text-slate-800 tracking-tight font-bold text-[18px]">
                            <HardHat className="w-5 h-5 text-orange-500" /> 更新工程進度
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">

                        {/* Dates Grid in Modal */}
                        <div className="flex gap-8 p-6 bg-white rounded-3xl border border-[#E8E8ED] shadow-sm mb-6">
                            <div className="flex-1 space-y-2.5">
                                <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">
                                    施工開始日期
                                </label>
                                <Input
                                    type="date"
                                    value={tempStartDate}
                                    onChange={e => setTempStartDate(e.target.value)}
                                    className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] hover:border-transparent transition-colors rounded-xl px-4 shadow-none focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                />
                            </div>
                            <div className="flex-1 space-y-2.5">
                                <label className="text-[12px] font-bold text-[#424245] tracking-wide ml-1">
                                    預計完工日期
                                </label>
                                <Input
                                    type="date"
                                    value={tempEndDate}
                                    onChange={e => setTempEndDate(e.target.value)}
                                    className="h-12 text-[14px] font-medium bg-[#F5F5F7] border-transparent hover:bg-[#E8E8ED] hover:border-transparent transition-colors rounded-xl px-4 shadow-none focus-visible:ring-2 focus-visible:ring-orange-500/20"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            {CONSTRUCTION_PHASES.map((phase) => {
                                const phaseData = tempProgressData[phase.key] || {};
                                const doneCount = phase.fields.filter(f => phaseData[f.key] === true).length;
                                const totalCount = phase.fields.length;
                                const allDone = doneCount === totalCount && totalCount > 0;
                                const isExpanded = expandedPhases.includes(phase.key);

                                return (
                                    <div key={phase.key} className={`bg-white transition-all overflow-hidden ${isExpanded ? 'my-3 rounded-2xl border border-[#E8E8ED] shadow-sm' : 'border-b border-slate-100 last:border-0 hover:bg-slate-50/50'}`}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedPhases(prev => prev.includes(phase.key) ? prev.filter(k => k !== phase.key) : [...prev, phase.key])}
                                            className={`w-full flex items-center justify-between px-6 transition-all ${isExpanded ? 'pt-5 pb-3' : 'py-4'}`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <span className="text-base shrink-0">{phase.icon}</span>
                                                <span className={`text-[14px] tracking-wide font-bold truncate ${allDone ? 'text-emerald-700' : 'text-[#1D1D1F]'}`}>{phase.label}</span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${allDone ? 'bg-emerald-50 text-emerald-600' : 'bg-[#F5F5F7] text-[#86868B]'}`}>
                                                    {doneCount}/{totalCount}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 text-[#86868B] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="bg-white px-6 pb-5 pt-1 space-y-1">
                                                {phase.fields.map((field) => {
                                                    const checked = phaseData[field.key] === true;
                                                    return (
                                                        <label key={field.key} className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); toggleTempPhaseTask(phase.key, field.key, checked); }}
                                                                className="shrink-0 flex items-center justify-center pointer-events-none"
                                                            >
                                                                {checked ? (
                                                                    <CheckCircle2 className="h-[22px] w-[22px] text-[#A5B4FC]" />
                                                                ) : (
                                                                    <div className="h-[22px] w-[22px] rounded-full border-2 border-[#E8E8ED] group-hover:border-slate-300 transition-colors bg-white hover:bg-slate-50" />
                                                                )}
                                                            </button>
                                                            <span className={`text-[13px] font-semibold tracking-wide ${checked ? 'text-slate-400 line-through' : 'text-[#424245]'}`}>
                                                                {field.label}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter className="pt-5 pb-3 mt-2">
                        <Button variant="outline" onClick={() => setIsProgressModalOpen(false)} className="rounded-xl h-10 px-6 font-bold text-[#424245] border-transparent hover:bg-[#F5F5F7]">取消</Button>
                        <Button onClick={handleSaveProgressDetails} disabled={savingProgress} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-10 px-8 font-bold border-none transition-all shadow-[0_2px_10px_rgba(249,115,22,0.2)] hover:shadow-[0_4px_16px_rgba(249,115,22,0.4)]">
                            {savingProgress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 儲存進度
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {ConfirmDialogComponent}
        </>
    );
}

// Icon helper to avoid redefining component
function CalendarIcon(props: any) {
    return <CalIcon {...props} />;
}
