// ==========================================
// 適度裝修設計工程管理 — Type Definitions
// ==========================================

export interface SalesFollowUp {
    quoteSent?: boolean;
    quoteCheck?: boolean;
    refineQuote?: boolean;
    budgetOption?: boolean;
}

export interface GanttPhase {
    id: string; // unique ID
    key: string; // references standard keys like 'phase2Demolition' or custom generated keys
    name: string; // e.g. "打拆工程"
    duration: number; // working days
    isIncluded: boolean;
    manualStartDate?: string; // override start date
    calculatedStartDate?: string; // auto calculated start date
    calculatedEndDate?: string; // auto calculated end date
}

export interface Master {
    id: string;
    name: string;
    skills: string[]; // 專業工種, e.g. ["泥水", "水電"]
    phone?: string;
    createdAt: string;
}

export interface BasePhase {
    startDate?: string;
    completionDate?: string;
    [key: string]: boolean | string | undefined;
}

export interface Phase1SitePrep extends BasePhase {
    adminApplication?: boolean;
    insurance?: boolean;
    tempUtilities?: boolean;
    publicProtection?: boolean;
    itemProtection?: boolean;
}

export interface Phase2Demolition extends BasePhase {
    survey?: boolean;
    execution?: boolean;
    noiseControl?: boolean;
    wasteDisposal?: boolean;
}

export interface Phase3Plumbing extends BasePhase {
    brickwork?: boolean;
    trenching?: boolean;
    positioning?: boolean;
    gasWork?: boolean;
}

export interface Phase4Masonry extends BasePhase {
    plastering?: boolean;
    waterproofing?: boolean;
    tiling?: boolean;
    leveling?: boolean;
}

export interface Phase5Carpentry extends BasePhase {
    ceilingFeature?: boolean;
    wallPreparation?: boolean;
    woodworkPainting?: boolean;
}

export interface Phase6Installation extends BasePhase {
    furnitureAssembly?: boolean;
    doorFloor?: boolean;
    fixtures?: boolean;
}

export interface Phase7PreInspection extends BasePhase {
    internalCheck?: boolean;
    defectFix?: boolean;
    basicCleaning?: boolean;
}

export interface Phase8OfficialInspection extends BasePhase {
    jointInspection?: boolean;
    defectList?: boolean;
    rectification?: boolean;
}

export interface Phase9Handover extends BasePhase {
    finalSettlement?: boolean;
    docHandover?: boolean;
}

export interface Phase10Maintenance extends BasePhase {
    warrantyPeriod?: boolean;
    maintenanceRecord?: boolean;
}

export interface Appointment {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    salesFollowUp?: SalesFollowUp;
}

export interface ProjectMedia {
    id: string;
    url: string;
    type: 'image' | 'video' | 'pdf';
    phase: string;
    fileName?: string;
    uploadDate: string;
}

export interface Customer {
    id: string;
    name: string;
    siteAddress: string;
    startDate: string;
    firstAppointmentDate: string;
    firstAppointmentTime: string;
    firstAppointmentLocation?: string;
    budget: number;
    joinedDate: string;
    areaSize: number;
    propertyType: '私樓' | '公屋' | '居屋' | '村屋' | '獨立屋';
    renovationType: '全屋裝修' | '局部裝修' | '廚廁翻新' | '訂造傢俬';
    familyComposition: string;
    status: 'inquiry' | 'sales' | 'execution';
    progress?: '進行中' | '成功簽單' | '未能成交' | '前期準備' | '打拆工程' | '水電工程' | '鋁窗工程' | '泥水工程' | '油漆工程' | '木工工程' | '完工交付';
    lostReason?: string;
    contractDate?: string;
    completionDate?: string;
    pmResponsible?: string;
    designerResponsible?: string;
    demolitionResponsible?: string;
    plumbingResponsible?: string;
    masonryResponsible?: string;
    furnitureResponsible?: string;
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
    ganttTimeline?: GanttPhase[];
    responsiblePerson?: string;
    salesFollowUp?: SalesFollowUp;
    images?: string[];
    projectMedia?: ProjectMedia[];
    appointments: Appointment[];
}

// Media Library types for R2
export interface MediaItem {
    key: string;
    url: string;
    fileName: string;
    size: number;
    contentType: string;
    uploadedAt: string;
    projectId?: string;
    phase?: string;
}
