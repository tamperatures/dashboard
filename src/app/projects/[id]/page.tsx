'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    Save, Plus, Users, X, AlertCircle, Paperclip, Inbox
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { addWorkingDays, formatGanttDate } from '@/lib/dateUtils';

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

// Stage → visible widget mapping (Cumulative to carry data forward)
const STAGE_WIDGETS: Record<string, string[]> = {
    'S01_客戶查詢': ['overview', 'meetings', 'notes'],
    'S02_見客前準備': ['overview', 'design_links', 'meetings', 'notes'],
    'S03_初步報價': ['overview', 'design_links', 'status', 'meetings', 'notes'],
    'S04_見客後跟進': ['overview', 'design_links', 'status', 'meetings', 'notes'],
    'S05_後續會面': ['overview', 'design_links', 'status', 'meetings', 'notes'],
    'S06_工程啟動': ['overview', 'design_links', 'status', 'construction_team', 'construction_progress', 'meetings', 'notes'],
    'S07_工程進行中': ['overview', 'design_links', 'status', 'construction_team', 'construction_progress', 'meetings', 'notes'],
    'S08_工程完成': ['overview', 'design_links', 'status', 'construction_team', 'construction_progress', 'meetings', 'notes'],
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
    const searchParams = useSearchParams();
    const openProgressParam = searchParams.get('openProgress');
    
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

            // Auto-open progress modal if queried
            if (openProgressParam === 'true') {
                const currentData: any = {};
                CONSTRUCTION_PHASES.forEach(phase => {
                    currentData[phase.key] = data.project[phase.key] || {};
                });
                setTempProgressData(currentData);
                setTempStartDate(data.project.startDate || '');
                setTempEndDate(data.project.endDate || '');
                setIsProgressModalOpen(true);
                // Clear the parameter to avoid re-opening on manual closes
                window.history.replaceState({}, '', `/projects/${projectId}`);
            }
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
            const targetDept = targetPhase?.dept || '';
            if (!userDepts.includes(targetDept) && targetDept !== '—') {
                toast.error(`無許可權！${targetPhase?.label} 必須由「${targetDept}」執行推進。`);
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
            let finalName = fileData.fileName;
            if (file.type.startsWith('image/')) fileType = 'photo';
            else if (file.type === 'application/pdf' || file.type === 'application/msword' || file.type.includes('officedocument')) {
                const lowerName = file.name.toLowerCase();
                if (lowerName.includes('報價') || lowerName.includes('quotation') || lowerName.includes('quote')) fileType = 'quotation';
                else if (lowerName.includes('圖則') || lowerName.includes('drawing') || lowerName.includes('plan')) fileType = 'drawing';
                else fileType = 'contract';
            }

            if (fileType === 'quotation') {
                const existingQuotes = project.files?.filter((f: any) => f.type === 'quotation') || [];
                const vNum = existingQuotes.length + 1;
                finalName = `[v${vNum}] ${finalName}`;
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newFile: {
                        name: finalName,
                        url: fileData.url,
                        size: fileData.size,
                        type: fileType,
                    }
                })
            });

            if (!res.ok) throw new Error('綁定至項目失敗');
            toast.success(`✔️ 成功上傳：${finalName}`);
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

                {/* Shadcn UI Header */}
                <div className="bg-white text-slate-900 border-b border-slate-200 rounded-t-[24px] mb-6">
                    <div className="px-6 sm:px-8 pt-6 pb-6">
                        {/* Row 1: Back + Title + Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" onClick={() => router.push('/projects')} className="text-slate-500 hover:text-slate-900 -ml-2">
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">{project.clientName}的{project.renovationType}</h1>
                                        <Badge variant="outline" className="text-xs font-mono">
                                            {project.projectCode}
                                        </Badge>
                                        {project.status && project.status !== 'In Progress' && (
                                            <Badge variant={project.status === 'Signed' ? 'default' : 'secondary'} className="text-xs">
                                                {project.status === 'Signed' ? '✓ 已簽單' : '未成交'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Circular Progress */}
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">總進度</p>
                                    <p className="text-sm font-bold text-slate-900">{ALL_PHASES[currentStageIdx]?.label.split(' ').slice(1).join(' ') || '—'}</p>
                                </div>
                                <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                        <circle cx="24" cy="24" r="20" fill="none" className="stroke-slate-100" strokeWidth="4" />
                                        <circle cx="24" cy="24" r="20" fill="none" className="stroke-blue-600" strokeWidth="4"
                                            strokeDasharray={`${(project.progress / 100) * 125.6} 125.6`}
                                            strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.7s ease-in-out' }}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">{project.progress}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Info chips */}
                        <div className="flex items-center gap-3 mt-4 ml-10 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md font-medium">
                                <MapPin className="w-4 h-4 text-slate-400" /> {project.estate} {project.address}
                            </span>
                            {project.area && (
                                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md font-medium">
                                    <HardHat className="w-4 h-4 text-slate-400" /> {project.area} 呎
                                </span>
                            )}
                            {project.budget > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md">
                                    <Wallet className="w-4 h-4" /> HK${project.budget.toLocaleString()}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-md font-medium">
                                <User className="w-4 h-4 text-slate-400" /> Sales:
                                {(userRole === 'admin' || userRole === 'staff') ? (
                                    <Select value={project.pmResponsible || '未指派'} onValueChange={handlePmChange}>
                                        <SelectTrigger className="h-6 px-2 border-none shadow-none bg-transparent hover:bg-slate-200 text-sm font-medium focus:ring-0 w-auto min-w-[70px]">
                                            <SelectValue placeholder="選擇 Sales" />
                                        </SelectTrigger>
                                        <SelectContent align="start">
                                            <SelectItem value="未指派">未指派</SelectItem>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="font-semibold text-slate-900">{project.pmResponsible || '未指派'}</span>
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

                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="mb-8 bg-slate-100/80 p-1.5 rounded-xl h-auto border border-slate-200/60 shadow-sm">
                            <TabsTrigger value="overview" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">工作流程與資訊</TabsTrigger>
                            <TabsTrigger value="documents" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">文件與圖則</TabsTrigger>
                            <TabsTrigger value="photos" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">現場照片</TabsTrigger>
                            <TabsTrigger value="timeline" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">工程排程 (Timeline)</TabsTrigger>
                        </TabsList>

                        {/* Tab: Overview (The Main Workflow Page) */}
                        <TabsContent value="overview" className="mt-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

                                {/* LEFT COLUMN: 8-Step Workflow Tracker (Strict Line Layout) */}
                                <Card>
                                    <CardHeader className="pl-6 pt-6 pb-3">
                                        <CardTitle className="text-xl font-bold tracking-tight">工程進度追蹤 (S01 - S08)</CardTitle>
                                        <CardDescription>點擊階段以更新項目狀態</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-4 py-6 sm:px-10">
                                        <div className="relative border-l-2 border-slate-100 ml-7 space-y-6 pb-4">
                                            {ALL_PHASES.map((phase, idx) => {
                                                const isDone = idx < currentStageIdx;
                                                const isActive = idx === currentStageIdx;

                                                return (
                                                    <div key={phase.key} className="relative pl-8 w-full transition-all duration-300">

                                                        {/* Dot Indicator on the line */}
                                                        <div className="absolute left-[-9px] top-5 flex items-center justify-center">
                                                            {isActive ? (
                                                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-white shadow-sm">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                                                                </div>
                                                            ) : isDone ? (
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 ring-4 ring-white flex items-center justify-center" />
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 ring-4 ring-white flex items-center justify-center border border-slate-200" />
                                                            )}
                                                        </div>

                                                        {/* Phase Card */}
                                                        <button
                                                            onClick={() => updateStage(phase.key)}
                                                            className={`block w-full text-left rounded-lg transition-all max-w-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${isActive
                                                                ? 'bg-slate-50 border border-slate-200 shadow-sm'
                                                                : 'bg-slate-100 border border-transparent hover:border-slate-200 hover:bg-slate-50'
                                                                } ${(!isActive && !isDone && userRole !== 'admin' && !userDepts.includes(phase.dept) && phase.dept !== '—') ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
                                                        >
                                                            <div className="flex items-center justify-between px-5 py-4">
                                                                <h3 className={`text-base font-bold ${isActive ? 'text-slate-900' : isDone ? 'text-slate-800' : 'text-slate-500'}`}>
                                                                    {phase.label}
                                                                </h3>

                                                                <Badge variant="secondary" className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'bg-blue-100/50 text-blue-700' : 'text-slate-500'}`}>
                                                                    {phase.dept}
                                                                </Badge>
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
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
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
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
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
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
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

                                    {/* Widget: 工程進度 */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('construction_progress') && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                                    <HardHat className="h-5 w-5 text-orange-500" /> 工程進度
                                                </CardTitle>
                                                <CardDescription>直接點擊展開各工序以勾選完成進度</CardDescription>
                                            </CardHeader>
                                            <CardContent className="px-5 pt-3 pb-5">
                                                <div className="space-y-3">
                                                    {CONSTRUCTION_PHASES.map((phase) => {
                                                        const phaseData = project[phase.key] || {};
                                                        const adHocTasks = phaseData.adHocTasks || [];
                                                        const doneCount = phase.fields.filter(f => phaseData[f.key] === true).length + adHocTasks.filter((t: any) => t.completed).length;
                                                        const totalCount = phase.fields.length + adHocTasks.length;
                                                        const allDone = totalCount > 0 && doneCount === totalCount;
                                                        const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                                                        const isExpanded = expandedPhases.includes(phase.key);

                                                        return (
                                                            <div key={phase.key} className="flex flex-col bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                                                <button
                                                                    onClick={() => setExpandedPhases(prev => prev.includes(phase.key) ? prev.filter(k => k !== phase.key) : [...prev, phase.key])}
                                                                    className="flex items-center justify-between p-4 w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:bg-slate-100 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="text-[16px] shrink-0">{phase.icon}</span>
                                                                        <span className={`text-[14px] font-semibold tracking-tight ${allDone ? 'text-emerald-700' : 'text-slate-900'}`}>{phase.label}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                                            {doneCount}/{totalCount}
                                                                        </span>
                                                                    </div>
                                                                </button>

                                                                {!isExpanded && (
                                                                    <div className="w-full bg-slate-200 h-1 overflow-hidden">
                                                                        <div className={`h-full transition-all duration-500 ease-out ${allDone ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${progressPercent}%` }} />
                                                                    </div>
                                                                )}

                                                                {isExpanded && (
                                                                    <div className="p-3 border-t border-slate-100 bg-white">
                                                                        <div className="space-y-2 mb-4">
                                                                            {phase.fields.map((field) => (
                                                                                <label key={field.key} className="flex items-center gap-3 cursor-pointer group">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={phaseData[field.key] || false}
                                                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                                                        onChange={() => togglePhaseTask(phase.key, field.key, phaseData[field.key])}
                                                                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                                                                                    />
                                                                                    <span className={`text-xs font-semibold select-none ${phaseData[field.key] ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                                                                        {field.label}
                                                                                    </span>
                                                                                </label>
                                                                            ))}
                                                                            {adHocTasks.map((t: any, idx: number) => (
                                                                                <label key={t.id} className="flex items-center gap-3 cursor-pointer group">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={t.completed}
                                                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                                                        onChange={async () => {
                                                                                            const updatedTasks = [...adHocTasks];
                                                                                            updatedTasks[idx].completed = !updatedTasks[idx].completed;
                                                                                            const updatedPhaseData = { ...phaseData, adHocTasks: updatedTasks };
                                                                                            setProject((prev: any) => ({ ...prev, [phase.key]: updatedPhaseData }));
                                                                                            await fetch(`/api/projects/${projectId}`, {
                                                                                                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                                                                                body: JSON.stringify({ [phase.key]: updatedPhaseData })
                                                                                            });
                                                                                        }}
                                                                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                                                                                    />
                                                                                    <span className={`text-xs font-semibold select-none ${t.completed ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                                                                        {t.title}
                                                                                    </span>
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                        
                                                                        {(isCurrentStageEditable || userRole === 'admin') && (
                                                                            <Button 
                                                                                variant="outline" size="sm" 
                                                                                onClick={async () => {
                                                                                    const title = prompt('新增工作項目名稱：');
                                                                                    if (!title) return;
                                                                                    const newTask = { id: Date.now().toString(), title, completed: false };
                                                                                    const updatedPhaseData = { ...phaseData, adHocTasks: [...adHocTasks, newTask] };
                                                                                    setProject((prev: any) => ({ ...prev, [phase.key]: updatedPhaseData }));
                                                                                    await fetch(`/api/projects/${projectId}`, {
                                                                                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({ [phase.key]: updatedPhaseData })
                                                                                    });
                                                                                }}
                                                                                className="h-7 text-[10px] w-full border-dashed border-slate-300 text-slate-500 hover:text-slate-800"
                                                                            >
                                                                                <Plus className="h-3 w-3 mr-1" /> 新增自訂項目
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 約見記錄 — S01-S05 */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('meetings') && (
                                        <Card>
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
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
                                        <Card>
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
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
                                        <Card>
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                                <CardTitle className="text-base font-bold">附加備註</CardTitle>
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
                        <TabsContent value="documents" className="mt-0 outline-none">
                            <Card className="h-full min-h-[500px]">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold tracking-tight">文件檔案</CardTitle>
                                        <CardDescription>集中管理報價單及合約 (PDF/圖片)</CardDescription>
                                    </div>
                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                            快速上傳
                                        </Button>
                                    )}
                                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx" onChange={handleFileUpload} />
                                </CardHeader>
                                <CardContent className="p-6">
                                    {project.files.filter((f: any) => f.type !== 'photo').length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                                                <FileText className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-500">尚無文件紀錄</h3>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">點擊上方按鈕上傳與此工程相關的設計圖則或報價合約</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {(() => {
                                                const nonPhotos = project.files.filter((f: any) => f.type !== 'photo');
                                                // Archive logic: any quotation not tracking vLatest
                                                const quotes = nonPhotos.filter((f: any) => f.type === 'quotation').sort((a: any, b: any) => b.name.localeCompare(a.name));
                                                const activeQuote = quotes.length > 0 ? quotes[0] : null;
                                                const archiveQuotes = quotes.slice(1);
                                                
                                                const folders = [
                                                    { id: 'quotation', title: '報價單與官方合約', icon: <FileText className="w-4 h-4" />, files: [...(activeQuote ? [activeQuote] : []), ...nonPhotos.filter((f: any) => f.type === 'contract')] },
                                                    { id: 'drawing', title: '設計圖則 (平面圖/3D)', icon: <ImageIcon className="w-4 h-4" />, files: nonPhotos.filter((f: any) => f.type === 'drawing') },
                                                    { id: 'other', title: '客戶來料與雜項檔案', icon: <Paperclip className="w-4 h-4" />, files: nonPhotos.filter((f: any) => f.type === 'other' || !['quotation', 'contract', 'drawing'].includes(f.type)) },
                                                    { id: 'archive', title: '歸檔 (歷史版本)', icon: <Inbox className="w-4 h-4" />, files: archiveQuotes },
                                                ];

                                                return folders.map(folder => {
                                                    if (folder.files.length === 0) return null;
                                                    return (
                                                        <div key={folder.id} className="border border-[#E8E8ED] bg-white rounded-2xl overflow-hidden shadow-sm">
                                                            <div className="bg-[#F5F5F7]/80 px-4 py-3 flex items-center gap-2 border-b border-[#E8E8ED]">
                                                                <span className="text-[#86868B]">{folder.icon}</span>
                                                                <h4 className="text-[13px] font-bold text-[#1D1D1F] tracking-wide">{folder.title}</h4>
                                                                <Badge variant="outline" className="ml-2 bg-white text-[#86868B] border-[#D1D1D6] px-1.5 py-0 min-w-[20px] text-center">{folder.files.length}</Badge>
                                                            </div>
                                                            <div className="divide-y divide-[#F5F5F7]">
                                                                {folder.files.map((file: any) => (
                                                                    <div key={file.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F5F5F7] transition-colors group">
                                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                                                <File className="w-4 h-4 text-blue-600" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <a href={file.url} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-[#1D1D1F] hover:text-[#0071E3] transition-colors line-clamp-1">{file.name}</a>
                                                                                <div className="flex items-center gap-2 text-[10px] font-medium text-[#86868B] mt-0.5">
                                                                                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                                                                    <span className="w-1 h-1 rounded-full bg-[#D1D1D6]" />
                                                                                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <a href={file.url} target="_blank" rel="noreferrer" className="p-2 text-[#86868B] hover:text-[#0071E3] hover:bg-blue-50 rounded-lg transition-colors">
                                                                                <Download className="w-4 h-4" />
                                                                            </a>
                                                                            {(isCurrentStageEditable || userRole === 'admin') && (
                                                                                <button onClick={() => handleDeleteFile(file.id, file.name)} className="p-2 text-[#86868B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="刪除檔案">
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent >

                        {/* Tab: Photos */}
                        <TabsContent value="photos" className="mt-0 outline-none">
                            <Card className="min-h-[500px]">
                                <CardHeader className="flex flex-row items-center justify-between border-b">
                                    <div>
                                        <CardTitle className="text-xl font-bold tracking-tight">現場照片與影片相簿</CardTitle>
                                        <CardDescription>紀錄工程前後及各種損耗細節</CardDescription>
                                    </div>
                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                        <Button onClick={() => photoInputRef.current?.click()} disabled={uploading}>
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />} 上傳媒體
                                        </Button>
                                    )}
                                    <input ref={photoInputRef} type="file" className="hidden" accept="image/*,video/mp4,video/quicktime" onChange={handleFileUpload} />
                                </CardHeader>
                                <CardContent className="p-6">

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
                                        <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white border border-[#E8E8ED] shadow-sm rounded-[24px]">
                                            <div className="w-16 h-16 bg-[#F5F5F7] rounded-[16px] border border-[#D1D1D6] flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform">
                                                <ImageIcon className="w-8 h-8 text-[#86868B]" />
                                            </div>
                                            <h3 className="text-[16px] font-bold text-[#1D1D1F] tracking-wide mb-1.5">相簿是空的</h3>
                                            <p className="text-[13px] font-semibold text-[#86868B] max-w-[220px] leading-relaxed">
                                                目前還沒有上傳任何相片。<br/>請點擊右上方按鈕上傳紀錄。
                                            </p>
                                        </div>
                                    )}
                                </div>
                                </CardContent>
                            </Card>
                        </TabsContent >

                        {/* Tab: Timeline */}
                        <TabsContent value="timeline" className="mt-0 outline-none">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                                    <div>
                                        <CardTitle className="text-xl font-bold tracking-tight">工程排程甘特圖 (Mode B)</CardTitle>
                                        <CardDescription>獨立地盤的生命週期排程。輸入預計開工日及天數自動計算完工日 (避開星期日與特定公眾假期)。</CardDescription>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">系統預設開工日</p>
                                        <p className="text-sm font-bold text-slate-900">{project.startDate || '未設定'}</p>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-6 pb-6">
                                    <div className="space-y-4">
                                    <div className="grid grid-cols-[minmax(120px,1.5fr)_1fr_80px_1fr] md:grid-cols-[minmax(200px,2fr)_1fr_100px_1fr] gap-4 px-4 py-2 border-b border-slate-200/60 pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <div>工序 / 階段名稱</div>
                                        <div>預計開工日期</div>
                                        <div>工作天數</div>
                                        <div>自動推算完工日期</div>
                                    </div>
                                    {CONSTRUCTION_PHASES.map((phase, idx) => {
                                        const pData = project[phase.key] || {};
                                        // Default startDate to project.startDate for first phase if unset, otherwise keep empty
                                        const effectiveStart = pData.startDate || (idx === 0 ? project.startDate : '');
                                        const calculatedEnd = pData.completionDate || (effectiveStart && pData.days ? addWorkingDays(effectiveStart, Number(pData.days)) : '');

                                        return (
                                            <div key={phase.key} className="grid grid-cols-[minmax(120px,1.5fr)_1fr_80px_1fr] md:grid-cols-[minmax(200px,2fr)_1fr_100px_1fr] gap-4 px-4 py-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl items-center border border-transparent hover:border-slate-100 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-slate-400">{phase.icon}</span>
                                                    <span className="text-[13px] font-bold text-slate-700 truncate">{phase.label}</span>
                                                </div>
                                                <div>
                                                    <Input
                                                        type="date"
                                                        value={effectiveStart}
                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                        onChange={async (e) => {
                                                            const newStart = e.target.value;
                                                            const newDays = pData.days || 3;
                                                            const newEnd = addWorkingDays(newStart, Number(newDays));
                                                            const updatedPhase = { ...pData, startDate: newStart, days: newDays, completionDate: newEnd };
                                                            setProject((prev: any) => ({ ...prev, [phase.key]: updatedPhase }));
                                                            await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [phase.key]: updatedPhase }) });
                                                        }}
                                                        className="h-9 text-xs bg-white focus-visible:ring-blue-500/20"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        type="number" min="0" placeholder="天數"
                                                        value={pData.days || ''}
                                                        disabled={!isCurrentStageEditable && userRole !== 'admin'}
                                                        onChange={async (e) => {
                                                            const newDays = e.target.value;
                                                            const newEnd = effectiveStart ? addWorkingDays(effectiveStart, Number(newDays)) : '';
                                                            const updatedPhase = { ...pData, days: newDays, completionDate: newEnd };
                                                            setProject((prev: any) => ({ ...prev, [phase.key]: updatedPhase }));
                                                            await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [phase.key]: updatedPhase }) });
                                                        }}
                                                        className="h-9 text-xs bg-white focus-visible:ring-blue-500/20"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 flex items-center px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md w-full shadow-sm">
                                                        {calculatedEnd ? new Date(calculatedEnd).toLocaleDateString('zh-HK') : '—'}
                                                    </div>
                                                    {(isCurrentStageEditable || userRole === 'admin') && calculatedEnd && idx < CONSTRUCTION_PHASES.length - 1 && (
                                                        <button
                                                            type="button"
                                                            title="將此作爲下一階段開工日"
                                                            onClick={async () => {
                                                                const nextPhase = CONSTRUCTION_PHASES[idx + 1];
                                                                const nextPhaseData = project[nextPhase.key] || {};
                                                                // Next phase starts next day essentially? Standardly it can be next working day.
                                                                const nextStart = addWorkingDays(calculatedEnd, 1);
                                                                const nextEnd = nextStart && nextPhaseData.days ? addWorkingDays(nextStart, Number(nextPhaseData.days)) : '';
                                                                const updatedNextPhase = { ...nextPhaseData, startDate: nextStart, completionDate: nextEnd };
                                                                setProject((prev: any) => ({ ...prev, [nextPhase.key]: updatedNextPhase }));
                                                                await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [nextPhase.key]: updatedNextPhase }) });
                                                                toast.success(`聯動成功！${nextPhase.label} 開工日已設為 ${nextStart}`);
                                                            }}
                                                            className="shrink-0 p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                        >
                                                            <LinkIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
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
                <DialogContent className="sm:max-w-xl flex flex-col overflow-hidden max-h-[85vh] p-0 border-none rounded-[24px] shadow-2xl bg-[#F5F5F7]">
                    <div className="shrink-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-[#E8E8ED] px-7 py-5">
                        <DialogTitle className="flex items-center gap-2.5 text-[#1D1D1F] tracking-tight font-bold text-[18px]">
                            <HardHat className="w-5 h-5 text-[#0071E3]" /> 更新工程進度
                        </DialogTitle>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-7 py-6 space-y-6">
                        {/* Dates Grid in Modal */}
                        <div className="bg-white rounded-[16px] border border-[#E8E8ED] shadow-sm p-5 space-y-4">
                            <h4 className="text-[12px] font-bold text-[#86868B] uppercase tracking-wider">排程日期</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-[#1D1D1F]">施工開始</label>
                                    <Input
                                        type="date"
                                        value={tempStartDate}
                                        onChange={e => setTempStartDate(e.target.value)}
                                        className="h-10 text-[14px] font-medium bg-white border-[#D1D1D6] hover:border-[#86868B] transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-bold text-[#1D1D1F]">預計完工</label>
                                    <Input
                                        type="date"
                                        value={tempEndDate}
                                        onChange={e => setTempEndDate(e.target.value)}
                                        className="h-10 text-[14px] font-medium bg-white border-[#D1D1D6] hover:border-[#86868B] transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/20"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Phases Accordion */}
                        <div className="bg-white rounded-[16px] border border-[#E8E8ED] shadow-sm overflow-hidden flex flex-col divide-y divide-[#E8E8ED]">
                            {CONSTRUCTION_PHASES.map((phase) => {
                                const phaseData = tempProgressData[phase.key] || {};
                                const doneCount = phase.fields.filter(f => phaseData[f.key] === true).length;
                                const totalCount = phase.fields.length;
                                const allDone = doneCount === totalCount && totalCount > 0;
                                const isExpanded = expandedPhases.includes(phase.key);

                                return (
                                    <div key={phase.key} className="bg-white transition-colors">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedPhases(prev => prev.includes(phase.key) ? prev.filter(k => k !== phase.key) : [...prev, phase.key])}
                                            className={`w-full flex items-center justify-between px-5 transition-all outline-none ${isExpanded ? 'bg-[#F5F5F7] py-4' : 'hover:bg-[#F5F5F7] py-4'}`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <span className="text-base shrink-0 opacity-80">{phase.icon}</span>
                                                <span className={`text-[14px] tracking-wide font-bold truncate ${allDone ? 'text-emerald-600' : 'text-[#1D1D1F]'}`}>{phase.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${allDone ? 'bg-emerald-100/50 text-emerald-600' : 'bg-[#E8E8ED] text-[#424245]'}`}>
                                                    {doneCount}/{totalCount}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 text-[#86868B] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="bg-white px-2 py-2">
                                                {phase.fields.map((field) => {
                                                    const checked = phaseData[field.key] === true;
                                                    return (
                                                        <button 
                                                            key={field.key} 
                                                            onClick={(e) => { e.preventDefault(); toggleTempPhaseTask(phase.key, field.key, checked); }}
                                                            className="w-full flex items-center gap-3.5 py-3 px-4 mx-2 my-1 rounded-xl hover:bg-[#F5F5F7] cursor-pointer transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/30"
                                                        >
                                                            <div className="shrink-0 flex items-center justify-center pointer-events-none relative">
                                                                <div className={`h-[20px] w-[20px] rounded-[6px] border-2 transition-all flex items-center justify-center ${checked ? 'bg-[#0071E3] border-[#0071E3]' : 'bg-white border-[#D1D1D6] group-hover:border-[#0071E3]/50'}`}>
                                                                    {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                </div>
                                                            </div>
                                                            <span className={`text-[13px] font-bold tracking-wide select-none ${checked ? 'text-[#86868B] line-through decoration-[#D1D1D6]' : 'text-[#424245]'}`}>
                                                                {field.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="shrink-0 px-7 py-4 border-t border-[#E8E8ED] bg-white flex justify-end gap-3 rounded-b-[24px]">
                        <Button variant="outline" onClick={() => setIsProgressModalOpen(false)} className="h-10 rounded-xl px-5 text-[13px] font-bold">取消</Button>
                        <Button onClick={handleSaveProgressDetails} disabled={savingProgress} className="h-10 rounded-xl px-6 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold shadow-sm">
                            {savingProgress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 儲存進度
                        </Button>
                    </div>
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
