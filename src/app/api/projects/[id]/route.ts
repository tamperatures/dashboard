import { NextRequest, NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/* ───── Department-based field permissions ───── */
// Sales-owned link fields — only Sales/Marketing & admin can edit
// (Designers must NOT be able to overwrite the quotation link)
const SALES_LINK_FIELDS = ['quotationLink'];

// Design-owned link fields — only Design & admin can edit
// (Sales must NOT be able to overwrite the floor plan / 3D model links)
const DESIGN_LINK_FIELDS = ['floorPlanLink', 'sketchUpLink'];

// Frontend department (前端部門) — handles S01-S05 stage data
// NOTE: link fields are intentionally NOT included here; they are dispatched
// per-department via SALES_LINK_FIELDS / DESIGN_LINK_FIELDS to enforce strict
// document ownership between Sales and Design.
const FRONTEND_FIELDS = [
    'clientName', 'estate', 'address', 'phone', 'propertyType',
    'renovationType', 'budget', 'description',
    'area', 'meetingDateTime', 'meetingLocation', 'meetings', 'googleFormLink',
    'notes', 'familyStructure', 'status', 'contractDate',
    'assignedTo', 'pmResponsible',
    'stage', 'progress', 'startDate', 'endDate',
    'unreadDepartments', 'archived',
];

// Engineering department (工程部) — handles P06-P08 stage data
const ENGINEERING_FIELDS = [
    'designerResponsible', 'demolitionContractor', 'plumbingContractor',
    'masonryContractor', 'furnitureContractor',
    'trades',
    // 10 construction phases
    'phase1SitePrep', 'phase2Demolition', 'phase3Plumbing', 'phase4Masonry',
    'phase5Carpentry', 'phase6Installation', 'phase7PreInspection',
    'phase8OfficialInspection', 'phase9Handover', 'phase10Maintenance',
    'stage', 'progress', 'startDate', 'endDate', 'completionDate', 'ganttTimeline',
    'unreadDepartments', 'archived',
];

// Department name mapping — link fields are layered on top per-department
const DEPT_TO_FIELDS: Record<string, string[]> = {
    '推廣部': [...FRONTEND_FIELDS, ...SALES_LINK_FIELDS],
    '銷售部': [...FRONTEND_FIELDS, ...SALES_LINK_FIELDS],
    '設計部': [...FRONTEND_FIELDS, ...ENGINEERING_FIELDS, ...DESIGN_LINK_FIELDS], // designers can touch both stages but only own design links
    '工程部': ENGINEERING_FIELDS,
    '會計部': ['budget', 'status', 'contractDate'],
    '管理處': [...FRONTEND_FIELDS, ...ENGINEERING_FIELDS, ...SALES_LINK_FIELDS, ...DESIGN_LINK_FIELDS], // full access
};

// All updatable fields (for admin)
const ALL_FIELDS = [
    'clientName', 'estate', 'address', 'phone', 'propertyType',
    'renovationType', 'budget', 'stage', 'progress', 'startDate',
    'endDate', 'assignedTo', 'pmResponsible', 'description',
    'area', 'meetingDateTime', 'meetingLocation', 'meetings', 'googleFormLink',
    'notes', 'floorPlanLink', 'sketchUpLink', 'quotationLink', 'trades',
    'familyStructure', 'status', 'contractDate',
    'designerResponsible', 'demolitionContractor', 'plumbingContractor',
    'masonryContractor', 'furnitureContractor',
    'phase1SitePrep', 'phase2Demolition', 'phase3Plumbing', 'phase4Masonry',
    'phase5Carpentry', 'phase6Installation', 'phase7PreInspection',
    'phase8OfficialInspection', 'phase9Handover', 'phase10Maintenance',
    'ganttTimeline', 'completionDate',
    'unreadDepartments', 'archived',
];

/* ───── Workflow phase enforcement ───── */
// Returns a list of unmet requirement labels if the project is not allowed to
// advance from currentStage → targetStage. Empty array means OK to advance.
function validateStageAdvancement(
    project: any,
    currentStage: string,
    targetStage: string
): string[] {
    const STAGE_ORDER = [
        'S01_客戶查詢', 'S02_見客前準備', 'S03_初步報價', 'S04_見客後跟進',
        'S05_後續會面', 'P06_工程啟動', 'P07_工程進行中', 'P08_工程完成',
    ];
    const cur = STAGE_ORDER.indexOf(currentStage);
    const tgt = STAGE_ORDER.indexOf(targetStage);
    // Allow lateral / backward moves and unknown stages — only enforce forward progression
    if (cur < 0 || tgt < 0 || tgt <= cur) return [];

    const missing: string[] = [];

    // S01 → S02: must have at least one meeting scheduled
    if (currentStage === 'S01_客戶查詢' && tgt > cur) {
        const meetings = project.meetings || [];
        const hasMeeting = meetings.length > 0 || !!project.meetingDateTime;
        if (!hasMeeting) missing.push('需要至少一次約見記錄');
    }
    // S02 → S03: must have floorPlanLink
    if (currentStage === 'S02_見客前準備' && tgt > cur) {
        if (!project.floorPlanLink) missing.push('需要平面圖連結');
    }
    // S03 → S04: must have quotationLink
    if (currentStage === 'S03_初步報價' && tgt > cur) {
        if (!project.quotationLink) missing.push('需要報價單連結');
    }
    // S05 → P06: status must be Signed and contractDate set
    if (currentStage === 'S05_後續會面' && targetStage === 'P06_工程啟動') {
        if (project.status !== 'Signed') missing.push('項目狀態必須為「成功簽單」');
        if (!project.contractDate) missing.push('需要簽約日期');
    }
    // P06 → P07: phase1SitePrep all checkboxes complete
    if (currentStage === 'P06_工程啟動' && targetStage === 'P07_工程進行中') {
        const required = ['adminApplication', 'insurance', 'tempUtilities', 'publicProtection', 'itemProtection'];
        const phase = project.phase1SitePrep || {};
        const labels: Record<string, string> = {
            adminApplication: '入則申請', insurance: '保險', tempUtilities: '臨時水電',
            publicProtection: '公眾保護', itemProtection: '物品保護',
        };
        for (const key of required) {
            if (!phase[key]) missing.push(`P06 工地準備未完成：${labels[key]}`);
        }
    }
    // P07 → P08: phase2-phase7 must all be complete
    if (currentStage === 'P07_工程進行中' && targetStage === 'P08_工程完成') {
        const REQUIRED: Record<string, { fields: string[]; label: string; fieldLabels: Record<string, string> }> = {
            phase2Demolition: { fields: ['survey','execution','noiseControl','wasteDisposal'], label: '清拆', fieldLabels: { survey:'勘查', execution:'清拆執行', noiseControl:'噪音控制', wasteDisposal:'廢物處理' } },
            phase3Plumbing: { fields: ['brickwork','trenching','positioning','gasWork'], label: '水電', fieldLabels: { brickwork:'砌磚', trenching:'開坑', positioning:'定位', gasWork:'煤氣' } },
            phase4Masonry: { fields: ['plastering','waterproofing','tiling','leveling'], label: '泥水', fieldLabels: { plastering:'批盪', waterproofing:'防水', tiling:'鋪磚', leveling:'找平' } },
            phase5Carpentry: { fields: ['ceilingFeature','wallPreparation','woodworkPainting'], label: '木工', fieldLabels: { ceilingFeature:'天花', wallPreparation:'牆身', woodworkPainting:'油漆' } },
            phase6Installation: { fields: ['furnitureAssembly','doorFloor','fixtures'], label: '安裝', fieldLabels: { furnitureAssembly:'傢俬組裝', doorFloor:'門板', fixtures:'潔具' } },
            phase7PreInspection: { fields: ['internalCheck','defectFix','basicCleaning'], label: '預驗收', fieldLabels: { internalCheck:'內檢', defectFix:'修復', basicCleaning:'清潔' } },
        };
        for (const [phaseKey, info] of Object.entries(REQUIRED)) {
            const data = project[phaseKey] || {};
            for (const f of info.fields) {
                if (!data[f]) missing.push(`${info.label}未完成：${info.fieldLabels[f]}`);
            }
        }
    }

    return missing;
}

// GET /api/projects/[id] — single project detail (all users can view)
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const { id } = await params;
    const projectDoc = await firestore.collection('projects').doc(id).get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: '找不到此項目' }, { status: 404 });
    }

    const project = projectDoc.data() as any;
    const userRole = (session.user as any).role;
    const userDepts: string[] = (session.user as any).departments || ((session.user as any).department ? [(session.user as any).department] : []);

    // Determine which fields the user can edit based on role/departments
    let editableFields: string[] = [];
    if (userRole === 'admin') {
        editableFields = ALL_FIELDS;
    } else if (userRole === 'staff') {
        // Merge editable fields from all user departments
        const fieldSet = new Set<string>();
        for (const dept of userDepts) {
            const fields = DEPT_TO_FIELDS[dept] || [];
            fields.forEach(f => fieldSet.add(f));
        }
        editableFields = Array.from(fieldSet);
    }

    return NextResponse.json({ project, editableFields });
}

// PUT /api/projects/[id] — update project (department-based permissions for staff)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const projectRef = firestore.collection('projects').doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: '找不到此項目' }, { status: 404 });
    }

    const project = projectDoc.data() as any;
    const userRole = (session.user as any).role;
    const userDepts: string[] = (session.user as any).departments || ((session.user as any).department ? [(session.user as any).department] : []);

    // Handle Stage Progression Requests (Staff)
    if (body.requestStage) {
        if (userRole !== 'staff') {
            return NextResponse.json({ error: '只有員工可以提交推進請求' }, { status: 403 });
        }
        // Validate workflow phase requirements before accepting the request
        const missing = validateStageAdvancement(project, project.stage, body.requestStage);
        if (missing.length > 0) {
            return NextResponse.json({
                error: '無法推進階段，仍有未完成項目',
                missing,
            }, { status: 400 });
        }
        project.pendingStageRequest = {
            requestedStage: body.requestStage,
            requestedBy: (session.user as any).name || 'Unknown',
            createdAt: new Date().toISOString(),
        };
        project.updatedAt = new Date().toISOString();
        await projectRef.set(project);
        return NextResponse.json({ project });
    }

    // Handle Admin Resolving Stage Requests (Admin)
    if (body.resolveStageRequest) {
        if (userRole !== 'admin') {
            return NextResponse.json({ error: '只有管理員可以審核請求' }, { status: 403 });
        }
        if (body.resolveStageRequest === 'approve' && project.pendingStageRequest) {
            project.stage = project.pendingStageRequest.requestedStage;
            if (!project.stageLogs) project.stageLogs = [];
            project.stageLogs.push({
                id: uuidv4(),
                stage: project.stage,
                userId: (session.user as any).id,
                userName: (session.user as any).name || 'Admin',
                description: `批准了推進至 ${project.stage.replace('_', ' ')} 的請求`,
                timestamp: new Date().toISOString(),
            });
            // Auto-archive when project reaches P08
            if (project.stage === 'P08_工程完成' && !project.archived) {
                project.archived = true;
                project.stageLogs.push({
                    id: uuidv4(),
                    stage: project.stage,
                    userId: 'system',
                    userName: '系統自動',
                    description: '工程完成，項目已自動歸檔',
                    timestamp: new Date().toISOString(),
                });
            }
        } else if (body.resolveStageRequest === 'deny' && project.pendingStageRequest) {
            if (!project.stageLogs) project.stageLogs = [];
            project.stageLogs.push({
                id: uuidv4(),
                stage: project.stage || 'S01_客戶查詢',
                userId: (session.user as any).id,
                userName: (session.user as any).name || 'Admin',
                description: `拒絕了推進至 ${project.pendingStageRequest.requestedStage.replace('_', ' ')} 的請求`,
                timestamp: new Date().toISOString(),
            });
        }
        delete project.pendingStageRequest;
        project.updatedAt = new Date().toISOString();
        await projectRef.set(project);
        return NextResponse.json({ project });
    }

    // Handle Structured Remarks add/delete (#6)
    // - addRemark: any user with edit permission on `notes` may add a remark
    // - deleteRemark: only admin or the authoring department may delete
    if (body.addRemark) {
        const allowed = userRole === 'admin' || userDepts.length > 0;
        if (!allowed) {
            return NextResponse.json({ error: '無權限新增備註' }, { status: 403 });
        }
        const remark = {
            id: uuidv4(),
            content: String(body.addRemark.content || '').trim(),
            authorId: (session.user as any).id,
            authorName: (session.user as any).name || 'Unknown',
            authorDept: userDepts[0] || (userRole === 'admin' ? '管理處' : ''),
            createdAt: new Date().toISOString(),
        };
        if (!remark.content) {
            return NextResponse.json({ error: '備註內容不能為空' }, { status: 400 });
        }
        if (!Array.isArray(project.remarks)) project.remarks = [];
        project.remarks.push(remark);
        project.updatedAt = new Date().toISOString();
        await projectRef.set(project);
        return NextResponse.json({ project });
    }

    if (body.deleteRemarkId) {
        const target = (project.remarks || []).find((r: any) => r.id === body.deleteRemarkId);
        if (!target) {
            return NextResponse.json({ error: '找不到該備註' }, { status: 404 });
        }
        const isAuthorDept = !!target.authorDept && userDepts.includes(target.authorDept);
        if (userRole !== 'admin' && !isAuthorDept) {
            return NextResponse.json({
                error: `只有管理員或「${target.authorDept || '原作者部門'}」可以刪除此備註`,
            }, { status: 403 });
        }
        project.remarks = (project.remarks || []).filter((r: any) => r.id !== body.deleteRemarkId);
        project.updatedAt = new Date().toISOString();
        await projectRef.set(project);
        return NextResponse.json({ project });
    }

    // Determine allowed fields based on role/departments
    let allowedFields: string[];
    if (userRole === 'admin') {
        allowedFields = ALL_FIELDS;
    } else {
        const fieldSet = new Set<string>();
        for (const dept of userDepts) {
            const fields = DEPT_TO_FIELDS[dept] || [];
            fields.forEach(f => fieldSet.add(f));
        }
        allowedFields = Array.from(fieldSet);
        if (allowedFields.length === 0) {
            return NextResponse.json({ error: '您的部門沒有編輯權限' }, { status: 403 });
        }
    }

    // Server-side workflow phase enforcement: if the body is changing `stage`
    // forward, validate that all required fields/checkboxes are complete.
    // We merge body fields into a snapshot so simultaneous updates (e.g. status
    // = 'Signed' + stage = 'P06') are validated against the intended final state.
    if (typeof body.stage === 'string' && body.stage !== project.stage) {
        const mergedSnapshot = { ...project };
        for (const [k, v] of Object.entries(body)) {
            if (k !== 'stage') (mergedSnapshot as any)[k] = v;
        }
        const missing = validateStageAdvancement(mergedSnapshot, project.stage, body.stage);
        if (missing.length > 0) {
            return NextResponse.json({
                error: '無法推進階段，仍有未完成項目',
                missing,
            }, { status: 400 });
        }
    }

    // ── Auto-logging: detect what changed ──
    const oldProject = projectDoc.data() as any;
    const changedDescriptions: string[] = [];
    const FIELD_LABELS: Record<string, string> = {
        clientName: '客戶名稱', estate: '屋苑', address: '地址', phone: '電話',
        propertyType: '物業類型', renovationType: '裝修類型', budget: '預算',
        stage: '階段', progress: '進度', startDate: '開始日期', endDate: '結束日期',
        assignedTo: '指派人員', pmResponsible: '項目經理', description: '描述',
        area: '面積', meetingDateTime: '約見時間', meetingLocation: '約見地點',
        meetings: '約見記錄', googleFormLink: 'Google表單', notes: '附加備註',
        floorPlanLink: '平面圖連結', sketchUpLink: 'SketchUp連結',
        quotationLink: '報價單連結', trades: '工種',
        familyStructure: '家庭結構', status: '狀態', contractDate: '合約日期',
        designerResponsible: '設計師', demolitionContractor: '拆除承辦商',
        plumbingContractor: '水喉承辦商', masonryContractor: '泥水承辦商',
        furnitureContractor: '傢俬承辦商', archived: '歸檔狀態',
    };

    // Update only allowed fields & track changes
    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            const oldVal = oldProject[field];
            const newVal = body[field];
            // Detect actual change
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            if (changed) {
                const label = FIELD_LABELS[field] || field;
                if (field === 'stage') {
                    changedDescriptions.push(`階段更新至 ${String(newVal).replace('_', ' ')}`);
                } else if (field === 'meetings') {
                    changedDescriptions.push(`更新了約見記錄`);
                } else if (field === 'notes') {
                    changedDescriptions.push(`更新了附加備註`);
                } else if (field.startsWith('phase')) {
                    changedDescriptions.push(`更新了工程進度`);
                } else {
                    changedDescriptions.push(`更新了${label}`);
                }
            }
            (project as any)[field] = newVal;
        }
    }

    // Create log entries if anything changed
    if (changedDescriptions.length > 0) {
        if (!project.stageLogs) project.stageLogs = [];
        const currentStage = project.stage || oldProject.stage || 'S01_客戶查詢';
        project.stageLogs.push({
            id: uuidv4(),
            stage: currentStage,
            userId: (session.user as any).id,
            userName: (session.user as any).name || 'Unknown',
            description: changedDescriptions.join('、'),
            timestamp: new Date().toISOString(),
        });
    }

    // Auto-archive when project reaches P08_工程完成
    if (project.stage === 'P08_工程完成' && !project.archived && oldProject.stage !== 'P08_工程完成') {
        project.archived = true;
        if (!project.stageLogs) project.stageLogs = [];
        project.stageLogs.push({
            id: uuidv4(),
            stage: project.stage,
            userId: 'system',
            userName: '系統自動',
            description: '工程完成，項目已自動歸檔',
            timestamp: new Date().toISOString(),
        });
    }

    // Handle file additions (all staff can upload files)
    if (body.newFile) {
        if (!project.files) project.files = [];
        project.files.push({
            id: uuidv4(),
            name: body.newFile.name,
            url: body.newFile.url,
            type: body.newFile.type || 'other',
            folder: body.newFile.folder || '',
            uploadedBy: (session.user as any).id,
            uploadedAt: new Date().toISOString(),
            size: body.newFile.size || 0,
        });
        // Log file upload
        if (!project.stageLogs) project.stageLogs = [];
        project.stageLogs.push({
            id: uuidv4(),
            stage: project.stage || 'S01_客戶查詢',
            userId: (session.user as any).id,
            userName: (session.user as any).name || 'Unknown',
            description: `上傳了檔案「${body.newFile.name}」`,
            timestamp: new Date().toISOString(),
        });
    }

    // Handle file deletion (admin only or file uploader)
    if (body.deleteFileId) {
        const deletedFile = project.files?.find((f: any) => f.id === body.deleteFileId);
        if (userRole === 'admin') {
            project.files = project.files.filter((f: any) => f.id !== body.deleteFileId);
        } else {
            project.files = project.files.filter((f: any) =>
                f.id !== body.deleteFileId || f.uploadedBy !== (session.user as any).id
            );
        }
        if (deletedFile) {
            if (!project.stageLogs) project.stageLogs = [];
            project.stageLogs.push({
                id: uuidv4(),
                stage: project.stage || 'S01_客戶查詢',
                userId: (session.user as any).id,
                userName: (session.user as any).name || 'Unknown',
                description: `刪除了檔案「${deletedFile.name}」`,
                timestamp: new Date().toISOString(),
            });
        }
    }

    // Handle log deletion (admin only)
    if (body.deleteLogId && userRole === 'admin') {
        if (project.stageLogs) {
            project.stageLogs = project.stageLogs.filter((l: any) => l.id !== body.deleteLogId);
        }
    }

    project.updatedAt = new Date().toISOString();
    await projectRef.set(project);

    return NextResponse.json({ project });
}

// DELETE /api/projects/[id] — delete project (Admin only)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const { id } = await params;
    const projectRef = firestore.collection('projects').doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
        return NextResponse.json({ error: '找不到此項目' }, { status: 404 });
    }

    await projectRef.delete();

    return NextResponse.json({ success: true });
}
