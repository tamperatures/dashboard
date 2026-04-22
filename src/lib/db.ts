
import type {
    Phase1SitePrep, Phase2Demolition, Phase3Plumbing, Phase4Masonry,
    Phase5Carpentry, Phase6Installation, Phase7PreInspection,
    Phase8OfficialInspection, Phase9Handover, Phase10Maintenance
} from '@/types';

/* ───────── Types ───────── */
export interface User {
    id: string;
    name: string;
    email: string;
    password: string; // hashed
    role: 'admin' | 'staff';
    department?: string;
    phone?: string;
    position?: string;
    status: 'active' | 'inactive';
    mustChangePassword?: boolean;
    createdAt: string;
}

export type ProjectStage =
    | 'S01_客戶查詢'
    | 'S02_見客前準備'
    | 'S03_初步報價'
    | 'S04_見客後跟進'
    | 'S05_後續會面'
    | 'P06_工程啟動'
    | 'P07_工程進行中'
    | 'P08_工程完成';

export const ALL_STAGES: { key: ProjectStage; label: string; dept: string }[] = [
    { key: 'S01_客戶查詢', label: 'S01 客戶查詢', dept: '推廣部' },
    { key: 'S02_見客前準備', label: 'S02 見客前準備', dept: '設計部' },
    { key: 'S03_初步報價', label: 'S03 初步報價', dept: '銷售部' },
    { key: 'S04_見客後跟進', label: 'S04 見客後跟進', dept: '設計部' },
    { key: 'S05_後續會面', label: 'S05 後續會面', dept: '銷售部' },
    { key: 'P06_工程啟動', label: 'P06 簽單/工程啟動', dept: '工程部' },
    { key: 'P07_工程進行中', label: 'P07 工程進行中', dept: '工程部' },
    { key: 'P08_工程完成', label: 'P08 工程完成', dept: '—' },
];

export interface Project {
    id: string;
    projectCode: string;
    clientName: string;
    estate: string;
    address: string;
    phone?: string;
    propertyType: string;
    renovationType: string;
    budget: number;
    stage: ProjectStage;
    progress: number;
    startDate: string;
    endDate: string;
    familyStructure?: string;       // added
    status?: 'In Progress' | 'Signed' | 'Lost'; // added status tracking independent of project workflow stage
    contractDate?: string;          // added
    area?: string;           // 面積尺寸
    meetingDateTime?: string; // 約見時間 (first meeting, backward compat)
    meetingLocation?: string; // 約見地點 (first meeting, backward compat)
    meetings?: { dateTime: string; location: string }[]; // 多次約見
    googleFormLink?: string;  // Google Form 連結
    assignedTo: string[];  // user IDs
    pmResponsible?: string;
    designerResponsible?: string;  // Designer 負責同事
    demolitionContractor?: string; // 打拆
    plumbingContractor?: string;   // 水電
    masonryContractor?: string;    // 泥水
    furnitureContractor?: string;  // 傢俬
    description?: string;
    notes?: string;           // others / 備註
    // S02/S04 fields
    floorPlanLink?: string;   // 平面圖 Google 連結
    sketchUpLink?: string;    // SketchUp Google 連結
    // S06/S07 construction sub-trades
    trades?: {
        name: string;
        status: 'pending' | 'in_progress' | 'completed';
    }[];
    // 工程進度 — 10 construction phases
    phase1SitePrep?: Phase1SitePrep;
    phase2Demolition?: Phase2Demolition;
    phase3Plumbing?: Phase3Plumbing;
    phase4Masonry?: Phase4Masonry;
    phase5Carpentry?: Phase5Carpentry;
    phase6Installation?: Phase6Installation;
    phase7PreInspection?: Phase7PreInspection;
    phase8OfficialInspection?: Phase8OfficialInspection;
    phase9Handover?: Phase9Handover;
    phase10Maintenance?: Phase10Maintenance;
    files: ProjectFile[];
    createdAt: string;
    updatedAt: string;
}

export interface ProjectFile {
    id: string;
    name: string;
    url: string;
    type: 'quotation' | 'drawing' | 'contract' | 'photo' | 'other';
    uploadedBy: string;
    uploadedAt: string;
    size: number;
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    type: 'milestone' | 'task';
    date: string;
    assigneeId?: string;
    status: 'pending' | 'completed';
    createdAt: string;
}

export interface DB {
    users: User[];
    projects: Project[];
    tasks: Task[];
}



/* ───────── Helpers ───────── */
export async function generateProjectCode(firestore: FirebaseFirestore.Firestore): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `${year}-${mm}${dd}`;

    // Find existing projects with the same date prefix to determine next sequence
    const snapshot = await firestore.collection('projects')
        .where('projectCode', '>=', prefix)
        .where('projectCode', '<', prefix + '\uf8ff')
        .get();

    const seq = String(snapshot.size + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
}
