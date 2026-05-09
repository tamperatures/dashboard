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
    Save, Plus, Users, X, AlertCircle, Paperclip, Inbox, Edit2, Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { formatGanttDate } from '@/lib/dateUtils';
import { CONSTRUCTION_PHASES } from '@/lib/constants';
import { GanttTimelineEditor } from '@/components/GanttTimelineEditor';
import { AdvancedGanttChart } from '@/components/AdvancedGanttChart';

const ALL_PHASES = [
    { key: 'S01_客戶查詢', label: 'S01 客戶查詢', dept: '推廣部' },
    { key: 'S02_見客前準備', label: 'S02 見客前準備', dept: '設計部' },
    { key: 'S03_初步報價', label: 'S03 初步報價', dept: '銷售部' },
    { key: 'S04_見客後跟進', label: 'S04 見客後跟進', dept: '設計部' },
    { key: 'S05_後續會面', label: 'S05 後續會面', dept: '銷售部' },
    { key: 'P06_工程啟動', label: 'P06 工程啟動', dept: '工程部' },
    { key: 'P07_工程進行中', label: 'P07 工程進行中', dept: '工程部' },
    { key: 'P08_工程完成', label: 'P08 工程完成', dept: '工程部' }
];

// Stage → visible widget mapping (Cumulative to carry data forward)
const STAGE_WIDGETS: Record<string, string[]> = {
    'S01_客戶查詢': ['overview', 'meetings', 'notes'],
    'S02_見客前準備': ['overview', 'design_links', 'meetings', 'notes'],
    'S03_初步報價': ['overview', 'design_links', 'status', 'meetings', 'notes'],
    'S04_見客後跟進': ['overview', 'design_links', 'status', 'meetings', 'notes'],
    'S05_後續會面': ['overview', 'design_links', 'status', 'meetings', 'notes'],
    'P06_工程啟動': ['overview', 'design_links', 'construction_team', 'notes'],
    'P07_工程進行中': ['overview', 'design_links', 'construction_team', 'construction_progress', 'notes'],
    'P08_工程完成': ['overview', 'design_links', 'construction_team', 'construction_progress', 'notes'],
};


const STAGE_HINTS: Record<string, string> = {
    'S01_客戶查詢': '收集客戶基本資料、安排約見',
    'S02_見客前準備': '準備平面圖、SketchUp 3D 模型',
    'S03_初步報價': '提供初步報價、安排下次約見',
    'S04_見客後跟進': '修改設計圖、更新 3D 模型',
    'S05_後續會面': '跟進簽單、更新報價',
    'P06_工程啟動': '確認合約、啟動工程',
    'P07_工程進行中': '工程管理、進度追蹤',
    'P08_工程完成': '驗收、完工確認',
};

const TIME_OPTIONS = Array.from({ length: 24 * 2 }).map((_, i) => {
    const hh = String(Math.floor(i / 2)).padStart(2, '0');
    const mm = i % 2 === 0 ? '00' : '30';
    return `${hh}:${mm}`;
});

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
    const [forcedFileType, setForcedFileType] = useState<string | null>(null);
    const [photoFolder, setPhotoFolder] = useState<string>('uncategorized');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Gantt Editor State
    const [isEditGanttOpen, setIsEditGanttOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const [floorPlanLink, setFloorPlanLink] = useState('');
    const [sketchUpLink, setSketchUpLink] = useState('');
    const [quotationLink, setQuotationLink] = useState('');
    // Dynamic meetings
    interface MeetingEntry { dateTime: string; location: string; createdByDept?: string; }
    const [meetings, setMeetings] = useState<MeetingEntry[]>([]);
    const [newMeeting, setNewMeeting] = useState<MeetingEntry>({ dateTime: '', location: '', createdByDept: '' });
    const [notes, setNotes] = useState('');
    const [savingDetails, setSavingDetails] = useState(false);
    // 工程進度 accordion state
    const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
    const [expandedStageLogs, setExpandedStageLogs] = useState<Record<string, boolean>>({});

    const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
    const [tradeFilter, setTradeFilter] = useState<string>('all');

    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [editForm, setEditForm] = useState({ budget: 0, area: 0, clientName: '', propertyType: '', renovationType: '', startDate: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    const openEditProject = () => {
        setEditForm({
            budget: project?.budget || 0,
            area: project?.area || 0,
            clientName: project?.clientName || '',
            propertyType: project?.propertyType || '',
            renovationType: project?.renovationType || '',
            startDate: project?.startDate || '',
        });
        setIsEditProjectOpen(true);
    };

    const handleSaveEditProject = async () => {
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error('儲存失敗');
            toast.success('項目資料已更新');
            setIsEditProjectOpen(false);
            fetchProject();
        } catch (err: any) {
            toast.error(err.message || '儲存失敗');
        } finally {
            setSavingEdit(false);
        }
    };

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
            setQuotationLink(data.project.quotationLink || '');
            // Load meetings: prefer meetings array, fall back to legacy single meeting
            if (data.project.meetings && data.project.meetings.length > 0) {
                setMeetings(data.project.meetings.map((m: any) => ({
                    dateTime: toLocalDatetimeString(m.dateTime),
                    location: m.location || '',
                    createdByDept: m.createdByDept || ''
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

        const meetingToSave = { ...newMeeting, createdByDept: userDepts[0] || '' };
        const updatedMeetings = [...meetings, meetingToSave];
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
                setNewMeeting({ dateTime: '', location: '', createdByDept: '' });
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
    
    // Core Widget Permission Flags
    const isDesignDept = userDepts.includes('設計部');
    const isSalesMarketing = userDepts.includes('推廣部') || userDepts.includes('銷售部');
    const canEditDesignLinks = userRole === 'admin' || isDesignDept;
    const canEditMeetingsList = userRole === 'admin' || isSalesMarketing;
    const canEditStatus = userRole === 'admin' || isSalesMarketing;
    const canEditProjectOverview = userRole === 'admin' || isCurrentStageEditable || userDepts.includes('銷售部');


    const currentStageIdx = ALL_PHASES.findIndex(p => p.key === project?.stage);
    const currentPhase = ALL_PHASES[currentStageIdx];
    const nextPhase = ALL_PHASES[currentStageIdx + 1];
    const canFastTrack = isCurrentStageEditable && nextPhase && currentStageIdx < ALL_PHASES.length - 1;

    // Clear unread indicator when user opens the project
    useEffect(() => {
        if (!project || !projectId || !userDepts.length) return;
        const unread = project.unreadDepartments || [];
        const matches = unread.filter((d: string) => userDepts.includes(d));
        if (matches.length > 0) {
            const newUnread = unread.filter((d: string) => !userDepts.includes(d));
            fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unreadDepartments: newUnread })
            }).then(() => {
                // Silently cleared in background
                setProject({ ...project, unreadDepartments: newUnread });
            }).catch(() => {});
        }
    }, [project?.unreadDepartments, projectId, userDepts]);

    const fastTrackNextStage = async () => {
        if (!canFastTrack) return;
        const targetDept = nextPhase.dept;
        
        const confirmed = await confirm({
            title: '推進至下一階段',
            description: `確定要將專案交接並推進至「${nextPhase.label}」嗎？\n${targetDept !== '—' && currentPhase?.dept !== targetDept ? `\n接收部門「${targetDept}」將會收到新交接的紅點提示。` : ''}`,
            confirmText: '確定推進',
            variant: 'info'
        });
        if (!confirmed) return;

        try {
            const newProgress = Math.round(((currentStageIdx + 2) / ALL_PHASES.length) * 100);
            const bodyPayload: any = { stage: nextPhase.key, progress: newProgress };
            
            // Add unread department marker if cross-department
            if (targetDept !== '—' && currentPhase?.dept !== targetDept) {
                const existingUnread = project.unreadDepartments || [];
                if (!existingUnread.includes(targetDept)) {
                    bodyPayload.unreadDepartments = [...existingUnread, targetDept];
                }
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            if (res.ok) {
                toast.success('專案已成功推進至下一階段');
                fetchProject();
            } else {
                toast.error('操作失敗');
            }
        } catch (e) {
            toast.error('操作發生錯誤');
        }
    };

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
        const targetDept = targetPhase?.dept || '';
        const currentDept = ALL_PHASES[currentIdx]?.dept || '';
        const isCrossDept = targetDept !== '—' && currentDept !== targetDept;

        const confirmed = await confirm({
            title: isGoingBack ? '回退階段' : '更新階段',
            description: isGoingBack
                ? `確定要將階段回退至「${targetPhase?.label}」嗎？`
                : `確定要將階段推進至「${targetPhase?.label}」嗎？${isCrossDept ? `\n接收部門「${targetDept}」將會收到新交接的紅點提示。` : ''}`,
            variant: isGoingBack ? 'warning' : 'info',
            confirmText: isGoingBack ? '確定回退' : '確定推進',
        });
        if (!confirmed) return;

        // Compute rough progress based on stage
        const newProgress = Math.round(((targetIdx + 1) / ALL_PHASES.length) * 100);

        try {
            const bodyPayload: any = { stage: newStageKey, progress: newProgress };
            
            // Add unread department marker if cross-department handoff
            if (isCrossDept && !isGoingBack) {
                const existingUnread = project.unreadDepartments || [];
                if (!existingUnread.includes(targetDept)) {
                    bodyPayload.unreadDepartments = [...existingUnread, targetDept];
                }
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
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
                    quotationLink,
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
        let newProgress = project.progress;
        if (project.stage >= 'P06') {
            let totalTasks = 0;
            let doneTasks = 0;
            const tempProject = { ...project, [phaseKey]: phaseData };
            CONSTRUCTION_PHASES.forEach(phase => {
                const pd = tempProject[phase.key] || {};
                const adHoc = pd.adHocTasks || [];
                totalTasks += phase.fields.length + adHoc.length;
                doneTasks += phase.fields.filter(f => pd[f.key]).length + adHoc.filter((t: any) => t.completed).length;
            });
            if (totalTasks > 0) newProgress = Math.min(100, Math.round(75 + (doneTasks / totalTasks) * 25));
        }

        // Optimistic update
        setProject((prev: any) => ({ ...prev, [phaseKey]: phaseData, progress: newProgress }));
        try {
            await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [phaseKey]: phaseData, progress: newProgress })
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

            let fileType = forcedFileType || 'other';
            let finalName = fileData.fileName;
            if (!forcedFileType) {
                if (file.type.startsWith('image/')) fileType = 'photo';
                else if (file.type === 'application/pdf' || file.type === 'application/msword' || file.type.includes('officedocument')) {
                    const lowerName = file.name.toLowerCase();
                    if (lowerName.includes('報價') || lowerName.includes('quotation') || lowerName.includes('quote')) fileType = 'quotation';
                    else if (lowerName.includes('圖則') || lowerName.includes('drawing') || lowerName.includes('plan')) fileType = 'drawing';
                    else fileType = 'contract';
                }
            }


            if (fileType === 'quotation') {
                const existingQuotes = project.files?.filter((f: any) => f.type === 'quotation') || [];
                const vNum = existingQuotes.length + 1;
                finalName = `[v${vNum}] ${finalName}`;
            }

            // Determine which department should be notified about this upload
            // e.g. Sales uploads quotation → notify 設計部; Design uploads drawing → notify 銷售部/工程部
            const FILE_NOTIFY_MAP: Record<string, string[]> = {
                'quotation': ['設計部'],     // Sales uploads quote → Design needs to see
                'drawing': ['銷售部', '工程部'],  // Design uploads drawing → Sales & Engineering
                'contract': ['工程部', '會計部'],  // Contract → Engineering & Accounting
            };
            const notifyDepts = FILE_NOTIFY_MAP[fileType] || [];
            const existingUnread = project.unreadDepartments || [];
            const newUnreadDepts = notifyDepts.filter((d: string) => !existingUnread.includes(d) && !userDepts.includes(d));

            const uploadBody: any = {
                newFile: {
                    name: finalName,
                    url: fileData.url,
                    size: fileData.size,
                    type: fileType,
                    ...(fileType === 'photo' && photoFolder ? { folder: photoFolder } : {}),
                }
            };
            if (newUnreadDepts.length > 0) {
                uploadBody.unreadDepartments = [...existingUnread, ...newUnreadDepts];
            }

            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadBody)
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
    if (!project) return null;


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
                                        {canEditProjectOverview && (
                                            <Button variant="ghost" size="icon" onClick={openEditProject} className="text-slate-400 hover:text-slate-700 h-8 w-8 hover:bg-slate-100 rounded-lg">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Badge variant="outline" className="text-xs font-mono border-slate-200 text-slate-600 bg-white shadow-sm ml-2 px-2.5">
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
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-8 bg-slate-100/80 p-1.5 rounded-xl h-auto border border-slate-200/60 shadow-sm">
                            <TabsTrigger value="overview" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">工作流程與資訊</TabsTrigger>
                            {/* 文件與圖則 tab hidden — replaced by Google Drive links */}
                            <TabsTrigger value="photos" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">現場照片</TabsTrigger>
                            <TabsTrigger value="timeline" className="px-5 py-2.5 text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50">工程排程 (Timeline)</TabsTrigger>
                        </TabsList>

                        {/* Tab: Overview (The Main Workflow Page) */}
                        <TabsContent value="overview" className="mt-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

                                {/* LEFT COLUMN: 8-Step Workflow Tracker (Strict Line Layout) */}
                                <Card>
                                    <CardHeader className="pl-6 pt-6 pb-3 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl font-bold tracking-tight">工程進度追蹤 (S01 - S08)</CardTitle>
                                            <CardDescription>點擊階段以更新項目狀態</CardDescription>
                                        </div>
                                        {canFastTrack && (
                                            <Button 
                                                onClick={fastTrackNextStage} 
                                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold h-10 px-6 rounded-xl shrink-0"
                                            >
                                                推進至下一階段
                                            </Button>
                                        )}
                                    </CardHeader>
                                    <CardContent className="px-4 py-6 sm:px-10">
                                        <div className="relative border-l-2 border-slate-100 ml-7 space-y-6 pb-4">
                                            {ALL_PHASES.map((phase, idx) => {
                                                const isDone = idx < currentStageIdx;
                                                const isActive = idx === currentStageIdx;
                                                const hasUnread = isActive && (project.unreadDepartments || []).some((d: string) => d === phase.dept);
                                                const isMyDeptUnread = isActive && (project.unreadDepartments || []).some((d: string) => userDepts.includes(d));

                                                return (
                                                    <div key={phase.key} className="relative pl-8 w-full transition-all duration-300">

                                                        {/* Dot Indicator on the line */}
                                                        <div className="absolute left-[-9px] top-5 flex items-center justify-center">
                                                            {isActive && hasUnread ? (
                                                                /* Red dot — department has NOT reviewed/finished */
                                                                <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center ring-4 ring-white shadow-sm">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                                </div>
                                                            ) : isActive ? (
                                                                /* Blue dot — department is working / has reviewed */
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
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className={`text-base font-bold ${isActive ? 'text-slate-900' : isDone ? 'text-slate-800' : 'text-slate-500'}`}>
                                                                        {phase.label}
                                                                    </h3>
                                                                    {/* Inline unread badge for the active phase */}
                                                                    {isActive && isMyDeptUnread && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 shadow-sm animate-in fade-in">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                                            新交接
                                                                        </span>
                                                                    )}
                                                                </div>

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
                                    {(STAGE_WIDGETS[project.stage] || []).includes('status') && (
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
                                                        disabled={!canEditStatus}
                                                        value={project.status || 'In Progress'}
                                                        onValueChange={async (val) => {
                                                            const isJumpingToP06 = val === 'Signed' && currentStageIdx < ALL_PHASES.findIndex(p => p.key === 'P06_工程啟動');
                                                            const p06Phase = ALL_PHASES.find(p => p.key === 'P06_工程啟動');

                                                            const confirmed = await confirm({
                                                                title: '更改項目狀態',
                                                                description: `確定要將項目狀態更改為「${val === 'Signed' ? '成功簽單' : val === 'Lost' ? '未能成交' : '進行中'}」嗎？${isJumpingToP06 ? '\n系統將會自動將專案推進至「P06 工程啟動」並移交給工程部！' : ''}`,
                                                                confirmText: '確定更改',
                                                                variant: 'warning'
                                                            });
                                                            if (!confirmed) return;

                                                            try {
                                                                const bodyPayload: any = { status: val };

                                                                if (isJumpingToP06 && p06Phase) {
                                                                    bodyPayload.stage = p06Phase.key;
                                                                    bodyPayload.progress = Math.round(((ALL_PHASES.findIndex(p => p.key === p06Phase.key) + 1) / ALL_PHASES.length) * 100);
                                                                    
                                                                    const existingUnread = project.unreadDepartments || [];
                                                                    if (!existingUnread.includes(p06Phase.dept)) {
                                                                        bodyPayload.unreadDepartments = [...existingUnread, p06Phase.dept];
                                                                    }
                                                                }

                                                                await fetch(`/api/projects/${projectId}`, {
                                                                    method: 'PUT',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify(bodyPayload)
                                                                });
                                                                toast.success(isJumpingToP06 ? '已更新狀態，並成功推進至 P06 工程階段' : '項目狀態已更新');
                                                                fetchProject();
                                                            } catch (e) {
                                                                toast.error('更改狀態失敗');
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className={`h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-violet-500/20`}>
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
                                                        disabled={!canEditStatus}
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
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                                <div>
                                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                                        <HardHat className="h-5 w-5 text-orange-500" /> 工程進度 (Gantt)
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">點擊展開工序打勾；點擊右上角編輯天數與順序</CardDescription>
                                                </div>
                                                {(isCurrentStageEditable || userRole === 'admin') && (
                                                    <Button 
                                                        variant="outline" size="sm" 
                                                        onClick={() => {
                                                            setActiveTab('timeline');
                                                            // Scroll to top to ensure the tab is fully visible
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="h-8 gap-1.5 text-xs font-bold text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" /> 編輯工程排程
                                                    </Button>
                                                )}
                                            </CardHeader>
                                            <CardContent className="px-5 pt-3 pb-5">
                                                <div className="space-y-3">
                                                    {(() => {
                                                        // Phase keys for stage-based filtering
                                                        const P07_KEYS = ['phase1SitePrep','phase2Demolition','phase3Plumbing','phase4Masonry','phase5Carpentry','phase6Installation','phase7PreInspection'];
                                                        const P08_KEYS = ['phase8OfficialInspection','phase9Handover','phase10Maintenance'];
                                                        const visibleKeys = project.stage === 'P08_工程完成' ? P08_KEYS : P07_KEYS;

                                                        return (project?.ganttTimeline?.length > 0 
                                                            ? project.ganttTimeline 
                                                            : CONSTRUCTION_PHASES.map((p, idx) => ({ id: `default-${idx}`, key: p.key, name: p.label, duration: 5, isIncluded: true }))
                                                        ).filter((p: any) => p.isIncluded && visibleKeys.includes(p.key)).map((phase: any) => {
                                                        const staticPhaseDef = CONSTRUCTION_PHASES.find(c => c.key === phase.key);
                                                        const fields = staticPhaseDef ? staticPhaseDef.fields : [];
                                                        const icon = staticPhaseDef ? staticPhaseDef.icon : '🚧';
                                                        
                                                        const phaseData = project[phase.key] || {};
                                                        const adHocTasks = phaseData.adHocTasks || [];
                                                        const doneCount = fields.filter((f: any) => phaseData[f.key] === true).length + adHocTasks.filter((t: any) => t.completed).length;
                                                        const totalCount = fields.length + adHocTasks.length;
                                                        const allDone = totalCount > 0 && doneCount === totalCount;
                                                        const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
                                                        const isExpanded = expandedPhases.includes(phase.id || phase.key);

                                                        return (
                                                            <div key={phase.id || phase.key} className="flex flex-col bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                                                <button
                                                                    onClick={() => setExpandedPhases(prev => prev.includes(phase.id || phase.key) ? prev.filter(k => k !== (phase.id || phase.key)) : [...prev, phase.id || phase.key])}
                                                                    className="flex items-center justify-between p-4 w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:bg-slate-100 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                        <span className="text-[16px] shrink-0">{icon}</span>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className={`text-[14px] font-semibold tracking-tight truncate ${allDone ? 'text-emerald-700' : 'text-slate-900'}`}>{phase.name}</span>
                                                                            {phase.calculatedStartDate && phase.calculatedEndDate && (
                                                                                <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                                    {formatGanttDate(phase.calculatedStartDate)} - {formatGanttDate(phase.calculatedEndDate)} ({phase.duration}天)
                                                                                </span>
                                                                            )}
                                                                        </div>
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
                                                                            {fields.map((field: any) => (
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
                                                    });
                                                    })()}
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
                                                    {canEditMeetingsList && (
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
                                                    ) : meetings.map((m, idx) => {
                                                        const isMeetingEditable = userRole === 'admin' || m.createdByDept === userDepts[0] || (!m.createdByDept && canEditMeetingsList);
                                                        return (
                                                        <div key={idx} className="bg-slate-50 hover:bg-slate-100/50 transition-colors border-transparent rounded-2xl p-5 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-semibold text-slate-500 tracking-wide flex items-center gap-2">
                                                                    第 {idx + 1} 次約見{idx === 0 ? ' (初次)' : ''}
                                                                    {m.createdByDept && <Badge variant="outline" className="text-[9px] bg-white border-slate-200 py-0 text-slate-400">{m.createdByDept}</Badge>}
                                                                </span>
                                                                {meetings.length > 1 && isMeetingEditable && (
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
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        type="date"
                                                                        disabled={!isMeetingEditable}
                                                                        value={m.dateTime ? m.dateTime.split('T')[0] : ''}
                                                                        onChange={e => {
                                                                            const dateStr = e.target.value;
                                                                            const timeStr = m.dateTime ? (m.dateTime.split('T')[1] || '09:00') : '09:00';
                                                                            setMeetings(prev => prev.map((item, i) => i === idx ? { ...item, dateTime: `${dateStr}T${timeStr}` } : item));
                                                                        }}
                                                                        onBlur={handleSaveMeetingList}
                                                                        className="h-10 w-full text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50"
                                                                    />
                                                                    <Select
                                                                        disabled={!isMeetingEditable}
                                                                        value={m.dateTime ? (m.dateTime.split('T')[1] || '09:00') : '09:00'}
                                                                        onValueChange={(val) => {
                                                                            const dateStr = m.dateTime ? (m.dateTime.split('T')[0] || '') : '';
                                                                            setMeetings(prev => prev.map((item, i) => i === idx ? { ...item, dateTime: `${dateStr}T${val}` } : item));
                                                                            setTimeout(handleSaveMeetingList, 50);
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-10 w-[110px] text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50 outline-none">
                                                                            <SelectValue placeholder="時間" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="max-h-[300px]">
                                                                            {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[11px] font-semibold text-slate-500 tracking-wide">見面地點</label>
                                                                <Select
                                                                    disabled={!isMeetingEditable}
                                                                    value={['地盤', '寫字樓', ''].includes(m.location) ? m.location : 'other'}
                                                                    onValueChange={async (val) => {
                                                                        const newLoc = val === 'other' ? '咖啡室/其他' : val;
                                                                        const newMeetings = meetings.map((item, i) => i === idx ? { ...item, location: newLoc } : item);
                                                                        setMeetings(newMeetings);
                                                                        setSavingDetails(true);
                                                                        try {
                                                                            const meetingsPayload = newMeetings.map(mx => ({ dateTime: mx.dateTime ? new Date(mx.dateTime).toISOString() : '', location: mx.location }));
                                                                            await fetch(`/api/projects/${projectId}`, {
                                                                                method: 'PUT',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ meetings: meetingsPayload })
                                                                            });
                                                                            fetchProject();
                                                                        } finally {
                                                                            setSavingDetails(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50">
                                                                        <SelectValue placeholder="選擇地點" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="地盤">地盤</SelectItem>
                                                                        <SelectItem value="寫字樓">寫字樓</SelectItem>
                                                                        <SelectItem value="other">其他 (請註明)</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                {!['地盤', '寫字樓', ''].includes(m.location) && (
                                                                    <Input
                                                                        type="text"
                                                                        disabled={!isMeetingEditable}
                                                                        placeholder="請輸入地點 (例如：Starbucks)"
                                                                        value={m.location === '其他' || m.location === '咖啡室/其他' ? '' : m.location}
                                                                        onChange={e => {
                                                                            const newLoc = e.target.value || '咖啡室/其他';
                                                                            setMeetings(prev => prev.map((item, i) => i === idx ? { ...item, location: newLoc } : item));
                                                                        }}
                                                                        onBlur={handleSaveMeetingList}
                                                                        className="h-10 text-xs w-full bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:opacity-50 mt-2 placeholder:text-slate-400"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                                {project.googleFormLink && (
                                                    <a href={project.googleFormLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-lg border border-blue-100/50 transition-colors mt-3">
                                                        <FileText className="h-3.5 w-3.5" /> 檢視客戶填寫表單
                                                    </a>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Widget: 設計圖連結 (Google Drive Links) — S02+ */}
                                    {(STAGE_WIDGETS[project.stage] || []).includes('design_links') && (
                                        <Card>
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                                    <LinkIcon className="h-5 w-5 text-blue-500" /> 設計圖連結 (Google Drive)
                                                </CardTitle>
                                                {(canEditDesignLinks || isCurrentStageEditable || userRole === 'admin') && (
                                                    <Button variant="ghost" size="icon" onClick={saveDetails} disabled={savingDetails} className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md">
                                                        {savingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    </Button>
                                                )}
                                            </CardHeader>
                                            <CardContent className="space-y-4 px-6 pt-3 pb-6">
                                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed -mt-1">貼上 Google Drive 資料夾連結，統一管理報價單、平面圖及 3D 模型。</p>

                                                {/* 報價單 / 企劃書連結 */}
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                        報價單 / 企劃書連結
                                                    </label>
                                                    <Input
                                                        disabled={!isCurrentStageEditable && !canEditDesignLinks && userRole !== 'admin'}
                                                        value={quotationLink}
                                                        onChange={e => setQuotationLink(e.target.value)}
                                                        placeholder="https://drive.google.com/drive/folders/..."
                                                        className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:opacity-50"
                                                    />
                                                    {project.quotationLink && (
                                                        <a href={project.quotationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline mt-0.5 ml-1 transition-colors">
                                                            <FileText className="w-3 h-3" /> 開啟報價單資料夾 ↗
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="border-t border-slate-100" />

                                                {/* 平面圖連結 */}
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                        平面圖連結
                                                    </label>
                                                    <Input
                                                        disabled={!canEditDesignLinks && userRole !== 'admin'}
                                                        value={floorPlanLink}
                                                        onChange={e => setFloorPlanLink(e.target.value)}
                                                        placeholder="https://drive.google.com/drive/folders/..."
                                                        className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:opacity-50"
                                                    />
                                                    {project.floorPlanLink && (
                                                        <a href={project.floorPlanLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-0.5 ml-1 transition-colors">
                                                            <FileText className="w-3 h-3" /> 開啟平面圖資料夾 ↗
                                                        </a>
                                                    )}
                                                </div>

                                                {/* SketchUp 3D 連結 */}
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-semibold text-slate-500 tracking-wide flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        SketchUp 3D 模型
                                                    </label>
                                                    <Input
                                                        disabled={!canEditDesignLinks && userRole !== 'admin'}
                                                        value={sketchUpLink}
                                                        onChange={e => setSketchUpLink(e.target.value)}
                                                        placeholder="https://drive.google.com/drive/folders/..."
                                                        className="h-10 text-xs bg-slate-100/80 hover:bg-slate-200/50 border-transparent transition-colors rounded-xl px-3 shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:opacity-50"
                                                    />
                                                    {project.sketchUpLink && (
                                                        <a href={project.sketchUpLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline mt-0.5 ml-1 transition-colors">
                                                            <FileText className="w-3 h-3" /> 開啟 3D 模型資料夾 ↗
                                                        </a>
                                                    )}
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
                                        <Button onClick={() => { setForcedFileType(null); fileInputRef.current?.click(); }} disabled={uploading}>
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                            快速上傳
                                        </Button>
                                    )}

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

                        {/* Tab: Photos — Folder-based Photo Management */}
                        <TabsContent value="photos" className="mt-0 outline-none">
                            <Card className="min-h-[500px]">
                                <CardHeader className="flex flex-row items-center justify-between border-b">
                                    <div>
                                        <CardTitle className="text-xl font-bold tracking-tight">現場照片與影片相簿</CardTitle>
                                        <CardDescription>按工程階段分類管理，紀錄施工過程與驗收細節</CardDescription>
                                    </div>
                                    {(isCurrentStageEditable || userRole === 'admin') && (
                                        <div className="flex items-center gap-2">
                                            <Select value={photoFolder} onValueChange={setPhotoFolder}>
                                                <SelectTrigger className="h-9 w-[200px] text-xs bg-slate-50 border-slate-200 rounded-lg shadow-none">
                                                    <span className="truncate font-semibold text-slate-600">
                                                        {photoFolder === 'uncategorized' ? '📁 未分類' : CONSTRUCTION_PHASES.find(p => p.key === photoFolder)?.icon + ' ' + CONSTRUCTION_PHASES.find(p => p.key === photoFolder)?.label || photoFolder}
                                                    </span>
                                                </SelectTrigger>
                                                <SelectContent className="border-slate-100 shadow-xl rounded-xl bg-white/95 backdrop-blur-md p-1">
                                                    {CONSTRUCTION_PHASES.map(phase => (
                                                        <SelectItem key={phase.key} value={phase.key} className="rounded-lg text-xs font-semibold focus:bg-slate-100/80 my-0.5 cursor-pointer py-2">
                                                            <span className="flex items-center gap-2">{phase.icon} {phase.label}</span>
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="uncategorized" className="rounded-lg text-xs font-semibold focus:bg-slate-100/80 my-0.5 cursor-pointer py-2">
                                                        <span className="flex items-center gap-2">📁 未分類</span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button onClick={() => { setForcedFileType('photo'); photoInputRef.current?.click(); }} disabled={uploading} className="h-9 gap-1.5 text-xs font-bold">
                                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} 上傳至此分類
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-6">
                                    {(() => {
                                        const allPhotos = project.files.filter((f: any) => f.type === 'photo');
                                        if (allPhotos.length === 0) {
                                            return (
                                                <div className="py-32 flex flex-col items-center justify-center text-center bg-white border border-[#E8E8ED] shadow-sm rounded-[24px]">
                                                    <div className="w-16 h-16 bg-[#F5F5F7] rounded-[16px] border border-[#D1D1D6] flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform">
                                                        <ImageIcon className="w-8 h-8 text-[#86868B]" />
                                                    </div>
                                                    <h3 className="text-[16px] font-bold text-[#1D1D1F] tracking-wide mb-1.5">相簿是空的</h3>
                                                    <p className="text-[13px] font-semibold text-[#86868B] max-w-[220px] leading-relaxed">
                                                        目前還沒有上傳任何相片。<br/>請選擇分類後點擊上傳按鈕。
                                                    </p>
                                                </div>
                                            );
                                        }

                                        // Build folder groups: 10 phases + uncategorized
                                        const folderGroups = [
                                            ...CONSTRUCTION_PHASES.map(phase => ({
                                                key: phase.key,
                                                label: phase.label,
                                                icon: phase.icon,
                                                photos: allPhotos.filter((p: any) => p.folder === phase.key),
                                            })),
                                            {
                                                key: 'uncategorized',
                                                label: '未分類',
                                                icon: '📁',
                                                photos: allPhotos.filter((p: any) => !p.folder || p.folder === 'uncategorized'),
                                            },
                                        ].filter(g => g.photos.length > 0);

                                        return (
                                            <div className="space-y-4">
                                                {/* Summary bar */}
                                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                                    共 {allPhotos.length} 張照片/影片，分佈於 {folderGroups.length} 個分類
                                                </div>

                                                {folderGroups.map(folder => (
                                                    <div key={folder.key} className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                                                        {/* Folder Header */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedPhases(prev => prev.includes(`photo-${folder.key}`) ? prev.filter(k => k !== `photo-${folder.key}`) : [...prev, `photo-${folder.key}`])}
                                                            className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors border-b border-slate-100 text-left"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="text-[16px]">{folder.icon}</span>
                                                                <span className="text-[13px] font-bold text-slate-800">{folder.label}</span>
                                                                <Badge variant="outline" className="ml-1 bg-white text-slate-500 border-slate-200 text-[10px] font-bold px-1.5">
                                                                    {folder.photos.length}
                                                                </Badge>
                                                            </div>
                                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPhases.includes(`photo-${folder.key}`) ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {/* Folder Photos Grid */}
                                                        {expandedPhases.includes(`photo-${folder.key}`) && (
                                                            <div className="p-4">
                                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                                    {folder.photos
                                                                        .sort((a: any, b: any) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())
                                                                        .map((photo: any) => (
                                                                        <div key={photo.id} className="group relative rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                                                                            <a href={photo.url} target="_blank" rel="noreferrer" className="block w-full aspect-square relative overflow-hidden">
                                                                                {photo.url?.includes('.mp4') || photo.url?.includes('.mov') ? (
                                                                                    <video src={photo.url} className="w-full h-full object-cover" muted />
                                                                                ) : (
                                                                                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                                                )}
                                                                                {/* Delete button */}
                                                                                {(isCurrentStageEditable || userRole === 'admin') && (
                                                                                    <button
                                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteFile(photo.id, photo.name); }}
                                                                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white/80 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                                                                                        title="刪除"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                            </a>
                                                                            {/* Title + Timestamp — always visible */}
                                                                            <div className="px-2.5 py-2 border-t border-slate-100">
                                                                                <p className="text-[11px] font-semibold text-slate-700 line-clamp-1 leading-snug">{photo.name}</p>
                                                                                <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                                    {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        </TabsContent >


                        {/* Tab: Engineering Timeline (Gantt Builder) */}
                        <TabsContent value="timeline" className="mt-0 outline-none">
                            {project && (
                                <div className="space-y-6">
                                    <AdvancedGanttChart projects={[project]} />
                                    <GanttTimelineEditor 
                                        project={project} 
                                        isOpen={true} 
                                        onClose={() => {}} 
                                    onSave={async (newTimeline, overallEndDate, globalStartDate) => {
                                        toast.info('儲存排期中...');
                                        try {
                                            setProject((prev: any) => ({ ...prev, ganttTimeline: newTimeline, startDate: globalStartDate }));
                                            const res = await fetch(`/api/projects/${projectId}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ ganttTimeline: newTimeline, completionDate: overallEndDate, startDate: globalStartDate })
                                            });
                                            if (!res.ok) throw new Error('Failed to save timeline');
                                            await fetchProject();
                                            toast.success('已儲存排期更新');
                                        } catch (error) {
                                            toast.error('儲存排期失敗，請重試');
                                        }
                                    }}
                                />
                                </div>
                            )}
                        </TabsContent>
                    </Tabs >
                </div >
            </motion.div >

            {/* 編輯專案資料 Modal */}
            <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Edit2 className="w-5 h-5 text-blue-500" /> 編輯專案基礎資料
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">客戶名稱</label>
                            <Input
                                type="text"
                                value={editForm.clientName}
                                onChange={e => setEditForm({ ...editForm, clientName: e.target.value })}
                                className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 rounded-xl h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">工程類別</label>
                            <Input
                                type="text"
                                value={editForm.renovationType}
                                onChange={e => setEditForm({ ...editForm, renovationType: e.target.value })}
                                className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 rounded-xl h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">物業層數/類型</label>
                            <Input
                                type="text"
                                value={editForm.propertyType}
                                onChange={e => setEditForm({ ...editForm, propertyType: e.target.value })}
                                className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 rounded-xl h-11"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-600">實用面積 (呎)</label>
                                <Input
                                    type="number"
                                    value={editForm.area || ''}
                                    onChange={e => setEditForm({ ...editForm, area: Number(e.target.value) })}
                                    className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 rounded-xl h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-600">預算金額 (萬 HKD)</label>
                                <Input
                                    type="number"
                                    value={editForm.budget ? editForm.budget / 10000 : ''}
                                    onChange={e => setEditForm({ ...editForm, budget: Number(e.target.value) * 10000 })}
                                    className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 rounded-xl h-11"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-semibold text-slate-600">開工日期</label>
                                <Input
                                    type="date"
                                    value={editForm.startDate}
                                    onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                                    className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500/20 rounded-xl h-11"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditProjectOpen(false)} className="rounded-xl h-10 px-5">取消</Button>
                        <Button onClick={handleSaveEditProject} disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-6 font-semibold shadow-sm">
                            {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 儲存資料
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 新增約見 Dialog (Auto-Save) */}
            <Dialog open={isAddMeetingOpen} onOpenChange={setIsAddMeetingOpen}>
                <DialogContent className="overflow-visible">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Clock className="w-5 h-5 text-amber-500" /> 新增約見記錄
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">約定時間 <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={newMeeting.dateTime ? newMeeting.dateTime.split('T')[0] : ''}
                                    onChange={e => {
                                        const dateStr = e.target.value;
                                        const timeStr = newMeeting.dateTime ? (newMeeting.dateTime.split('T')[1] || '09:00') : '09:00';
                                        setNewMeeting({ ...newMeeting, dateTime: dateStr ? `${dateStr}T${timeStr}` : '' });
                                    }}
                                    className="bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20 rounded-xl h-11 w-full"
                                />
                                <Select
                                    value={newMeeting.dateTime ? (newMeeting.dateTime.split('T')[1] || '09:00') : '09:00'}
                                    onValueChange={(val) => {
                                        const dateStr = newMeeting.dateTime ? (newMeeting.dateTime.split('T')[0] || '') : '';
                                        setNewMeeting({ ...newMeeting, dateTime: dateStr ? `${dateStr}T${val}` : `T${val}` });
                                    }}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 h-11 w-[120px] rounded-xl focus:ring-amber-500/20 outline-none">
                                        <SelectValue placeholder="時間" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">見面地點 (選填)</label>
                            <Select 
                                value={['地盤', '寫字樓', ''].includes(newMeeting.location) ? newMeeting.location : 'other'} 
                                onValueChange={(val) => setNewMeeting({ ...newMeeting, location: val === 'other' ? '咖啡室/其他' : val })}
                            >
                                <SelectTrigger className="bg-slate-50 border-slate-200 h-11 rounded-xl focus:ring-amber-500/20 outline-none">
                                    <SelectValue placeholder="選項 (地盤 / 寫字樓 / 其他)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="地盤">地盤</SelectItem>
                                    <SelectItem value="寫字樓">寫字樓</SelectItem>
                                    <SelectItem value="other">其他 (請註明)</SelectItem>
                                </SelectContent>
                            </Select>
                            {!['地盤', '寫字樓', ''].includes(newMeeting.location) && (
                                <Input
                                    type="text"
                                    placeholder="請輸入地點 (例如：Starbucks, 客戶公司...)"
                                    value={newMeeting.location === '其他' || newMeeting.location === '咖啡室/其他' ? '' : newMeeting.location}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value || '咖啡室/其他' })}
                                    className="bg-slate-50 border-slate-200 focus-visible:ring-amber-500/20 rounded-xl h-11 w-full text-sm mt-2 placeholder:text-slate-400"
                                />
                            )}
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
                            {(project?.ganttTimeline?.length > 0 
                                ? project.ganttTimeline 
                                : CONSTRUCTION_PHASES.map((p, idx) => ({ id: `default-${idx}`, key: p.key, name: p.label, duration: 5, isIncluded: true }))
                            ).filter((p: any) => p.isIncluded).map((phase: any) => {
                                const staticPhaseDef = CONSTRUCTION_PHASES.find(c => c.key === phase.key);
                                const fields = staticPhaseDef ? staticPhaseDef.fields : [];
                                const icon = staticPhaseDef ? staticPhaseDef.icon : '🚧';
                                
                                const phaseData = tempProgressData[phase.key] || {};
                                const doneCount = fields.filter((f: any) => phaseData[f.key] === true).length;
                                const totalCount = fields.length;
                                const allDone = doneCount === totalCount && totalCount > 0;
                                const isExpanded = expandedPhases.includes(phase.id || phase.key);

                                return (
                                    <div key={phase.id || phase.key} className="bg-white transition-colors">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedPhases(prev => prev.includes(phase.id || phase.key) ? prev.filter(k => k !== (phase.id || phase.key)) : [...prev, phase.id || phase.key])}
                                            className={`w-full flex items-center justify-between px-5 transition-all outline-none ${isExpanded ? 'bg-[#F5F5F7] py-4' : 'hover:bg-[#F5F5F7] py-4'}`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <span className="text-base shrink-0 opacity-80">{icon}</span>
                                                <span className={`text-[14px] tracking-wide font-bold truncate ${allDone ? 'text-emerald-600' : 'text-[#1D1D1F]'}`}>{phase.name}</span>
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
                                                {fields.map((field: any) => {
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
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx" onChange={handleFileUpload} />
            <input ref={photoInputRef} type="file" className="hidden" accept="image/*,video/mp4,video/quicktime" onChange={handleFileUpload} />
        </>
    );
}

// Icon helper to avoid redefining component
function CalendarIcon(props: any) {
    return <CalIcon {...props} />;
}
