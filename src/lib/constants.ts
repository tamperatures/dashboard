export const CONSTRUCTION_PHASES = [
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

export const PHASE_COLORS: Record<string, string> = {
  'phase1SitePrep': 'bg-slate-500',
  'phase2Demolition': 'bg-red-600',
  'phase3Plumbing': 'bg-blue-500',
  'phase4Masonry': 'bg-orange-600',
  'phase5Carpentry': 'bg-emerald-500',
  'phase6Installation': 'bg-cyan-500',
  'phase7PreInspection': 'bg-violet-500',
  'phase8OfficialInspection': 'bg-fuchsia-500',
  'phase9Handover': 'bg-amber-500',
  'phase10Maintenance': 'bg-rose-500',
};
