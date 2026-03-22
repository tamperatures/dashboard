import { NextRequest, NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/* ───── Department-based field permissions ───── */
// Frontend department (前端部門) — handles S01-S05 stage data
const FRONTEND_FIELDS = [
    'clientName', 'estate', 'address', 'phone', 'propertyType',
    'renovationType', 'budget', 'description',
    'area', 'meetingDateTime', 'meetingLocation', 'meetings', 'googleFormLink',
    'notes', 'familyStructure', 'status', 'contractDate',
    'assignedTo', 'pmResponsible',
    'floorPlanLink', 'sketchUpLink',
    'stage', 'progress', 'startDate', 'endDate',
];

// Engineering department (工程部) — handles S06-S08 stage data
const ENGINEERING_FIELDS = [
    'designerResponsible', 'demolitionContractor', 'plumbingContractor',
    'masonryContractor', 'furnitureContractor',
    'trades',
    // 10 construction phases
    'phase1SitePrep', 'phase2Demolition', 'phase3Plumbing', 'phase4Masonry',
    'phase5Carpentry', 'phase6Installation', 'phase7PreInspection',
    'phase8OfficialInspection', 'phase9Handover', 'phase10Maintenance',
    'stage', 'progress', 'startDate', 'endDate',
];

// Department name mapping
const DEPT_TO_FIELDS: Record<string, string[]> = {
    '推廣部': FRONTEND_FIELDS,
    '銷售部': FRONTEND_FIELDS,
    '設計部': [...FRONTEND_FIELDS, ...ENGINEERING_FIELDS], // designers can touch both
    '工程部': ENGINEERING_FIELDS,
    '會計部': ['budget', 'status', 'contractDate'],
    '管理處': [...FRONTEND_FIELDS, ...ENGINEERING_FIELDS], // full access
};

// All updatable fields (for admin)
const ALL_FIELDS = [
    'clientName', 'estate', 'address', 'phone', 'propertyType',
    'renovationType', 'budget', 'stage', 'progress', 'startDate',
    'endDate', 'assignedTo', 'pmResponsible', 'description',
    'area', 'meetingDateTime', 'meetingLocation', 'meetings', 'googleFormLink',
    'notes', 'floorPlanLink', 'sketchUpLink', 'trades',
    'familyStructure', 'status', 'contractDate',
    'designerResponsible', 'demolitionContractor', 'plumbingContractor',
    'masonryContractor', 'furnitureContractor',
    'phase1SitePrep', 'phase2Demolition', 'phase3Plumbing', 'phase4Masonry',
    'phase5Carpentry', 'phase6Installation', 'phase7PreInspection',
    'phase8OfficialInspection', 'phase9Handover', 'phase10Maintenance',
];

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
        floorPlanLink: '平面圖連結', sketchUpLink: 'SketchUp連結', trades: '工種',
        familyStructure: '家庭結構', status: '狀態', contractDate: '合約日期',
        designerResponsible: '設計師', demolitionContractor: '拆除承辦商',
        plumbingContractor: '水喉承辦商', masonryContractor: '泥水承辦商',
        furnitureContractor: '傢俬承辦商',
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

    // Handle file additions (all staff can upload files)
    if (body.newFile) {
        if (!project.files) project.files = [];
        project.files.push({
            id: uuidv4(),
            name: body.newFile.name,
            url: body.newFile.url,
            type: body.newFile.type || 'other',
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
